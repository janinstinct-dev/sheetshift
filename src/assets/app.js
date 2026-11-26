/* SheetShift UI. All processing happens locally in the browser. */
(function () {
  'use strict';
  var C = window.SSCore, R = window.SSRun;

  /* ---------- Theme ---------- */
  var tgl = document.getElementById('theme-toggle');
  if (tgl) tgl.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    if (!cur) cur = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ss-theme', next); } catch (e) {}
  });

  /* ---------- Analytics (only when configured and accepted) ---------- */
  function track(name, params) { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); }
  (function initGA() {
    if (!window.SS_GA) return;
    var choice = null; try { choice = localStorage.getItem('ss-consent'); } catch (e) {}
    function load() {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', window.SS_GA, { anonymize_ip: true });
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(window.SS_GA); document.head.appendChild(s);
    }
    if (choice === 'yes') return load();
    if (choice === 'no') return;
    var b = document.createElement('div'); b.className = 'consent'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Analytics consent');
    b.innerHTML = '<p style="margin:0 0 10px">May we use Google Analytics to count visits and tool usage (never your file contents)? <a href="/privacy/">Privacy Policy</a></p><button class="btn btn-primary" type="button" data-c="yes">Accept</button> <button class="btn btn-secondary" type="button" data-c="no">Decline</button>';
    b.addEventListener('click', function (e) { var c = e.target.getAttribute && e.target.getAttribute('data-c'); if (!c) return; try { localStorage.setItem('ss-consent', c); } catch (x) {} b.remove(); if (c === 'yes') load(); });
    document.body.appendChild(b);
  })();

  /* ---------- Home: search and filter ---------- */
  var grid = document.getElementById('tool-grid');
  if (grid) {
    var search = document.getElementById('tool-search'), chips = document.querySelectorAll('.chip'), activeCat = 'all';
    var cards = Array.prototype.slice.call(grid.children), count = document.getElementById('tool-count'), none = document.getElementById('no-results');
    var apply = function () {
      var q = (search.value || '').toLowerCase().trim(), n = 0;
      cards.forEach(function (c) {
        var okCat = activeCat === 'all' || c.getAttribute('data-cat').split(' ').indexOf(activeCat) >= 0;
        var okQ = !q || q.split(/\s+/).every(function (w) { return c.getAttribute('data-name').indexOf(w) >= 0 || c.getAttribute('data-keywords').indexOf(w) >= 0; });
        c.hidden = !(okCat && okQ); if (!c.hidden) n++;
      });
      count.textContent = n + (n === 1 ? ' tool' : ' tools'); none.hidden = n !== 0;
    };
    search.addEventListener('input', apply);
    chips.forEach(function (ch) { ch.addEventListener('click', function () { chips.forEach(function (x) { x.classList.remove('active'); x.removeAttribute('aria-pressed'); }); ch.classList.add('active'); ch.setAttribute('aria-pressed', 'true'); activeCat = ch.getAttribute('data-cat'); apply(); }); });
  }

  /* ---------- Tool pages ---------- */
  var root = document.getElementById('tool');
  if (!root) return;
  var conf = JSON.parse(document.getElementById('tool-config').textContent);
  var $ = function (s) { return root.querySelector(s); };
  var state = {}; // inputId -> array of {name, text, encoding, wb}
  conf.inputs.forEach(function (i) { state[i.id] = []; });
  var lastResult = null, MAX_PREVIEW = 200;

  // extra option: BOM
  if (conf.slug !== 'csv-to-json') {
    var grid2 = root.querySelector('.opt-grid'), d = document.createElement('div'); d.className = 'opt opt-check';
    d.innerHTML = '<label><input type="checkbox" id="opt-bom" data-opt="bom"> <span>Add a UTF-8 byte order mark when downloading (helps Excel show accented letters)</span></label>';
    grid2.appendChild(d);
  }

  function setStatus(msg) { $('#status').textContent = msg || ''; }
  function showMsg(type, text) { var el = document.createElement('div'); el.className = 'msg ' + type; el.textContent = text; $('#warnings').appendChild(el); }
  function clearResult() { $('#result').hidden = true; $('#warnings').innerHTML = ''; $('#preview').innerHTML = ''; $('#extra-actions').innerHTML = ''; lastResult = null; }
  function fail(msg) { clearResult(); $('#result').hidden = false; showMsg('err', msg); $('#summary').hidden = true; $('.result-actions').hidden = true; $('#preview').hidden = true; }
  function renderNames(id) {
    var blk = root.querySelector('[data-input="' + id + '"] .file-names');
    blk.textContent = state[id].length ? state[id].map(function (f) { return f.name + (f.encoding ? ' (' + f.encoding + ')' : ''); }).join(', ') : '';
  }

  function readOpts() {
    var o = {};
    root.querySelectorAll('[data-opt]').forEach(function (el) {
      var k = el.getAttribute('data-opt');
      if (el.type === 'checkbox') o[k] = el.checked;
      else if (el.type === 'number') o[k] = el.value === '' ? undefined : Number(el.value);
      else o[k] = el.value;
    });
    return o;
  }
  function setOpts(vals) {
    Object.keys(vals).forEach(function (k) {
      var el = root.querySelector('[data-opt="' + k + '"]'); if (!el) return;
      if (el.type === 'checkbox') el.checked = !!vals[k]; else el.value = vals[k];
    });
  }

  /* ----- file reading ----- */
  function readBuffer(file) {
    return new Promise(function (res, rej) {
      if (file.arrayBuffer) return file.arrayBuffer().then(res, rej);
      var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(fr.error); }; fr.readAsArrayBuffer(file);
    });
  }
  function sheetRows(ws) {
    var raw = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: true });
    var width = raw.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    raw = raw.map(function (r) { r = r.map(function (v) { return v == null ? '' : String(v); }); while (r.length < width) r.push(''); return r; });
    while (raw.length && C.isEmptyRow(raw[raw.length - 1])) raw.pop();
    return raw;
  }
  function loadExcelBuffer(buf, name, id) {
    if (!window.XLSX) throw new Error('The Excel reader is still loading. Try again in a moment.');
    var wb;
    try { wb = window.XLSX.read(buf, { type: 'array' }); } catch (e) { throw new Error('This file could not be read as an Excel workbook. It may be damaged or password protected.'); }
    if (!wb.SheetNames.length) throw new Error('The workbook has no worksheets.');
    state[id] = [{ name: name, wb: wb }];
    var sel = $('#opt-sheet'), wrap = $('#sheet-wrap');
    sel.innerHTML = ''; wb.SheetNames.forEach(function (n) { var op = document.createElement('option'); op.value = n; op.textContent = n; sel.appendChild(op); });
    wrap.hidden = false; renderNames(id);
  }
  async function handleFiles(files, id) {
    clearResult(); setStatus('');
    var kind = conf.inputs.filter(function (i) { return i.id === id; })[0].kind;
    var list = Array.prototype.slice.call(files);
    if (kind !== 'csv-multi') list = list.slice(0, 1); else state[id] = state[id].slice();
    if (!list.length) return;
    try {
      if (kind === 'excel') {
        var f = list[0], buf = await readBuffer(f);
        loadExcelBuffer(new Uint8Array(buf), f.name, id);
        setStatus('Loaded ' + f.name + '. Choose a worksheet and press Convert.');
        return;
      }
      if (kind !== 'csv-multi') state[id] = [];
      for (var i = 0; i < list.length; i++) {
        var file = list[i];
        if (file.size > 150 * 1024 * 1024) { fail(file.name + ' is larger than 150 MB. That is more than most browsers can process safely. Split the file first.'); return; }
        var dec = C.decodeBuffer(await readBuffer(file));
        state[id].push({ name: file.name, text: dec.text, encoding: dec.encoding, size: file.size });
      }
      var ta = root.querySelector('#paste-' + id); if (ta && kind !== 'csv-multi') ta.value = '';
      renderNames(id);
      setStatus('Loaded ' + list.length + (list.length === 1 ? ' file.' : ' files.') + ' Press the button below to run.');
    } catch (e) { fail(e.message || 'Could not read the file.'); }
  }
  root.querySelectorAll('.input-block').forEach(function (blk) {
    var id = blk.getAttribute('data-input'), drop = blk.querySelector('.drop'), inp = blk.querySelector('.file-input');
    inp.addEventListener('change', function () { handleFiles(inp.files, id); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files, id); });
    var add = blk.querySelector('.add-paste');
    if (add) add.addEventListener('click', function () {
      var ta = blk.querySelector('textarea'); if (!ta.value.trim()) { setStatus('Paste some text first.'); return; }
      state[id].push({ name: 'pasted-' + (state[id].length + 1) + '.csv', text: ta.value, encoding: '' }); ta.value = ''; renderNames(id); setStatus('Added pasted text as a file.');
    });
    var ta2 = blk.querySelector('textarea');
    if (ta2 && !add) ta2.addEventListener('input', function () { if (state[id].length) { state[id] = []; renderNames(id); } });
  });

  /* ----- collect inputs ----- */
  function collectInputs(o) {
    var out = [], warns = [];
    conf.inputs.forEach(function (inp) {
      var items = state[inp.id].slice();
      if (inp.kind === 'excel') {
        if (!items.length) throw new Error('Choose an Excel file first.');
        var wb = items[0].wb, sheet = o.sheet || wb.SheetNames[0];
        out.push({ name: items[0].name, sheet: sheet, rows: sheetRows(wb.Sheets[sheet]) });
        return;
      }
      var ta = root.querySelector('#paste-' + inp.id);
      if (inp.kind === 'csv-multi') { if (ta && ta.value.trim()) items.push({ name: 'pasted.csv', text: ta.value }); }
      else if (!items.length && ta && ta.value.trim()) items = [{ name: inp.kind === 'json' ? 'pasted.json' : 'pasted.csv', text: ta.value }];
      if (!items.length) throw new Error(conf.inputs.length > 1 ? 'Add ' + inp.label + ' first.' : 'Choose a file or paste some text first.');
      items.forEach(function (it) {
        if (inp.kind === 'json') { out.push({ name: it.name, text: it.text }); return; }
        var p = C.parseCSV(it.text, o.delimiter || 'auto');
        p.warnings.forEach(function (w) { warns.push((items.length > 1 || conf.inputs.length > 1 ? it.name + ': ' : '') + w); });
        if (it.encoding && /fallback/.test(it.encoding)) warns.push((it.name || 'File') + ' is not valid UTF-8, so it was read as Windows-1252. Check accented letters in the preview.');
        out.push({ name: it.name, rows: p.rows, text: it.text, delimiter: p.delimiter });
      });
    });
    return { ins: out, warns: warns };
  }

  /* ----- rendering ----- */
  function table(rows, max, mark) {
    var t = document.createElement('table'), body = document.createElement('tbody');
    rows.slice(0, max + 1).forEach(function (r, i) {
      var tr = document.createElement('tr');
      r.forEach(function (v) { var c = document.createElement(i === 0 ? 'th' : 'td'); if (i === 0) c.scope = 'col'; c.textContent = v; tr.appendChild(c); });
      if (mark && i > 0) tr.className = mark;
      (i === 0 ? t.createTHead() : body).appendChild(tr);
    });
    t.appendChild(body); return t;
  }
  function note(text) { var p = document.createElement('p'); p.className = 'muted small'; p.textContent = text; return p; }
  function download(name, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function csvText(rows, o) { return (o.bom ? '\ufeff' : '') + C.toCSV(rows, o.outDelimiter || ','); }

  function render(res, o, warns) {
    clearResult(); $('#result').hidden = false; $('#summary').hidden = false; $('.result-actions').hidden = false; $('#preview').hidden = false;
    (warns || []).concat(res.warnings || []).forEach(function (w) { showMsg('warn', w); });
    $('#summary').textContent = res.summary || 'Done.';
    var prev = $('#preview'), dl = $('#download-btn'), copy = $('#copy-btn');
    copy.hidden = false;
    var extra = $('#extra-actions');
    if (res.kind === 'table') {
      var total = res.rows.length - 1;
      prev.appendChild(table(res.rows, MAX_PREVIEW));
      if (total > MAX_PREVIEW) prev.appendChild(note('Showing the first ' + MAX_PREVIEW + ' of ' + total + ' data rows. The download has all of them.'));
      dl.textContent = 'Download CSV'; dl.onclick = function () { download(res.name || 'result.csv', csvText(res.rows, o), 'text/csv;charset=utf-8'); track('tool_download', { tool: conf.slug }); };
      copy.onclick = function () { copyText(C.toCSV(res.rows, o.outDelimiter || ',')); };
      if (res.extraFile) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary'; b.textContent = res.extraFile.label; b.onclick = function () { download(res.extraFile.name, csvText(res.extraFile.rows, o), 'text/csv;charset=utf-8'); }; extra.appendChild(b); }
      if (res.viewOnly) dl.textContent = 'Download normalized CSV';
    } else if (res.kind === 'text') {
      var pre = document.createElement('pre'); pre.textContent = res.text.length > 20000 ? res.text.slice(0, 20000) + '\n... preview shortened. Download for the full file.' : res.text; prev.appendChild(pre);
      dl.textContent = 'Download ' + res.name.split('.').pop().toUpperCase(); dl.onclick = function () { download(res.name, res.text, res.mime); track('tool_download', { tool: conf.slug }); };
      copy.onclick = function () { copyText(res.text); };
    } else if (res.kind === 'multi') {
      var ul = document.createElement('ul'); ul.style.padding = '12px 12px 12px 32px';
      res.files.slice(0, 60).forEach(function (f) { var li = document.createElement('li'); li.textContent = f.name + ' (' + (f.rows.length - 1) + ' data rows)'; ul.appendChild(li); });
      prev.appendChild(ul); if (res.files.length > 60) prev.appendChild(note('...and ' + (res.files.length - 60) + ' more files in the ZIP.'));
      prev.appendChild(table(res.files[0].rows, 10)); prev.appendChild(note('Preview of the first file.'));
      dl.textContent = 'Download all as ZIP';
      var zipFiles = function () { return res.files.map(function (f) { return { name: f.name, content: csvText(f.rows, o) }; }); };
      dl.onclick = function () { download(res.name, new Blob([C.makeZip(zipFiles())], { type: 'application/zip' })); track('tool_download', { tool: conf.slug }); };
      copy.hidden = true;
    } else if (res.kind === 'compare') {
      var r = res.result;
      function section(title, rows, hdrs, mark) { if (!rows.length) return; var h = document.createElement('h3'); h.textContent = title + ' (' + rows.length + ')'; prev.appendChild(h); prev.appendChild(table([hdrs].concat(rows), 50, mark)); if (rows.length > 50) prev.appendChild(note('Showing 50 of ' + rows.length + '. Download the report for everything.')); }
      section('Only in file A', r.onlyA, r.headersA, 'del'); section('Only in file B', r.onlyB, r.headersB, 'add');
      var chg = []; r.changed.forEach(function (c) { c.diffs.forEach(function (d) { chg.push([c.key, d.column, d.a, d.b]); }); });
      section('Changed cells', chg, ['Key', 'Column', 'Value in A', 'Value in B'], 'chg');
      if (!r.onlyA.length && !r.onlyB.length && !r.changed.length) { var p = document.createElement('p'); p.textContent = 'The files match on every row and every shared column.'; prev.appendChild(p); }
      dl.textContent = 'Download difference report (CSV)'; dl.onclick = function () { download('differences.csv', csvText(res.rows, o), 'text/csv;charset=utf-8'); track('tool_download', { tool: conf.slug }); };
      copy.onclick = function () { copyText(C.toCSV(res.rows, ',')); };
    }
    lastResult = res;
    $('#result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function copyText(t) {
    var done = function () { setStatus('Copied to clipboard.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { setStatus('Copy was blocked by the browser. Use Download instead.'); });
    else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { setStatus('Copy is not supported here. Use Download instead.'); } ta.remove(); }
  }

  /* ----- run ----- */
  function run() {
    clearResult(); setStatus('Working...');
    var btn = $('#run-btn'); btn.disabled = true;
    setTimeout(function () {
      var ok = false;
      try {
        var o = readOpts();
        var got = collectInputs(o);
        var res = R[conf.slug](got.ins, o);
        render(res, o, got.warns); setStatus(''); ok = true;
      } catch (e) { fail(e && e.message ? e.message : 'Something went wrong.'); setStatus(''); }
      btn.disabled = false;
      track('tool_run', { tool: conf.slug, success: ok });
    }, 30);
  }
  $('#run-btn').addEventListener('click', run);

  $('#reset-btn').addEventListener('click', function () {
    conf.inputs.forEach(function (i) { state[i.id] = []; renderNames(i.id); var ta = root.querySelector('#paste-' + i.id); if (ta) ta.value = ''; });
    root.querySelectorAll('[data-opt]').forEach(function (el) { if (el.type === 'checkbox') el.checked = el.defaultChecked; else if (el.tagName === 'SELECT') { el.selectedIndex = Array.prototype.findIndex.call(el.options, function (o) { return o.defaultSelected; }); if (el.selectedIndex < 0) el.selectedIndex = 0; } else el.value = el.defaultValue; });
    if ($('#sheet-wrap')) { $('#sheet-wrap').hidden = true; $('#opt-sheet').innerHTML = ''; }
    clearResult(); setStatus('');
  });

  $('#load-sample').addEventListener('click', function () {
    clearResult();
    if (conf.excel) {
      if (!window.XLSX) { fail('The Excel reader is still loading. Try again in a moment.'); return; }
      var aoa = [['item', 'quantity', 'unit_price'], ['Notebook', 10, 3.5], ['Pen', 25, 1.2], ['Stapler', 3, 9.99]];
      var wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(aoa), 'Orders');
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([['note'], ['Second sheet: pick it in the Worksheet list.']]), 'Notes');
      var buf = window.XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      try { loadExcelBuffer(new Uint8Array(buf), 'sample-workbook.xlsx', conf.inputs[0].id); } catch (e2) { fail(e2.message); return; }
      setOpts(conf.sampleOpts); run(); return;
    }
    if (conf.samples.length > 1 && conf.inputs.length === 1) { state[conf.inputs[0].id] = conf.samples.map(function (s) { return { name: s.name, text: s.text, encoding: '' }; }); renderNames(conf.inputs[0].id); }
    else if (conf.inputs.length > 1) conf.inputs.forEach(function (inp, i) { state[inp.id] = [{ name: conf.samples[i].name, text: conf.samples[i].text, encoding: '' }]; renderNames(inp.id); });
    else { state[conf.inputs[0].id] = [{ name: conf.samples[0].name, text: conf.samples[0].text, encoding: '' }]; renderNames(conf.inputs[0].id); }
    conf.inputs.forEach(function (i) { var ta = root.querySelector('#paste-' + i.id); if (ta) ta.value = ''; });
    setOpts(conf.sampleOpts); run();
  });
})();
