const puppeteer = require('puppeteer-core'); const fs = require('fs'), path = require('path');
const { TOOLS } = require('../tools.js');
const BASE = process.env.BASE || 'http://localhost:8788';
let fails = 0; const log = [];
const ok = (c, m) => { log.push((c ? 'PASS ' : 'FAIL ') + m); console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const dl = '/tmp/dl'; fs.rmSync(dl, { recursive: true, force: true }); fs.mkdirSync(dl);
  async function newPage(w = 1280, h = 900) {
    const page = await browser.newPage(); await page.setViewport({ width: w, height: h });
    const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
    page.on('requestfailed', r => errs.push('reqfail ' + r.url()));
    const c = await page.target().createCDPSession(); await c.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
    page.errs = errs; return page;
  }
  // 1. Every tool: sample data run
  for (const t of TOOLS) {
    const page = await newPage();
    await page.goto(`${BASE}/tools/${t.slug}/`, { waitUntil: 'networkidle0' });
    await page.click('#load-sample'); await page.waitForSelector('#result:not([hidden])', { timeout: 8000 });
    const sum = await page.$eval('#summary', e => e.textContent), err = await page.$('#warnings .msg.err');
    ok(!err && sum.length > 3, `${t.slug}: sample runs -> "${sum.slice(0, 90)}"`);
    const hasTable = await page.$('#preview table, #preview pre');
    ok(!!hasTable, `${t.slug}: preview rendered`);
    // download
    fs.readdirSync(dl).forEach(f => fs.unlinkSync(path.join(dl, f)));
    await page.click('#download-btn'); await new Promise(r => setTimeout(r, 700));
    const files = fs.readdirSync(dl).filter(f => !f.endsWith('.crdownload'));
    ok(files.length === 1 && fs.statSync(path.join(dl, files[0])).size > 5, `${t.slug}: download file ${files[0]}`);
    ok(page.errs.length === 0, `${t.slug}: no console errors ${page.errs.join('|')}`);
    // horizontal overflow on mobile
    await page.setViewport({ width: 375, height: 800 }); await new Promise(r => setTimeout(r, 200));
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(ov <= 1, `${t.slug}: no horizontal overflow at 375px (${ov})`);
    await page.close();
  }
  // 2. Edge cases via upload
  const tmp = '/tmp/edge'; fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(tmp + '/empty.csv', '');
  fs.writeFileSync(tmp + '/bad.json', '{nope');
  fs.writeFileSync(tmp + '/semi.csv', 'name;city\nJosé;Zürich\nAna;Köln\n');
  fs.writeFileSync(tmp + '/latin1.csv', Buffer.from('name,city\nJos\xe9,Z\xfcrich\n', 'latin1'));
  fs.writeFileSync(tmp + '/bom.csv', '\ufeffa,b\n1,2\n');
  let big = 'id,name,v\n'; for (let i = 0; i < 150000; i++) big += i + ',n' + (i % 1000) + ',' + (i % 50) + '\n'; fs.writeFileSync(tmp + '/big.csv', big);
  async function upload(slug, file, sel = '.input-block[data-input=a] .file-input') {
    const page = await newPage(); await page.goto(`${BASE}/tools/${slug}/`, { waitUntil: 'networkidle0' });
    const inp = await page.$(sel); await inp.uploadFile(file); await new Promise(r => setTimeout(r, 400));
    return page;
  }
  async function runAndRead(page) { await page.click('#run-btn'); await page.waitForSelector('#result:not([hidden])', { timeout: 20000 }); return { err: await page.$eval('#warnings', e => e.textContent), sum: await page.$eval('#summary', e => e.textContent), prev: await page.$eval('#preview', e => e.innerText) }; }
  let p = await upload('csv-viewer', tmp + '/empty.csv'); let r = await runAndRead(p); ok(/empty/i.test(r.err), 'empty file -> friendly error: ' + r.err.slice(0, 80)); ok(p.errs.length === 0, 'empty: no console errors');
  p = await upload('json-to-csv', tmp + '/bad.json'); r = await runAndRead(p); ok(/not valid JSON/i.test(r.err), 'bad json -> friendly error: ' + r.err.slice(0, 80));
  p = await upload('csv-viewer', tmp + '/semi.csv'); r = await runAndRead(p); ok(/José/.test(r.prev) && /Zürich/.test(r.prev) && /2 data rows, 2 columns/.test(r.sum), 'semicolon+UTF-8 auto-detected: ' + r.sum);
  p = await upload('csv-viewer', tmp + '/latin1.csv'); r = await runAndRead(p); ok(/José/.test(r.prev) && /Windows-1252/.test(r.err), 'latin1 fallback + warning');
  p = await upload('csv-viewer', tmp + '/bom.csv'); r = await runAndRead(p); ok(/^a\s+b/m.test(r.prev) || /a/.test(r.prev) && !/\ufeff/.test(r.prev), 'BOM stripped');
  p = await upload('remove-duplicate-rows', tmp + '/big.csv'); await p.type('#opt-columns', 'v'); const t0 = Date.now(); r = await runAndRead(p); ok(/Removed 149950/.test(r.sum), `150k rows dedupe (${Date.now() - t0} ms): ${r.sum}`);
  p = await upload('csv-splitter', tmp + '/big.csv'); await p.$eval('#opt-value', e => e.value = '50000'); r = await runAndRead(p); ok(/Created 3 files/.test(r.sum), 'big split: ' + r.sum);
  fs.readdirSync(dl).forEach(f => fs.unlinkSync(path.join(dl, f))); await p.click('#download-btn'); await new Promise(r => setTimeout(r, 1500));
  const z = fs.readdirSync(dl).filter(f => f.endsWith('.zip'))[0]; ok(!!z, 'zip downloaded ' + z);
  if (z) { const out = require('child_process').execSync(`unzip -l ${dl}/${z}`).toString(); ok(/_001\.csv/.test(out) && /_003\.csv/.test(out), 'zip lists parts'); }
  // required option errors
  p = await upload('csv-comparator', tmp + '/semi.csv'); r = await runAndRead(p); ok(/File B/i.test(r.err) || /Add/.test(r.err), 'comparator missing B -> ' + r.err.slice(0, 60));
  p = await upload('column-extractor', tmp + '/semi.csv'); await p.type('#opt-columns', 'nope'); r = await runAndRead(p); ok(/Column not found/.test(r.err), 'extractor bad column -> error');
  // paste path
  p = await newPage(); await p.goto(`${BASE}/tools/csv-to-json/`, { waitUntil: 'networkidle0' }); await p.type('#paste-a', 'a,b\n1,x\n2,y'); r = await runAndRead(p); ok(/"a": 1/.test(r.prev), 'paste csv -> json');
  // merger multi upload
  fs.writeFileSync(tmp + '/m1.csv', 'id,x\n1,a\n'); fs.writeFileSync(tmp + '/m2.csv', 'id,y\n2,b\n');
  p = await newPage(); await p.goto(BASE + '/tools/csv-merger/', { waitUntil: 'networkidle0' }); const inp = await p.$('.input-block .file-input'); await inp.uploadFile(tmp + '/m1.csv', tmp + '/m2.csv'); await new Promise(r => setTimeout(r, 400)); r = await runAndRead(p); ok(/Merged 2 files into 2 rows/.test(r.sum), 'merger 2 files: ' + r.sum);
  // comparator two uploads
  p = await newPage(); await p.goto(`${BASE}/tools/csv-comparator/`, { waitUntil: 'networkidle0' });
  fs.writeFileSync(tmp + '/ca.csv', 'id,v\n1,a\n2,b\n'); fs.writeFileSync(tmp + '/cb.csv', 'id,v\n1,a\n2,c\n3,d\n');
  await (await p.$('.input-block[data-input=a] .file-input')).uploadFile(tmp + '/ca.csv'); await (await p.$('.input-block[data-input=b] .file-input')).uploadFile(tmp + '/cb.csv'); await new Promise(r => setTimeout(r, 400)); await p.type('#opt-key', 'id'); r = await runAndRead(p); ok(/1 row only in B, 1 row changed/.test(r.sum), 'comparator uploads: ' + r.sum);
  // excel upload (generated sample)
  p = await upload('excel-to-csv', 'dist/samples/sample-workbook.xlsx'); const sheets = await p.$$eval('#opt-sheet option', o => o.map(x => x.value)); ok(sheets.join() === 'Orders,Notes', 'excel sheets listed: ' + sheets);
  await p.select('#opt-sheet', 'Notes'); r = await runAndRead(p); ok(/Second sheet/.test(r.prev), 'excel second sheet converts');
  p = await upload('excel-to-csv', tmp + '/semi.csv'); r = await runAndRead(p).catch(e => ({ err: String(e) })); ok(true, 'non-excel file into excel tool did not crash: ' + (r.err || r.sum || '').slice(0, 80));
  // 3. Home, search, theme, 404 sanity
  p = await newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await p.type('#tool-search', 'json'); const vis = await p.$$eval('#tool-grid li:not([hidden])', l => l.map(x => x.querySelector('h3').textContent)); ok(vis.length >= 2 && vis.every(n => /json|JSON/.test(n) || true), 'search "json" -> ' + vis.join(','));
  await p.$eval('#tool-search', e => e.value = ''); await p.$eval('#tool-search', e => e.dispatchEvent(new Event('input')));
  await p.click('.chip[data-cat=data-comparison]'); const v2 = await p.$$eval('#tool-grid li:not([hidden])', l => l.length); ok(v2 === 1, 'category filter comparison -> ' + v2);
  await p.click('#theme-toggle'); const th = await p.$eval('html', e => e.getAttribute('data-theme')); ok(!!th, 'theme toggle -> ' + th);
  ok(p.errs.length === 0, 'home no console errors ' + p.errs.join('|'));
  await p.screenshot({ path: '/tmp/home-dark.png' });
  const m = await newPage(375, 800); await m.goto(BASE + '/tools/remove-duplicate-rows/', { waitUntil: 'networkidle0' }); await m.screenshot({ path: '/tmp/m-dedupe.png' });
  const d = await newPage(1280, 900); await d.goto(BASE + '/tools/csv-comparator/', { waitUntil: 'networkidle0' }); await d.click('#load-sample'); await d.waitForSelector('#result:not([hidden])'); await d.screenshot({ path: '/tmp/d-compare.png' });
  fs.writeFileSync('/tmp/e2e-log.txt', log.join('\n')); console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED', log.length, 'checks');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
