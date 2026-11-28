/* SheetShift core: pure data functions. No DOM, no network. Works in browsers and Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SSCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Decoding ---------- */
  function decodeBuffer(buf) {
    var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    var enc = 'utf-8';
    if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
      return { text: new TextDecoder('utf-8').decode(u8.subarray(3)), encoding: 'UTF-8 (BOM)' };
    }
    if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xfe) {
      return { text: new TextDecoder('utf-16le').decode(u8.subarray(2)), encoding: 'UTF-16 LE' };
    }
    if (u8.length >= 2 && u8[0] === 0xfe && u8[1] === 0xff) {
      return { text: new TextDecoder('utf-16be').decode(u8.subarray(2)), encoding: 'UTF-16 BE' };
    }
    try {
      return { text: new TextDecoder('utf-8', { fatal: true }).decode(u8), encoding: 'UTF-8' };
    } catch (e) {
      return { text: new TextDecoder('windows-1252').decode(u8), encoding: 'Windows-1252 (fallback)' };
    }
  }

  /* ---------- CSV parsing ---------- */
  var DELIMS = [',', ';', '\t', '|'];

  function detectDelimiter(text) {
    var sample = text.slice(0, 20000);
    var best = ',', bestScore = -1;
    DELIMS.forEach(function (d) {
      var inQ = false, counts = [], c = 0, lines = 0;
      for (var i = 0; i < sample.length && lines < 30; i++) {
        var ch = sample[i];
        if (ch === '"') inQ = !inQ;
        else if (!inQ && ch === d) c++;
        else if (!inQ && (ch === '\n')) { counts.push(c); c = 0; lines++; }
      }
      if (c > 0 || !counts.length) counts.push(c);
      counts = counts.filter(function (n, idx) { return !(idx === counts.length - 1 && n === 0 && counts.length > 1); });
      if (!counts.length) return;
      var first = counts[0];
      if (first === 0) return;
      var consistent = counts.filter(function (n) { return n === first; }).length / counts.length;
      var score = consistent * 100 + Math.min(first, 20);
      if (score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }

  function parseCSV(text, delimiter) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    var delim = (!delimiter || delimiter === 'auto') ? detectDelimiter(text) : (delimiter === 'tab' ? '\t' : delimiter);
    var rows = [], row = [], field = '', inQ = false, i = 0, n = text.length, warnings = [];
    var sawQuoteError = false;
    while (i < n) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') {
        if (field === '') { inQ = true; i++; continue; }
        sawQuoteError = true; field += ch; i++; continue;
      }
      if (ch === delim) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { if (text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    if (inQ) warnings.push('A quoted field was never closed. The rest of the file was read as one field.');
    if (sawQuoteError) warnings.push('Some fields contain stray quotation marks. They were kept as plain text.');
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    // drop a single trailing empty row produced by a final newline is already handled above
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    var ragged = rows.some(function (r) { return r.length !== width; });
    if (ragged) {
      warnings.push('Rows have different numbers of columns. Short rows were padded with empty cells.');
      rows.forEach(function (r) { while (r.length < width) r.push(''); });
    }
    return { rows: rows, delimiter: delim, warnings: warnings };
  }

  function needsQuote(s, delim) {
    return s.indexOf(delim) >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0 || /^\s|\s$/.test(s);
  }
  function toCSV(rows, delimiter, opts) {
    var d = delimiter === 'tab' ? '\t' : (delimiter || ',');
    var eol = (opts && opts.eol) || '\n';
    return rows.map(function (r) {
      return r.map(function (v) {
        var s = v == null ? '' : String(v);
        return needsQuote(s, d) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(d);
    }).join(eol) + (rows.length ? eol : '');
  }

  /* ---------- Helpers ---------- */
  function isEmptyRow(r) { return r.every(function (c) { return String(c == null ? '' : c).trim() === ''; }); }
  function headerNames(rows) {
    var h = rows[0] || [];
    var seen = {};
    return h.map(function (v, i) {
      var name = String(v == null ? '' : v).trim() || ('Column ' + (i + 1));
      if (seen[name] != null) { seen[name]++; name = name + '_' + seen[name]; } else seen[name] = 1;
      return name;
    });
  }
  function resolveColumns(spec, headers) {
    // spec: comma separated names or 1-based indexes or ranges like 2-4
    var out = [], problems = [];
    String(spec || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (tok) {
      var lower = tok.toLowerCase();
      var idx = headers.findIndex(function (h) { return h.toLowerCase() === lower; });
      if (idx >= 0) { out.push(idx); return; }
      var m = /^(\d+)\s*-\s*(\d+)$/.exec(tok);
      if (m) {
        var a = +m[1], b = +m[2];
        if (a >= 1 && b >= a && b <= headers.length) { for (var k = a; k <= b; k++) out.push(k - 1); return; }
      }
      if (/^\d+$/.test(tok) && +tok >= 1 && +tok <= headers.length) { out.push(+tok - 1); return; }
      problems.push(tok);
    });
    return { indexes: out, missing: problems };
  }

  /* ---------- Tools ---------- */
  function clean(rows, o) {
    o = o || {};
    var out = rows.map(function (r, ri) {
      return r.map(function (v) {
        var s = String(v == null ? '' : v);
        if (o.removeControl) s = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\ufeff]/g, '');
        if (o.nbsp) s = s.replace(/\u00a0/g, ' ');
        if (o.collapse) s = s.replace(/[ \t]+/g, ' ');
        if (o.newlines) s = s.replace(/\s*[\r\n]+\s*/g, ' ');
        if (o.trim) s = s.trim();
        if (o.smartQuotes) s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
        if (ri === 0 && o.header !== false) { /* keep header case */ }
        else if (o.caseMode === 'lower') s = s.toLowerCase();
        else if (o.caseMode === 'upper') s = s.toUpperCase();
        else if (o.caseMode === 'title') s = s.toLowerCase().replace(/(^|[\s\-'(])([a-z\u00e0-\u024f])/g, function (_, a, b) { return a + b.toUpperCase(); });
        return s;
      });
    });
    var removedEmpty = 0;
    if (o.removeEmptyRows) {
      var before = out.length;
      out = out.filter(function (r, i) { return i === 0 || !isEmptyRow(r); });
      removedEmpty = before - out.length;
    }
    return { rows: out, stats: { removedEmptyRows: removedEmpty } };
  }

  function dedupe(rows, o) {
    o = o || {};
    var hasHeader = o.header !== false;
    var headers = headerNames(rows);
    var body = hasHeader ? rows.slice(1) : rows.slice();
    var cols = null, missing = [];
    if (o.columns && String(o.columns).trim()) {
      var r = resolveColumns(o.columns, hasHeader ? headers : rows[0].map(function (_, i) { return 'Column ' + (i + 1); }));
      cols = r.indexes; missing = r.missing;
      if (missing.length) throw new Error('Column not found: ' + missing.join(', '));
    }
    var seen = Object.create(null), kept = [], removed = [];
    var order = o.keep === 'last' ? body.slice().reverse() : body;
    order.forEach(function (row) {
      var parts = (cols || row.map(function (_, i) { return i; })).map(function (i) {
        var v = String(row[i] == null ? '' : row[i]);
        if (o.trim !== false) v = v.trim();
        if (o.ignoreCase) v = v.toLowerCase();
        return v;
      });
      var key = JSON.stringify(parts);
      if (seen[key]) removed.push(row); else { seen[key] = 1; kept.push(row); }
    });
    if (o.keep === 'last') kept.reverse();
    return { rows: (hasHeader ? [rows[0]] : []).concat(kept), removed: removed, stats: { removed: removed.length, kept: kept.length } };
  }

  function removeEmpty(rows, o) {
    o = o || {};
    var out = o.rows === false ? rows.slice() : rows.filter(function (r) { return !isEmptyRow(r); });
    var removedRows = rows.length - out.length, removedCols = 0;
    if (o.columns && out.length) {
      var w = out[0].length, keep = [];
      for (var c = 0; c < w; c++) {
        var any = out.some(function (r, i) { return (o.header !== false && i === 0 ? false : String(r[c] == null ? '' : r[c]).trim() !== ''); });
        var headFilled = o.header !== false && String(out[0][c] || '').trim() !== '';
        if (any || (headFilled && o.keepNamedColumns)) keep.push(c);
      }
      removedCols = w - keep.length;
      out = out.map(function (r) { return keep.map(function (c) { return r[c]; }); });
    }
    return { rows: out, stats: { removedRows: removedRows, removedColumns: removedCols } };
  }

  function inferValue(s) {
    var t = String(s).trim();
    if (t === '') return '';
    if (/^(true|false)$/i.test(t)) return t.toLowerCase() === 'true';
    if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(t) && isFinite(+t)) return +t;
    return s;
  }
  function csvToJson(rows, o) {
    o = o || {};
    var hasHeader = o.header !== false;
    if (!rows.length) return { data: [], text: '[]' };
    var headers = hasHeader ? headerNames(rows) : rows[0].map(function (_, i) { return 'column' + (i + 1); });
    var body = hasHeader ? rows.slice(1) : rows;
    var data;
    if (o.format === 'arrays') {
      data = (hasHeader ? [headers] : []).concat(body);
    } else {
      data = body.map(function (r) {
        var obj = {};
        headers.forEach(function (h, i) { var v = r[i] == null ? '' : r[i]; obj[h] = o.types ? inferValue(v) : v; });
        return obj;
      });
    }
    var text;
    if (o.format === 'ndjson') text = data.map(function (x) { return JSON.stringify(x); }).join('\n') + '\n';
    else text = JSON.stringify(data, null, o.pretty === false ? 0 : 2);
    return { data: data, text: text };
  }

  function flatten(obj, prefix, out, sep, arrMode) {
    if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
      var keys = Object.keys(obj);
      if (!keys.length && prefix) out[prefix] = '';
      keys.forEach(function (k) { flatten(obj[k], prefix ? prefix + sep + k : k, out, sep, arrMode); });
    } else if (Array.isArray(obj)) {
      if (arrMode === 'index') obj.forEach(function (v, i) { flatten(v, prefix + sep + i, out, sep, arrMode); });
      else out[prefix] = obj.every(function (v) { return v === null || typeof v !== 'object'; }) ? obj.join('; ') : JSON.stringify(obj);
    } else out[prefix] = obj;
    return out;
  }
  function jsonToCsv(text, o) {
    o = o || {};
    var data;
    text = text.replace(/^\uFEFF/, '').trim();
    if (!text) throw new Error('The input is empty.');
    try { data = JSON.parse(text); }
    catch (e) {
      var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
      try { data = lines.map(function (l) { return JSON.parse(l); }); }
      catch (e2) { throw new Error('This is not valid JSON: ' + e.message); }
    }
    if (!Array.isArray(data)) {
      var arrKey = data && typeof data === 'object' ? Object.keys(data).find(function (k) { return Array.isArray(data[k]) && data[k].length; }) : null;
      if (arrKey) data = data[arrKey]; else if (data && typeof data === 'object') data = [data];
      else throw new Error('Expected a JSON array of objects (or one object).');
    }
    if (!data.length) throw new Error('The JSON array is empty.');
    if (data.every(Array.isArray)) return { rows: data.map(function (r) { return r.map(function (v) { return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v); }); }) };
    var sep = o.separator || '.';
    var flat = data.map(function (item) {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) return { value: Array.isArray(item) ? JSON.stringify(item) : item };
      return o.flatten === false ? Object.keys(item).reduce(function (a, k) { a[k] = (item[k] !== null && typeof item[k] === 'object') ? JSON.stringify(item[k]) : item[k]; return a; }, {}) : flatten(item, '', {}, sep, o.arrays || 'join');
    });
    var keys = [], seen = {};
    flat.forEach(function (f) { Object.keys(f).forEach(function (k) { if (!seen[k]) { seen[k] = 1; keys.push(k); } }); });
    var rows = [keys].concat(flat.map(function (f) { return keys.map(function (k) { var v = f[k]; return v == null ? '' : v; }); }));
    return { rows: rows, stats: { records: flat.length, columns: keys.length } };
  }

  function merge(tables, o) {
    o = o || {};
    // tables: [{name, rows}] first row = header
    if (!tables.length) throw new Error('Add at least two files.');
    var addSource = !!o.addSource;
    if (o.mode === 'position') {
      var hdr = tables[0].rows[0] || [];
      var out = [addSource ? hdr.concat(['source_file']) : hdr.slice()];
      var mismatched = [];
      tables.forEach(function (t, ti) {
        var body = t.rows.slice(ti === 0 ? 1 : (o.skipHeaders === false ? 0 : 1));
        if (t.rows[0] && t.rows[0].length !== hdr.length) mismatched.push(t.name);
        body.forEach(function (r) {
          var row = hdr.map(function (_, i) { return r[i] == null ? '' : r[i]; });
          out.push(addSource ? row.concat([t.name]) : row);
        });
      });
      return { rows: out, stats: { files: tables.length, rows: out.length - 1 }, warnings: mismatched.length ? ['These files have a different number of columns than the first file: ' + mismatched.join(', ')] : [] };
    }
    var all = [], idx = {}, norm = function (h) { return String(h).trim().toLowerCase(); };
    tables.forEach(function (t) {
      headerNames(t.rows).forEach(function (h) { if (idx[norm(h)] == null) { idx[norm(h)] = all.length; all.push(h); } });
    });
    var rows = [addSource ? all.concat(['source_file']) : all.slice()];
    tables.forEach(function (t) {
      var hs = headerNames(t.rows).map(norm);
      t.rows.slice(1).forEach(function (r) {
        var row = all.map(function () { return ''; });
        hs.forEach(function (h, i) { row[idx[h]] = r[i] == null ? '' : r[i]; });
        rows.push(addSource ? row.concat([t.name]) : row);
      });
    });
    return { rows: rows, stats: { files: tables.length, rows: rows.length - 1, columns: all.length }, warnings: [] };
  }

  function split(rows, o) {
    o = o || {};
    var hasHeader = o.header !== false;
    var head = hasHeader ? [rows[0]] : [];
    var body = hasHeader ? rows.slice(1) : rows;
    if (!body.length) throw new Error('There are no data rows to split.');
    var parts = [];
    if (o.mode === 'column') {
      var headers = headerNames(rows);
      var r = resolveColumns(o.column, headers);
      if (!r.indexes.length) throw new Error('Choose a column to split by.');
      var ci = r.indexes[0], groups = {}, order = [];
      body.forEach(function (row) { var k = String(row[ci] == null ? '' : row[ci]); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(row); });
      if (order.length > 500) throw new Error('That column has ' + order.length + ' different values. Pick a column with fewer than 500.');
      order.forEach(function (k) { parts.push({ label: k || 'blank', rows: head.concat(groups[k]) }); });
    } else {
      var size;
      if (o.mode === 'parts') {
        var n = Math.max(1, Math.floor(+o.value || 2));
        size = Math.ceil(body.length / n);
      } else size = Math.max(1, Math.floor(+o.value || 1000));
      for (var i = 0; i < body.length; i += size) parts.push({ label: String(parts.length + 1), rows: head.concat(body.slice(i, i + size)) });
    }
    return { parts: parts };
  }

  function compare(a, b, o) {
    o = o || {};
    var ha = headerNames(a), hb = headerNames(b);
    var keyA = resolveColumns(o.key, ha), keyB = resolveColumns(o.key, hb);
    if (!o.key || !String(o.key).trim()) throw new Error('Enter the key column (a column that identifies each row, like ID or email).');
    if (keyA.missing.length || keyB.missing.length) throw new Error('Key column not found in ' + (keyA.missing.length ? 'file A' : 'file B') + ': ' + (keyA.missing.concat(keyB.missing)).join(', '));
    var common = ha.filter(function (h) { return hb.some(function (x) { return x.toLowerCase() === h.toLowerCase(); }); });
    var norm = function (s) { var v = String(s == null ? '' : s); if (o.trim !== false) v = v.trim(); if (o.ignoreCase) v = v.toLowerCase(); return v; };
    var mk = function (rows, hs, kidx) { var m = Object.create(null), dups = 0, order = []; rows.slice(1).forEach(function (r) { var k = JSON.stringify(kidx.map(function (i) { return norm(r[i]); })); if (m[k]) dups++; else { m[k] = r; order.push(k); } }); return { m: m, dups: dups, order: order }; };
    var A = mk(a, ha, keyA.indexes), B = mk(b, hb, keyB.indexes);
    var onlyA = [], onlyB = [], changed = [], same = 0;
    A.order.forEach(function (k) {
      if (!B.m[k]) { onlyA.push(A.m[k]); return; }
      var ra = A.m[k], rb = B.m[k], diffs = [];
      common.forEach(function (c) {
        var ia = ha.findIndex(function (h) { return h.toLowerCase() === c.toLowerCase(); }), ib = hb.findIndex(function (h) { return h.toLowerCase() === c.toLowerCase(); });
        if (norm(ra[ia]) !== norm(rb[ib])) diffs.push({ column: c, a: ra[ia], b: rb[ib] });
      });
      if (diffs.length) changed.push({ key: keyA.indexes.map(function (i) { return ra[i]; }).join(' / '), diffs: diffs }); else same++;
    });
    B.order.forEach(function (k) { if (!A.m[k]) onlyB.push(B.m[k]); });
    var report = [['status', 'key', 'column', 'file_a_value', 'file_b_value']];
    var keyOf = function (r, hs, kidx) { return kidx.map(function (i) { return r[i]; }).join(' / '); };
    onlyA.forEach(function (r) { report.push(['only_in_A', keyOf(r, ha, keyA.indexes), '', '', '']); });
    onlyB.forEach(function (r) { report.push(['only_in_B', keyOf(r, hb, keyB.indexes), '', '', '']); });
    changed.forEach(function (c) { c.diffs.forEach(function (d) { report.push(['changed', c.key, d.column, d.a, d.b]); }); });
    return { onlyA: onlyA, onlyB: onlyB, changed: changed, same: same, report: report, headersA: ha, headersB: hb,
      warnings: (A.dups || B.dups) ? ['Duplicate keys were found (' + A.dups + ' in A, ' + B.dups + ' in B). Only the first row for each key was compared.'] : [] };
  }

  function extract(rows, o) {
    o = o || {};
    var headers = headerNames(rows);
    var r = resolveColumns(o.columns, headers);
    if (r.missing.length) throw new Error('Column not found: ' + r.missing.join(', '));
    if (!r.indexes.length) throw new Error('Enter at least one column name or number.');
    var idx = r.indexes;
    if (o.exclude) idx = headers.map(function (_, i) { return i; }).filter(function (i) { return r.indexes.indexOf(i) < 0; });
    if (!idx.length) throw new Error('That would remove every column.');
    return { rows: rows.map(function (row) { return idx.map(function (i) { return row[i] == null ? '' : row[i]; }); }), headers: headers };
  }


  function cmpNatural(a, b, numeric) {
    if (numeric) {
      var x = parseFloat(String(a).replace(/[^0-9.\-eE]/g, '')), y = parseFloat(String(b).replace(/[^0-9.\-eE]/g, ''));
      var nx = isNaN(x), ny = isNaN(y);
      if (nx && ny) return 0; if (nx) return 1; if (ny) return -1;
      return x - y;
    }
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }
  function sortRows(rows, o) {
    o = o || {};
    var hasHeader = o.header !== false, headers = headerNames(rows);
    var r = resolveColumns(o.columns, headers);
    if (r.missing.length) throw new Error('Column not found: ' + r.missing.join(', '));
    if (!r.indexes.length) throw new Error('Enter the column to sort by.');
    var body = (hasHeader ? rows.slice(1) : rows.slice()).map(function (row, i) { return { row: row, i: i }; });
    var modes = String(o.types || '').split(',').map(function (s) { return s.trim().toLowerCase(); });
    body.sort(function (a, b) {
      for (var k = 0; k < r.indexes.length; k++) {
        var ci = r.indexes[k];
        var c = cmpNatural(a.row[ci] == null ? '' : a.row[ci], b.row[ci] == null ? '' : b.row[ci], (modes[k] || modes[0]) === 'number' || (modes.length === 1 && o.numeric));
        if (c) return o.desc ? -c : c;
      }
      return a.i - b.i;
    });
    return { rows: (hasHeader ? [rows[0]] : []).concat(body.map(function (x) { return x.row; })) };
  }
  function filterRows(rows, o) {
    o = o || {};
    var hasHeader = o.header !== false, headers = headerNames(rows);
    var r = resolveColumns(o.column, headers);
    if (r.missing.length) throw new Error('Column not found: ' + r.missing.join(', '));
    if (!r.indexes.length) throw new Error('Choose the column to filter on.');
    var ci = r.indexes[0], op = o.op || 'contains', val = String(o.value == null ? '' : o.value);
    var needsVal = op !== 'empty' && op !== 'notempty';
    if (needsVal && val === '') throw new Error('Enter a value to match.');
    var cs = !!o.caseSensitive, re = null;
    if (op === 'regex') { try { re = new RegExp(val, cs ? '' : 'i'); } catch (e) { throw new Error('That regular expression is not valid: ' + e.message); } }
    var num = parseFloat(val);
    if ((op === 'gt' || op === 'lt' || op === 'gte' || op === 'lte') && isNaN(num)) throw new Error('Enter a number to compare with.');
    function test(cell) {
      var c = String(cell == null ? '' : cell), a = cs ? c : c.toLowerCase(), b = cs ? val : val.toLowerCase();
      var n = parseFloat(c.replace(/[^0-9.\-eE]/g, ''));
      switch (op) {
        case 'contains': return a.indexOf(b) >= 0;
        case 'notcontains': return a.indexOf(b) < 0;
        case 'equals': return a.trim() === b.trim();
        case 'notequals': return a.trim() !== b.trim();
        case 'starts': return a.indexOf(b) === 0;
        case 'ends': return b === '' ? true : a.slice(-b.length) === b;
        case 'empty': return c.trim() === '';
        case 'notempty': return c.trim() !== '';
        case 'gt': return !isNaN(n) && n > num;
        case 'gte': return !isNaN(n) && n >= num;
        case 'lt': return !isNaN(n) && n < num;
        case 'lte': return !isNaN(n) && n <= num;
        case 'regex': return re.test(c);
      }
      return false;
    }
    var body = hasHeader ? rows.slice(1) : rows;
    var kept = body.filter(function (row) { return test(row[ci]); });
    return { rows: (hasHeader ? [rows[0]] : []).concat(kept), stats: { matched: kept.length, total: body.length } };
  }

  /* Anonymizer */
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
  function guessSensitive(headers, rows) {
    var out = [];
    headers.forEach(function (h, i) {
      var name = h.toLowerCase();
      var vals = rows.slice(1, 60).map(function (r) { return String(r[i] || '').trim(); }).filter(Boolean);
      var emailShare = vals.length ? vals.filter(function (v) { return EMAIL_RE.test(v); }).length / vals.length : 0;
      var phoneShare = vals.length ? vals.filter(function (v) { return PHONE_RE.test(v) && /\d{7}/.test(v.replace(/\D/g, '')); }).length / vals.length : 0;
      if (/name|email|e-mail|phone|mobile|tel|address|ssn|social|passport|iban|account|card|birth|dob|ip/.test(name) || emailShare > 0.6 || phoneShare > 0.6) out.push(i);
    });
    return out;
  }
  function anonymize(rows, o) {
    o = o || {};
    var headers = headerNames(rows);
    var idx;
    if (o.columns && String(o.columns).trim()) {
      var r = resolveColumns(o.columns, headers);
      if (r.missing.length) throw new Error('Column not found: ' + r.missing.join(', '));
      idx = r.indexes;
    } else idx = guessSensitive(headers, rows);
    if (!idx.length) throw new Error('No sensitive-looking columns were found. Enter the column names to anonymize.');
    var method = o.method || 'pseudonym', maps = {}, counters = {};
    function pseudo(ci, v) {
      var key = v.trim().toLowerCase();
      maps[ci] = maps[ci] || {}; counters[ci] = counters[ci] || 0;
      if (!maps[ci][key]) {
        counters[ci]++;
        var label = headers[ci].replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'value';
        var n = counters[ci];
        if (EMAIL_RE.test(v.trim())) maps[ci][key] = 'user' + n + '@example.com';
        else maps[ci][key] = label + '_' + n;
      }
      return maps[ci][key];
    }
    function mask(v) {
      var s = String(v);
      if (EMAIL_RE.test(s.trim())) { var p = s.trim().split('@'); return p[0].charAt(0) + '***@' + p[1]; }
      var digits = s.replace(/\D/g, '');
      if (digits.length >= 6 && PHONE_RE.test(s.trim())) return s.replace(/\d(?=(?:\D*\d){4})/g, '*');
      if (s.length <= 2) return '*'.repeat(s.length);
      return s.charAt(0) + '*'.repeat(Math.min(s.length - 1, 8));
    }
    var out = rows.map(function (row, ri) {
      if (ri === 0) return row.slice();
      return row.map(function (v, ci) {
        if (idx.indexOf(ci) < 0) return v;
        var s = v == null ? '' : String(v);
        if (s.trim() === '') return s;
        if (method === 'redact') return '[REDACTED]';
        if (method === 'mask') return mask(s);
        return pseudo(ci, s);
      });
    });
    return { rows: out, columns: idx.map(function (i) { return headers[i]; }), method: method };
  }

  /* ---------- Misc ---------- */
  function parseColumnSpec(spec, headers) {
    // tokens: name | name=new | 2 | 2=new. Order of tokens is the output order.
    var out = [], problems = [];
    String(spec || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (tok) {
      var m = /^(.*?)=(.*)$/.exec(tok);
      var key = m ? m[1].trim() : tok;
      var label = m ? m[2].trim() : '';
      var idx = -1;
      if (/^\d+$/.test(key)) { var n = +key; if (n >= 1 && n <= headers.length) idx = n - 1; }
      else idx = headers.findIndex(function (h) { return h.toLowerCase() === key.toLowerCase(); });
      if (idx < 0) { problems.push(key); return; }
      out.push({ index: idx, name: label || headers[idx] });
    });
    return { columns: out, missing: problems };
  }

  function arrangeColumns(rows, o) {
    if (!rows.length) return { rows: [], columns: [], missing: [] };
    var headers = headerNames(rows);
    var plan = parseColumnSpec(o.spec, headers);
    if (!plan.columns.length) throw new Error('Name at least one column to keep, for example: id, name, total');
    var used = {};
    plan.columns.forEach(function (c) { used[c.index] = true; });
    var cols = plan.columns.slice();
    if (o.keepUnmatched !== false) headers.forEach(function (h, i) { if (!used[i]) cols.push({ index: i, name: h }); });
    var hasHeader = o.header !== false;
    var body = hasHeader ? rows.slice(1) : rows;
    var out = [];
    if (hasHeader) out.push(cols.map(function (c) { return c.name; }));
    body.forEach(function (row) { out.push(cols.map(function (c) { return row[c.index] == null ? '' : row[c.index]; })); });
    return { rows: out, columns: cols.map(function (c) { return c.name; }), missing: plan.missing };
  }

  function findReplace(rows, o) {
    var find = o.find == null ? '' : String(o.find);
    if (!find) throw new Error('Type the text to find.');
    var repl = o.replace == null ? '' : String(o.replace);
    var headers = headerNames(rows);
    var idx;
    if (o.columns && String(o.columns).trim()) {
      var res = resolveColumns(o.columns, headers);
      if (!res.indexes.length) throw new Error('None of these columns were found: ' + res.missing.join(', '));
      idx = res.indexes;
    } else idx = headers.map(function (_, i) { return i; });
    var re = null;
    if (o.regex) {
      try { re = new RegExp(find, o.matchCase ? 'g' : 'gi'); }
      catch (e) { throw new Error('That regular expression is not valid: ' + e.message); }
    }
    var hasHeader = o.header !== false;
    var hits = 0, cells = 0;
    var out = rows.map(function (row, ri) {
      var copy = row.slice();
      if (hasHeader && ri === 0) return copy;
      idx.forEach(function (i) {
        var v = copy[i] == null ? '' : String(copy[i]);
        var nv = null;
        if (re) {
          re.lastIndex = 0;
          var after = v.replace(re, repl);
          if (after !== v) { nv = after; hits += 1; }
        } else if (o.wholeCell) {
          var a = o.matchCase ? v : v.toLowerCase();
          var b = o.matchCase ? find : find.toLowerCase();
          if (a === b) { nv = repl; hits += 1; }
        } else {
          var hay = o.matchCase ? v : v.toLowerCase();
          var needle = o.matchCase ? find : find.toLowerCase();
          var pos = 0, acc = '', count = 0, at;
          while ((at = hay.indexOf(needle, pos)) >= 0) {
            acc += v.slice(pos, at) + repl;
            pos = at + needle.length;
            count += 1;
          }
          if (count) { nv = acc + v.slice(pos); hits += count; }
        }
        if (nv !== null) { copy[i] = nv; cells += 1; }
      });
      return copy;
    });
    return { rows: out, stats: { replaced: hits, cells: cells } };
  }

  function transpose(rows) {
    if (!rows.length) return { rows: [] };
    var w = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    var out = [];
    for (var c = 0; c < w; c++) {
      var line = [];
      for (var r = 0; r < rows.length; r++) line.push(rows[r][c] == null ? '' : rows[r][c]);
      out.push(line);
    }
    return { rows: out };
  }

  function toNumber(v) {
    if (v == null) return null;
    var s = String(v).trim().replace(/[\s\u00a0]/g, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
    if (!/^[-+]?(\d+(\.\d+)?|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function columnStats(rows, o) {
    var headers = headerNames(rows);
    var hasHeader = o.header !== false;
    var body = hasHeader ? rows.slice(1) : rows;
    var idx;
    if (o.columns && String(o.columns).trim()) {
      var res = resolveColumns(o.columns, headers);
      if (!res.indexes.length) throw new Error('None of these columns were found: ' + res.missing.join(', '));
      idx = res.indexes;
    } else idx = headers.map(function (_, i) { return i; });
    var out = [['Column', 'Filled cells', 'Numbers', 'Sum', 'Average', 'Minimum', 'Maximum', 'Distinct values']];
    idx.forEach(function (i) {
      var filled = 0, nums = [], seen = {};
      body.forEach(function (row) {
        var v = row[i] == null ? '' : String(row[i]).trim();
        if (v === '') return;
        filled += 1;
        seen[v] = true;
        var n = toNumber(v);
        if (n !== null) nums.push(n);
      });
      var sum = nums.reduce(function (a, b) { return a + b; }, 0);
      var rnd = function (n) { return Math.round(n * 1e6) / 1e6; };
      out.push([headers[i], filled, nums.length,
        nums.length ? rnd(sum) : '',
        nums.length ? rnd(sum / nums.length) : '',
        nums.length ? rnd(Math.min.apply(null, nums)) : '',
        nums.length ? rnd(Math.max.apply(null, nums)) : '',
        Object.keys(seen).length]);
    });
    return { rows: out, stats: { columns: idx.length, rows: body.length } };
  }

  function stats(rows, hasHeader) {
    var body = hasHeader === false ? rows : rows.slice(1);
    return { rows: body.length, columns: rows[0] ? rows[0].length : 0 };
  }

  function safeName(s) { return String(s).replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'file'; }

  /* Minimal ZIP writer (store, no compression) */
  var CRC_TABLE = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xffffffff; for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function makeZip(files) {
    var enc = new TextEncoder(), chunks = [], central = [], offset = 0;
    function u16(n) { return [n & 255, (n >>> 8) & 255]; }
    function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.content), crc = crc32(data);
      var local = [0x50, 0x4b, 3, 4].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      chunks.push(new Uint8Array(local), name, data);
      central.push({ name: name, crc: crc, size: data.length, offset: offset });
      offset += local.length + name.length + data.length;
    });
    var cdStart = offset, cdSize = 0;
    central.forEach(function (c) {
      var h = [0x50, 0x4b, 1, 2].concat(u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset));
      chunks.push(new Uint8Array(h), c.name); cdSize += h.length + c.name.length;
    });
    chunks.push(new Uint8Array([0x50, 0x4b, 5, 6].concat(u16(0), u16(0), u16(central.length), u16(central.length), u32(cdSize), u32(cdStart), u16(0))));
    var total = chunks.reduce(function (s, c) { return s + c.length; }, 0), out = new Uint8Array(total), p = 0;
    chunks.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  return { decodeBuffer: decodeBuffer, detectDelimiter: detectDelimiter, parseCSV: parseCSV, toCSV: toCSV,
    clean: clean, dedupe: dedupe, removeEmpty: removeEmpty, csvToJson: csvToJson, jsonToCsv: jsonToCsv,
    merge: merge, split: split, sortRows: sortRows, filterRows: filterRows, compare: compare, extract: extract, anonymize: anonymize, guessSensitive: guessSensitive,
    headerNames: headerNames, resolveColumns: resolveColumns, stats: stats,
    parseColumnSpec: parseColumnSpec, arrangeColumns: arrangeColumns, findReplace: findReplace, transpose: transpose, columnStats: columnStats, toNumber: toNumber, safeName: safeName, makeZip: makeZip, crc32: crc32, isEmptyRow: isEmptyRow };
});
