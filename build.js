/* SheetShift static site generator. Usage: SITE_URL=https://example.pages.dev node build.js */
const fs = require('fs'), path = require('path');
const { TOOLS, CATEGORIES, GUIDES } = require('./tools.js');
const C = require('./src/assets/core.js');
const R = require('./src/assets/runners.js');
const cfg = {
  site: (process.env.SITE_URL || 'https://sheetshift.pages.dev').replace(/\/$/, ''),
  ga: process.env.GA4_ID || 'G-H8TNG17E5G',            // e.g. G-XXXXXXXXXX (leave empty until the owner creates it)
  gsc: process.env.GSC_VERIFICATION || '', // Google Search Console meta token
  bing: process.env.BING_VERIFICATION || '',
  repo: process.env.REPO_URL || '',
  email: process.env.CONTACT_EMAIL || 'janinstinct@gmail.com',
  built: new Date().toISOString().slice(0, 10)
};
const OUT = path.join(__dirname, 'dist');
fs.rmSync(OUT, { recursive: true, force: true });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const write = (p, c) => { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };
const url = p => cfg.site + p;
const TAG = 'Clean. Convert. Compare. Simplify.';
const toolBySlug = Object.fromEntries(TOOLS.map(t => [t.slug, t]));
const catOf = slug => toolBySlug[slug].cat;
const toolPath = s => '/tools/' + s + '/';

const logo = `<svg class="logo-mark" viewBox="0 0 32 32" width="28" height="28" role="img" aria-label="SheetShift logo"><rect x="2" y="3" width="20" height="20" rx="4" fill="currentColor" opacity=".25"/><rect x="8" y="9" width="20" height="20" rx="4" fill="currentColor"/><path d="M13 19h10m0 0-3.5-3.5M23 19l-3.5 3.5" stroke="var(--bg)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function head({ title, desc, path: p, ogType = 'website', ld = [], noindex = false }) {
  const verif = (cfg.gsc ? `<meta name="google-site-verification" content="${esc(cfg.gsc)}">` : '') + (cfg.bing ? `<meta name="msvalidate.01" content="${esc(cfg.bing)}">` : '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<link rel="canonical" href="${url(p)}">
<meta name="theme-color" content="#0b7a75">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:site_name" content="SheetShift">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url(p)}">
<meta property="og:image" content="${url('/assets/og-image.png')}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="SheetShift: Clean. Convert. Compare. Simplify.">
<meta name="twitter:card" content="summary_large_image">
${verif}
<script>try{var t=localStorage.getItem('ss-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="stylesheet" href="/assets/style.css?v=${cfg.built}">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

function header() {
  return `<header class="site-header"><div class="wrap bar">
<a class="brand" href="/" aria-label="SheetShift home">${logo}<span>SheetShift</span></a>
<nav aria-label="Main" class="nav">
<a href="/#tools">Tools</a><a href="/guides/">Guides</a><a href="/how-it-works/">How it works</a><a href="/about/">About</a>
<button id="theme-toggle" class="icon-btn" type="button" aria-label="Switch between light and dark mode" title="Switch theme"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="currentColor"/></svg></button>
</nav></div></header>`;
}
function footer() {
  const cats = Object.entries(CATEGORIES).map(([s, c]) => `<li><a href="/${s}/">${esc(c.name)}</a></li>`).join('');
  return `<footer class="site-footer"><div class="wrap foot">
<div><a class="brand" href="/">${logo}<span>SheetShift</span></a><p class="muted">${TAG}</p><p class="muted small">Your files are processed in your browser and are not uploaded by SheetShift.</p></div>
<div><h2>Categories</h2><ul>${cats}</ul></div>
<div><h2>Popular tools</h2><ul>${['remove-duplicate-rows', 'csv-to-json', 'csv-comparator', 'csv-merger', 'excel-to-csv'].map(s => `<li><a href="${toolPath(s)}">${esc(toolBySlug[s].name)}</a></li>`).join('')}</ul></div>
<div><h2>SheetShift</h2><ul><li><a href="/guides/">Guides</a></li><li><a href="/how-it-works/">How it works</a></li><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy/">Privacy Policy</a></li><li><a href="/terms/">Terms of Service</a></li></ul></div>
</div><div class="wrap small muted copy">&copy; ${new Date().getFullYear()} SheetShift. Free tools for spreadsheet and structured data.</div></footer>`;
}
function scripts(extra = '') {
  return `${cfg.ga ? `<script>window.SS_GA=${JSON.stringify(cfg.ga)};</script>` : ''}${extra}<script src="/assets/app.js?v=${cfg.built}" defer></script></body></html>`;
}
function crumbs(items) { // [{name, path}]
  const html = `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((it, i) => i === items.length - 1 ? `<li aria-current="page">${esc(it.name)}</li>` : `<li><a href="${it.path}">${esc(it.name)}</a></li>`).join('')}</ol></nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: url(it.path) })) };
  return { html, ld };
}

/* ---------- Examples computed with the real code ---------- */
function defaults(t) { const o = {}; t.options.forEach(op => { if (op.type !== 'sheet') o[op.id] = op.value; }); return Object.assign(o, t.exampleOpts || {}); }
function parseIn(text, opts) { const p = C.parseCSV(text, (opts && opts.delimiter) || 'auto'); return { name: 'file.csv', rows: p.rows, text }; }
function example(t) {
  if (t.exampleText) return { input: t.exampleText.input, output: t.exampleText.output, summary: '' };
  const opts = defaults(t);
  let ins;
  if (t.samples) ins = t.samples.map(s => Object.assign(parseIn(s.text), { name: s.name }));
  else if (t.inputs[0].kind === 'json') ins = [{ name: 'a.json', text: t.sample }];
  else ins = [Object.assign(parseIn(t.sample, opts), { name: t.sampleName || 'sample.csv' })];
  const res = R[t.slug](ins, opts);
  let out = '';
  const d = opts.outDelimiter || ',';
  if (res.kind === 'table') out = C.toCSV(res.rows, d);
  else if (res.kind === 'text') out = res.text;
  else if (res.kind === 'multi') out = res.files.map(f => '# ' + f.name + '\n' + C.toCSV(f.rows, d)).join('\n');
  else if (res.kind === 'compare') out = C.toCSV(res.rows, ',');
  const input = t.samples ? t.samples.map(s => '# ' + s.name + '\n' + s.text).join('\n') : t.sample;
  return { input: input.replace(/\u00a0/g, '\u00b7'), output: out.replace(/\u00a0/g, '\u00b7'), summary: res.summary || '' };
}

function optionsHtml(t) {
  return t.options.map(op => {
    const id = 'opt-' + op.id;
    if (op.type === 'checkbox') return `<div class="opt opt-check"><label><input type="checkbox" id="${id}" data-opt="${op.id}" ${op.value ? 'checked' : ''}> <span>${esc(op.label)}</span></label></div>`;
    if (op.type === 'select') return `<div class="opt"><label for="${id}">${esc(op.label)}</label><select id="${id}" data-opt="${op.id}">${op.choices.map(([v, l]) => `<option value="${esc(v)}" ${v === op.value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    if (op.type === 'sheet') return `<div class="opt" id="sheet-wrap" hidden><label for="${id}">${esc(op.label)}</label><select id="${id}" data-opt="sheet"></select></div>`;
    return `<div class="opt"><label for="${id}">${esc(op.label)}</label><input id="${id}" data-opt="${op.id}" type="${op.type === 'number' ? 'number' : 'text'}" ${op.min != null ? `min="${op.min}"` : ''} value="${esc(op.value)}" ${op.placeholder ? `placeholder="${esc(op.placeholder)}"` : ''} ${op.required ? 'aria-required="true"' : ''} autocomplete="off"></div>`;
  }).join('\n');
}
function inputsHtml(t) {
  return t.inputs.map(inp => {
    const accept = inp.kind === 'excel' ? '.xlsx,.xlsm,.xls,.ods' : inp.kind === 'json' ? '.json,.txt,.jsonl,.ndjson,application/json' : '.csv,.tsv,.txt,text/csv,text/plain';
    const multi = inp.kind === 'csv-multi';
    const paste = inp.kind !== 'excel';
    return `<div class="input-block" data-input="${inp.id}" data-kind="${inp.kind}">
<div class="drop" tabindex="-1"><p class="drop-title"><strong>${esc(inp.label)}</strong></p>
<p class="muted small">Drag a file here, or</p>
<label class="btn btn-secondary file-btn">Choose ${multi ? 'files' : 'file'}<input class="file-input" type="file" accept="${accept}" ${multi ? 'multiple' : ''}></label>
<p class="file-names small" aria-live="polite"></p></div>
${paste ? `<label class="paste-label small" for="paste-${inp.id}">${multi ? 'Or paste text to add it as another file' : 'Or paste text'}</label><textarea id="paste-${inp.id}" class="paste" rows="5" spellcheck="false" placeholder="${inp.kind === 'json' ? 'Paste JSON here' : 'Paste CSV text here'}"></textarea>${multi ? '<button type="button" class="btn btn-secondary btn-small add-paste">Add pasted text as a file</button>' : ''}` : ''}
</div>`;
  }).join('\n');
}
function sampleFiles(t) {
  if (t.samples) return t.samples.map(s => ({ name: s.name, text: s.text }));
  if (t.inputs[0].kind === 'excel') return [{ name: 'sample-workbook.xlsx', text: null }];
  return [{ name: t.sampleName || (t.slug + '-sample.csv'), text: t.sample }];
}

function toolPage(t) {
  const p = toolPath(t.slug), cat = CATEGORIES[t.cat];
  const bc = crumbs([{ name: 'Home', path: '/' }, { name: cat.name, path: '/' + t.cat + '/' }, { name: t.name, path: p }]);
  const ex = example(t);
  const ld = [bc.ld, { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'SheetShift ' + t.name, url: url(p), description: t.desc, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (modern web browser)', browserRequirements: 'Requires JavaScript', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: 'SheetShift', url: url('/') } }];
  const conf = { slug: t.slug, name: t.name, options: t.options.map(o => ({ id: o.id, type: o.type })), inputs: t.inputs, samples: sampleFiles(t).map(s => ({ name: s.name, text: s.text })), sampleOpts: t.exampleOpts || {}, excel: t.inputs[0].kind === 'excel' };
  const rel = t.related.map(s => toolBySlug[s]).filter(Boolean);
  const relHtml = rel.map(r => `<li><a href="${toolPath(r.slug)}"><strong>${esc(r.name)}</strong></a><span class="muted"> ${esc(r.desc.split('. ')[0].replace(/\.$/, ''))}.</span></li>`).join('');
  const guide = GUIDES.filter(g => g.tools.includes(t.slug));
  const sampleLinks = sampleFiles(t).map(s => `<a href="/samples/${s.name}" download>${esc(s.name)}</a>`).join(', ');
  return head({ title: t.title, desc: t.desc, path: p, ld }) + header() + `
<main id="main" class="wrap tool-page">
${bc.html}
<h1>${esc(t.h1)}</h1>
<p class="lead">${esc(t.lead)}</p>
<section class="tool-card" id="tool" aria-labelledby="tool-heading" data-tool="${t.slug}">
<h2 id="tool-heading" class="sr-only">${esc(t.name)} tool</h2>
<noscript><p class="notice">This tool needs JavaScript. SheetShift runs in your browser, so it cannot work with JavaScript turned off.</p></noscript>
<div class="privacy-note"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Your file stays in this browser tab. It is not uploaded by SheetShift.</span></div>
<div class="inputs">${inputsHtml(t)}</div>
<div class="sample-row"><button type="button" class="btn btn-secondary" id="load-sample">Try with sample data</button></div>
<fieldset class="options"><legend>Options</legend><div class="opt-grid">${optionsHtml(t)}</div></fieldset>
<div class="actions"><button type="button" class="btn btn-primary" id="run-btn">${esc(t.runLabel || t.name)}</button><button type="button" class="btn btn-ghost" id="reset-btn">Reset</button></div>
<div id="status" class="status" role="status" aria-live="polite"></div>
<div id="result" class="result" hidden>
<div id="warnings"></div>
<p id="summary" class="summary"></p>
<div class="result-actions"><button type="button" class="btn btn-primary" id="download-btn">Download</button><span id="extra-actions"></span><button type="button" class="btn btn-secondary" id="copy-btn">Copy to clipboard</button></div>
<div id="preview" class="preview"></div>
</div>
<script type="application/json" id="tool-config">${JSON.stringify(conf).replace(/</g, '\\u003c')}</script>
</section>

<section class="content"><h2>How to use the ${esc(t.name)}</h2><ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>

<section class="content"><h2>Example: input and output</h2>
<p>This example was produced by the same code the tool runs${t.exampleOpts && Object.keys(t.exampleOpts).length ? ', with these settings: ' + esc(Object.entries(t.exampleOpts).map(([k, v]) => k + ' = ' + v).join(', ')) : ' with default settings'}.${t.exampleText ? '' : ' You can download the sample file(s): ' + sampleLinks + '.'}</p>
<div class="example"><figure><figcaption>Input</figcaption><pre tabindex="0">${esc(ex.input)}</pre></figure><figure><figcaption>Output</figcaption><pre tabindex="0">${esc(ex.output)}</pre></figure></div>
${ex.summary ? `<p class="muted small">Result summary: ${esc(ex.summary)}</p>` : ''}</section>

<section class="content two"><div><h2>Supported formats</h2><p>${esc(t.formats)}</p></div><div><h2>Limitations</h2><ul>${t.limits.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div></section>

<section class="content"><h2>When this helps</h2><div class="cases">${t.useCases.map(([h, b]) => `<div class="case"><h3>${esc(h)}</h3><p>${esc(b)}</p></div>`).join('')}</div></section>

<section class="content"><h2>Frequently asked questions</h2>${t.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>

<section class="content"><h2>Related tools</h2><ul class="related">${relHtml}</ul>${guide.length ? `<p>Guides: ${guide.map(g => `<a href="/guides/${g.slug}/">${esc(g.h1)}</a>`).join(' &middot; ')}</p>` : ''}<p class="muted small">Category: <a href="/${t.cat}/">${esc(cat.name)}</a></p></section>
</main>` + footer() + scripts((t.inputs[0].kind === 'excel' ? '<script src="/assets/vendor/xlsx.mini.min.js" defer></script>' : '') + `<script src="/assets/core.js?v=${cfg.built}" defer></script><script src="/assets/runners.js?v=${cfg.built}" defer></script>`) ;
}

function toolCard(t) {
  return `<li class="card" data-name="${esc(t.name.toLowerCase())}" data-keywords="${esc((t.kw + ' ' + t.longtail.join(' ') + ' ' + t.desc).toLowerCase())}" data-cat="${t.cats.join(' ')}"><a href="${toolPath(t.slug)}"><h3>${esc(t.name)}</h3><p>${esc(t.desc.split('. ')[0].replace(/\.$/, ''))}.</p><span class="tag">${esc(CATEGORIES[t.cat].name)}</span></a></li>`;
}

function homePage() {
  const title = 'SheetShift: Free CSV, Excel and JSON Tools in Your Browser';
  const desc = 'Clean, convert, compare and simplify spreadsheet data. ' + TOOLS.length + ' free tools for CSV, Excel and JSON that run in your browser. No sign-up, no upload.';
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'SheetShift', url: url('/'), description: desc, inLanguage: 'en' }, { '@context': 'https://schema.org', '@type': 'Organization', name: 'SheetShift', url: url('/'), logo: url('/favicon.svg') }];
  const chips = `<button type="button" class="chip active" data-cat="all">All</button>` + Object.entries(CATEGORIES).map(([s, c]) => `<button type="button" class="chip" data-cat="${s}">${esc(c.name)}</button>`).join('');
  return head({ title, desc, path: '/', ld }) + header() + `
<main id="main">
<section class="hero"><div class="wrap">
<p class="eyebrow">${TAG}</p>
<h1>Free spreadsheet and data tools that run in your browser</h1>
<p class="lead">Clean messy CSV files, remove duplicates, convert between CSV, JSON and Excel, merge, split and compare files. No account. Your files stay on your device.</p>
<form class="search" role="search" onsubmit="return false"><label for="tool-search" class="sr-only">Search tools</label><input id="tool-search" type="search" placeholder="Search tools, e.g. duplicates, JSON, merge" autocomplete="off"></form>
</div></section>
<section class="wrap" id="tools" aria-labelledby="tools-h"><h2 id="tools-h">All tools</h2>
<div class="chips" role="group" aria-label="Filter by category">${chips}</div>
<p id="tool-count" class="muted small" aria-live="polite">${TOOLS.length} tools</p>
<ul class="grid" id="tool-grid">${TOOLS.map(toolCard).join('')}</ul>
<p id="no-results" class="muted" hidden>No tools match your search. Try a shorter word such as "csv" or "json".</p>
</section>
<section class="wrap content"><h2>Why SheetShift</h2><div class="cases">
<div class="case"><h3>Private by design</h3><p>The tools run as JavaScript in your browser tab. SheetShift does not upload the files you open. <a href="/how-it-works/">See how it works</a>.</p></div>
<div class="case"><h3>Made for real files</h3><p>Semicolon and tab delimiters, quoted line breaks, byte order marks and old Windows encodings are handled and reported, not silently mangled.</p></div>
<div class="case"><h3>Free, no sign-up</h3><p>Every tool is free to use without an account. The site is built on open-source libraries and free hosting.</p></div>
</div></section>
<section class="wrap content"><h2>Guides</h2><ul class="related">${GUIDES.map(g => `<li><a href="/guides/${g.slug}/"><strong>${esc(g.h1)}</strong></a></li>`).join('')}</ul></section>
</main>` + footer() + scripts();
}

function categoryPage(slug) {
  const c = CATEGORIES[slug], p = '/' + slug + '/';
  const bc = crumbs([{ name: 'Home', path: '/' }, { name: c.name, path: p }]);
  const list = TOOLS.filter(t => t.cats.includes(slug));
  const ld = [bc.ld, { '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.name, url: url(p), description: c.desc }];
  const extra = {
    'csv-tools': 'Tip: if a file opens as one long column, check the delimiter first. Many European exports use semicolons.',
    'excel-tools': 'Tip: for several sheets, convert one sheet at a time and merge the CSV files afterwards with the CSV Merger.',
    'json-tools': 'Tip: JSON keeps types and nesting, CSV does not. Decide which one your next tool expects before you convert.',
    'data-cleaning': 'Tip: clean in this order: delimiter and encoding, empty rows and columns, whitespace, then duplicates.',
    'data-comparison': 'Tip: a unique key column makes comparisons reliable. Use IDs rather than names whenever you can.',
    'data-conversion': 'Tip: after converting, open the result in the CSV Viewer to confirm columns and special characters look right.'
  }[slug];
  return head({ title: c.title, desc: c.desc, path: p, ld }) + header() + `<main id="main" class="wrap">${bc.html}<h1>${esc(c.h1.charAt(0).toUpperCase() + c.h1.slice(1))}</h1><p class="lead">${esc(c.intro)}</p>
<ul class="grid">${list.map(toolCard).join('')}</ul><p class="notice-soft">${esc(extra)}</p>
<h2>Related guides</h2><ul class="related">${GUIDES.filter(g => g.tools.some(s => list.some(t => t.slug === s))).map(g => `<li><a href="/guides/${g.slug}/">${esc(g.h1)}</a></li>`).join('')}</ul></main>` + footer() + scripts();
}

function guidePage(g) {
  const p = '/guides/' + g.slug + '/';
  const bc = crumbs([{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides/' }, { name: g.h1, path: p }]);
  const ld = [bc.ld, { '@context': 'https://schema.org', '@type': 'Article', headline: g.h1, description: g.desc, datePublished: cfg.built, dateModified: cfg.built, inLanguage: 'en', mainEntityOfPage: url(p), author: { '@type': 'Organization', name: 'SheetShift' }, publisher: { '@type': 'Organization', name: 'SheetShift', logo: { '@type': 'ImageObject', url: url('/favicon.svg') } } }];
  return head({ title: g.title, desc: g.desc, path: p, ogType: 'article', ld }) + header() + `<main id="main" class="wrap article">${bc.html}<h1>${esc(g.h1)}</h1><p class="muted small">Updated ${cfg.built}</p>
${g.body.map(([h, b]) => `<h2>${esc(h)}</h2><p>${b}</p>`.replace('<p><ul>', '<ul>').replace('</ul></p>', '</ul>').replace('<p><ol>', '<ol>').replace('</ol></p>', '</ol>')).join('\n')}
<h2>Tools mentioned</h2><ul class="related">${g.tools.map(s => `<li><a href="${toolPath(s)}"><strong>${esc(toolBySlug[s].name)}</strong></a></li>`).join('')}</ul></main>` + footer() + scripts();
}
function guidesIndex() {
  const p = '/guides/', bc = crumbs([{ name: 'Home', path: '/' }, { name: 'Guides', path: p }]);
  return head({ title: 'Spreadsheet and CSV Guides | SheetShift', desc: 'Practical guides for cleaning CSV files, fixing encoding problems and comparing spreadsheets, written to go with the free SheetShift tools.', path: p, ld: [bc.ld] }) + header() + `<main id="main" class="wrap">${bc.html}<h1>Guides</h1><p class="lead">Short, practical guides that go with the tools.</p><ul class="related big">${GUIDES.map(g => `<li><a href="/guides/${g.slug}/"><strong>${esc(g.h1)}</strong></a><br><span class="muted">${esc(g.desc)}</span></li>`).join('')}</ul></main>` + footer() + scripts();
}

/* ---------- Trust pages ---------- */
const contactLine = cfg.repo ? `Open an issue on our <a href="${esc(cfg.repo)}/issues" rel="noopener">GitHub repository</a>. Please do not post private data in a public issue.` : 'A public contact channel will be listed here soon.';
const contactEmail = cfg.email ? `<p>Email: <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p>` : '';
const STATIC = {
  '/about/': { title: 'About SheetShift | Free Browser-Based Data Tools', desc: 'SheetShift builds free tools to clean, convert, compare and simplify spreadsheet and structured data, running locally in your browser.', h1: 'About SheetShift', body: `<p>SheetShift is a free collection of tools for people who work with spreadsheets and structured data: analysts, accountants, developers, researchers and students.</p>
<h2>What we are building</h2><p>Most everyday data jobs are small: remove duplicates from a list, turn a CSV into JSON, find what changed between two exports. They should not need a software install, an account or an upload of private files. SheetShift does these jobs in the browser tab.</p>
<h2>How we work</h2><ul><li>Each tool is a real working tool with a sample you can run, and a plain description of what it does not do.</li><li>The pages explain limits and edge cases instead of promising perfect results.</li><li>We use open-source libraries. The Excel reader is SheetJS Community Edition (Apache 2.0).</li></ul>
<h2>Who runs it</h2><p>SheetShift is an independent project. It is new, so the tool list will grow based on what people actually need. If you have a request or found a bug, see the <a href="/contact/">contact page</a>.</p>` },
  '/contact/': { title: 'Contact SheetShift | Report a Bug or Suggest a Tool', desc: 'How to report a bug, request a new tool or ask a question about SheetShift.', h1: 'Contact', body: `<p>We read bug reports and tool requests. When you write, tell us the tool name, your browser and what you expected to happen. Do not send files that contain private or confidential data.</p><h2>How to reach us</h2><p>${contactLine}</p>${contactEmail}<h2>Useful details for a bug report</h2><ul><li>The tool page address.</li><li>Browser and device, for example Chrome on Windows.</li><li>The options you selected and any message shown on the page.</li><li>A tiny example file that reproduces the problem, with fake data.</li></ul>` },
  '/how-it-works/': { title: 'How SheetShift Works: Local Browser Processing | SheetShift', desc: 'How SheetShift processes your files locally in your browser, what leaves your device, and what does not.', h1: 'How SheetShift works', body: `<h2>Local processing</h2><p>When you choose a file, your browser reads it into memory. JavaScript code that is part of this website parses it, applies the tool you chose and builds the result. The download button creates a file from that result inside your browser. During this process SheetShift does not send the content of your file to a server.</p>
<h2>What does leave your device</h2><ul><li>Your browser requests the web pages, scripts and styles from our host, Cloudflare Pages. Like any web host, it can log technical request details such as IP address and page address.</li><li>${cfg.ga ? 'Only if you accept the analytics banner, Google Analytics 4 measures page visits and tool usage events. Events contain the tool name, not file content. See the <a href="/privacy/">Privacy Policy</a>.' : 'If we enable analytics, it will measure page visits and tool usage events. Events will contain the tool name, not file content. This page and the <a href="/privacy/">Privacy Policy</a> will be updated first.'}</li></ul>
<h2>Third-party code</h2><p>The Excel to CSV tool loads SheetJS Community Edition from this site (not from a third-party server) only on that page.</p>
<h2>What you can check yourself</h2><p>Open your browser developer tools, go to the Network tab, run a tool on a sample file and look at the requests. You should see no upload of the file. This is the best way to verify the claim for yourself.</p>
<h2>Limits</h2><ul><li>Everything runs in your device memory. Very large files can slow down or crash a browser tab, especially on phones.</li><li>Browser extensions can read page content. Use a private window without extensions for sensitive files.</li><li>Local processing is not the same as anonymization or compliance with a law. You remain responsible for the data you handle.</li></ul>
<h2>The processing steps</h2><ol><li>Detect text encoding (UTF-8, UTF-16, Windows-1252).</li><li>Detect or apply the delimiter and parse quoted fields.</li><li>Apply the tool and show a preview.</li><li>Create the download in your browser.</li></ol>` },
  '/privacy/': { title: 'Privacy Policy | SheetShift', desc: 'What SheetShift does and does not collect. Files are processed in your browser. Details about hosting logs and analytics.', h1: 'Privacy Policy', body: `<p>Last updated: ${cfg.built}.</p>
<h2>Your files</h2><p>The tools process files in your browser. SheetShift does not upload or store the content of files you open in the tools. See <a href="/how-it-works/">How it works</a> for details and for how you can verify this yourself.</p>
<h2>Information collected by hosting</h2><p>The site is hosted on Cloudflare Pages. Cloudflare may process technical data such as IP address, requested address, browser type and time of the request to deliver the site and protect it. See Cloudflare's own privacy policy for details.</p>
<h2>Analytics</h2><p>${cfg.ga ? 'This site uses Google Analytics 4 to measure visits and tool usage events (tool name and whether it completed; never file content). It is only loaded after you accept.' : 'At the time of writing, this site does not use analytics or advertising cookies. If we add analytics (for example Google Analytics 4) or advertising (for example Google AdSense), we will update this policy first and, where required, ask for your consent.'}</p>
<h2>Cookies and local storage</h2><p>The site stores your light or dark theme choice in your browser's local storage. It does not need any other cookies to work.</p>
<h2>Contact messages</h2><p>If you contact us, for example through a public GitHub issue, we see what you send and use it to respond. Do not include private data.</p>
<h2>Children</h2><p>SheetShift is not directed at children under 13.</p>
<h2>Your rights</h2><p>Depending on where you live, you may have rights over personal data, such as access or deletion. Because we do not keep your files and do not run user accounts, we hold very little about you. For questions, use the <a href="/contact/">contact page</a>.</p>
<h2>Changes</h2><p>We will change this policy when the site changes and update the date above.</p>` },
  '/terms/': { title: 'Terms of Service | SheetShift', desc: 'The terms for using SheetShift free tools, including no warranty, acceptable use and your responsibility for your data.', h1: 'Terms of Service', body: `<p>Last updated: ${cfg.built}. By using SheetShift you agree to these terms.</p>
<h2>The service</h2><p>SheetShift provides free browser-based tools for working with spreadsheet and structured data files. We may change, add or remove tools at any time.</p>
<h2>Your data and your responsibility</h2><p>You are responsible for the files you process and for having the right to use them. Check results before you rely on them. Keep backups of your original files. Tools such as the Data Anonymizer reduce exposure of data but do not guarantee anonymity or legal compliance.</p>
<h2>Acceptable use</h2><ul><li>Do not use the site to break the law or violate other people's rights.</li><li>Do not attempt to disrupt the site or overload it with automated requests.</li></ul>
<h2>No warranty</h2><p>The tools are provided "as is" and "as available", without warranties of any kind. We do not promise that the tools are error-free, that results are suitable for a particular purpose or that the site will always be available.</p>
<h2>Limitation of liability</h2><p>To the extent allowed by law, SheetShift and its operators are not liable for indirect or consequential loss, or for loss of data, arising from your use of the tools.</p>
<h2>Intellectual property</h2><p>The SheetShift name, design and text belong to the project. Your files and the results you produce remain yours. Open-source libraries keep their own licences.</p>
<h2>Changes and contact</h2><p>We may update these terms and will change the date above. Questions: see the <a href="/contact/">contact page</a>.</p>` }
};
function staticPage(p, s) {
  const bc = crumbs([{ name: 'Home', path: '/' }, { name: s.h1, path: p }]);
  return head({ title: s.title, desc: s.desc, path: p, ld: [bc.ld] }) + header() + `<main id="main" class="wrap article">${bc.html}<h1>${esc(s.h1)}</h1>${s.body}</main>` + footer() + scripts();
}

/* ---------- Build ---------- */
const pages = [];
function add(p, html, meta) { write(p.replace(/\/$/, '') + '/index.html', html); pages.push(Object.assign({ path: p }, meta)); }
write('index.html', homePage()); pages.push({ path: '/', priority: '1.0' });
TOOLS.forEach(t => { add(toolPath(t.slug), toolPage(t), { priority: '0.9' }); });
Object.keys(CATEGORIES).forEach(s => add('/' + s + '/', categoryPage(s), { priority: '0.8' }));
add('/guides/', guidesIndex(), { priority: '0.6' });
GUIDES.forEach(g => add('/guides/' + g.slug + '/', guidePage(g), { priority: '0.7' }));
Object.entries(STATIC).forEach(([p, s]) => add(p, staticPage(p, s), { priority: p === '/how-it-works/' ? '0.6' : '0.4' }));
write('404.html', head({ title: 'Page not found | SheetShift', desc: 'This page does not exist. Browse the SheetShift tools.', path: '/404/', noindex: true }) + header() + `<main id="main" class="wrap article"><h1>Page not found</h1><p class="lead">That page does not exist or has moved.</p><p><a class="btn btn-primary" href="/">Go to all tools</a></p><h2>Popular tools</h2><ul class="related">${['csv-viewer', 'remove-duplicate-rows', 'csv-to-json', 'csv-comparator'].map(s => `<li><a href="${toolPath(s)}">${esc(toolBySlug[s].name)}</a></li>`).join('')}</ul></main>` + footer() + scripts());

// sitemap
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${url(p.path)}</loc><lastmod>${cfg.built}</lastmod><priority>${p.priority || '0.5'}</priority></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${url('/sitemap.xml')}\n`);
write('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/samples/*\n  Cache-Control: public, max-age=86400\n`);
write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0b7a75"/><rect x="6" y="7" width="14" height="14" rx="3" fill="#fff" opacity=".4"/><rect x="11" y="12" width="15" height="15" rx="3" fill="#fff"/><path d="M15 19.5h7m0 0-2.5-2.5M22 19.5l-2.5 2.5" stroke="#0b7a75" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

// assets
fs.mkdirSync(path.join(OUT, 'assets', 'vendor'), { recursive: true });
['style.css', 'core.js', 'runners.js', 'app.js'].forEach(f => { if (fs.existsSync('src/assets/' + f)) fs.copyFileSync('src/assets/' + f, path.join(OUT, 'assets', f)); });
fs.copyFileSync('src/assets/vendor/xlsx.mini.min.js', path.join(OUT, 'assets/vendor/xlsx.mini.min.js'));
if (fs.existsSync('src/static')) fs.readdirSync('src/static').forEach(f => fs.copyFileSync('src/static/' + f, path.join(OUT, f)));
fs.copyFileSync('src/assets/vendor/xlsx-LICENSE.txt', path.join(OUT, 'assets/vendor/xlsx-LICENSE.txt'));
if (fs.existsSync('src/assets/og-image.png')) fs.copyFileSync('src/assets/og-image.png', path.join(OUT, 'assets/og-image.png'));
// samples
fs.mkdirSync(path.join(OUT, 'samples'), { recursive: true });
TOOLS.forEach(t => sampleFiles(t).forEach(s => { if (s.text != null) fs.writeFileSync(path.join(OUT, 'samples', s.name), s.text); }));
try {
  const XLSX = require('xlsx'); const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(C.parseCSV(toolBySlug['excel-to-csv'].sample).rows.map((r, i) => r.map(v => i && /^[\d.]+$/.test(v) ? +v : v))), 'Orders');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['note'], ['Second sheet: pick it in the Worksheet list.']]), 'Notes');
  XLSX.writeFile(wb, path.join(OUT, 'samples/sample-workbook.xlsx'));
} catch (e) { console.warn('xlsx sample skipped', e.message); }

// validation
const titles = {}, descs = {}; let bad = 0;
pages.forEach(p => { const h = fs.readFileSync(path.join(OUT, p.path === '/' ? 'index.html' : p.path.replace(/\/$/, '') + '/index.html'), 'utf8'); const t = /<title>(.*?)<\/title>/.exec(h)[1], d = /name="description" content="(.*?)"/.exec(h)[1]; const h1s = (h.match(/<h1[ >]/g) || []).length;
  if (titles[t]) { console.log('DUP TITLE', p.path); bad++; } titles[t] = 1; if (descs[d]) { console.log('DUP DESC', p.path); bad++; } descs[d] = 1;
  if (h1s !== 1) { console.log('H1 count', h1s, p.path); bad++; } if (t.length > 70) console.log('long title', t.length, p.path); if (d.length > 165) console.log('long desc', d.length, p.path); });
console.log('built', pages.length, 'pages for', cfg.site, bad ? 'PROBLEMS: ' + bad : 'ok');
if (bad) process.exit(1);
