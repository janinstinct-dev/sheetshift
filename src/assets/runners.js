/* SheetShift runners: one function per tool. Shared by the browser UI and the build/test scripts. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.SSRun = factory(root.SSCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  function tbl(rows, extra) { var r = { kind: 'table', rows: rows }; for (var k in extra) r[k] = extra[k]; return r; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function rowsOf(inp) { if (!inp || !inp.rows || !inp.rows.length) throw new Error('The file is empty. Add some data first.'); return inp.rows; }
  function bodyCount(rows, header) { return Math.max(0, rows.length - (header === false ? 0 : 1)); }

  var R = {
    'csv-viewer': function (ins, o) {
      var rows = rowsOf(ins[0]);
      return tbl(rows, { summary: plural(bodyCount(rows), 'data row') + ', ' + plural(rows[0].length, 'column') + '.', viewOnly: true, name: 'viewed.csv' });
    },
    'csv-cleaner': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.clean(rows, o);
      var changed = 0; rows.forEach(function (row, i) { if (r.rows[i]) row.forEach(function (v, j) { if (r.rows[i][j] !== v) changed++; }); });
      return tbl(r.rows, { summary: 'Changed ' + plural(changed, 'cell') + (o.removeEmptyRows ? ', removed ' + plural(r.stats.removedEmptyRows, 'empty row') : '') + '.', name: 'cleaned.csv' });
    },
    'remove-duplicate-rows': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.dedupe(rows, o);
      return tbl(r.rows, { summary: 'Removed ' + plural(r.stats.removed, 'duplicate row') + '. Kept ' + plural(r.stats.kept, 'row') + '.', name: 'deduplicated.csv',
        extraFile: r.removed.length ? { label: 'Download removed rows', name: 'removed-duplicates.csv', rows: [rows[0]].concat(r.removed) } : null });
    },
    'csv-to-json': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.csvToJson(rows, { header: o.header, pretty: o.pretty, types: o.types, format: o.format });
      return { kind: 'text', text: r.text, mime: 'application/json', name: o.format === 'ndjson' ? 'data.ndjson' : 'data.json', summary: 'Converted ' + plural(Array.isArray(r.data) ? r.data.length : 0, 'record') + '.' };
    },
    'json-to-csv': function (ins, o) {
      var text = ins[0] && ins[0].text;
      if (!text || !text.trim()) throw new Error('The input is empty. Paste JSON or choose a .json file.');
      var r = C.jsonToCsv(text, o);
      return tbl(r.rows, { summary: 'Converted ' + plural(r.rows.length - 1, 'record') + ' into ' + plural(r.rows[0].length, 'column') + '.', name: 'data.csv' });
    },
    'excel-to-csv': function (ins, o) {
      var rows = ins[0] && ins[0].rows;
      if (!rows || !rows.length) throw new Error('This sheet is empty.');
      return tbl(rows, { summary: 'Sheet "' + (ins[0].sheet || 'Sheet1') + '": ' + plural(rows.length, 'row') + ', ' + plural(rows[0].length, 'column') + '.', name: C.safeName((ins[0].name || 'sheet').replace(/\.[^.]+$/, '')) + '.csv' });
    },
    'csv-merger': function (ins, o) {
      if (ins.length < 2) throw new Error('Add at least two CSV files to merge.');
      ins.forEach(function (t) { if (!t.rows.length) throw new Error(t.name + ' is empty.'); });
      var r = C.merge(ins, o);
      return tbl(r.rows, { summary: 'Merged ' + plural(r.stats.files, 'file') + ' into ' + plural(r.stats.rows, 'row') + '.', warnings: r.warnings, name: 'merged.csv' });
    },
    'csv-splitter': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.split(rows, o);
      var base = C.safeName((ins[0].name || 'data').replace(/\.[^.]+$/, ''));
      var files = r.parts.map(function (p, i) { return { name: base + '_' + (o.mode === 'column' ? C.safeName(p.label) : String(i + 1).padStart(3, '0')) + '.csv', rows: p.rows }; });
      return { kind: 'multi', files: files, summary: 'Created ' + plural(files.length, 'file') + '.', name: base + '_split.zip' };
    },
    'csv-comparator': function (ins, o) {
      var a = rowsOf(ins[0]), b = rowsOf(ins[1]);
      var r = C.compare(a, b, o);
      return { kind: 'compare', result: r, rows: r.report, name: 'differences.csv', warnings: r.warnings,
        summary: plural(r.onlyA.length, 'row') + ' only in A, ' + plural(r.onlyB.length, 'row') + ' only in B, ' + plural(r.changed.length, 'row') + ' changed, ' + plural(r.same, 'row') + ' identical.' };
    },
    'column-extractor': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.extract(rows, o);
      return tbl(r.rows, { summary: (o.exclude ? 'Removed' : 'Kept') + ' ' + plural(o.exclude ? rows[0].length - r.rows[0].length : r.rows[0].length, 'column') + '.', name: 'columns.csv' });
    },
    'empty-rows-remover': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.removeEmpty(rows, { columns: false });
      return tbl(r.rows, { summary: 'Removed ' + plural(r.stats.removedRows, 'empty row') + '. ' + plural(r.rows.length, 'row') + ' remain.', name: 'no-empty-rows.csv' });
    },
    'remove-empty-columns': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.removeEmpty(rows, { rows: false, columns: true, header: o.header, keepNamedColumns: o.keepNamed });
      return tbl(r.rows, { summary: 'Removed ' + plural(r.stats.removedColumns, 'empty column') + '. ' + plural(r.rows[0] ? r.rows[0].length : 0, 'column') + ' remain.', name: 'no-empty-columns.csv' });
    },
    'data-anonymizer': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.anonymize(rows, o);
      return tbl(r.rows, { summary: 'Anonymized ' + plural(r.columns.length, 'column') + ': ' + r.columns.join(', ') + '.', name: 'anonymized.csv',
        warnings: ['Check the result yourself. Free-text columns, rare combinations of values and unlisted columns can still identify people.'] });
    },
    'sort-csv': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.sortRows(rows, o);
      return tbl(r.rows, { summary: 'Sorted ' + plural(bodyCount(r.rows, o.header), 'row') + ' by ' + o.columns + (o.desc ? ' (Z to A / high to low)' : ' (A to Z / low to high)') + '.', name: 'sorted.csv' });
    },
    'filter-csv-rows': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.filterRows(rows, o);
      return tbl(r.rows, { summary: 'Kept ' + r.stats.matched + ' of ' + plural(r.stats.total, 'row') + '.', name: 'filtered.csv' });
    },
    'rename-csv-columns': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.arrangeColumns(rows, o);
      var warnings = r.missing && r.missing.length ? ['These columns were not found and were skipped: ' + r.missing.join(', ')] : undefined;
      return tbl(r.rows, { summary: 'Output has ' + plural(r.rows[0].length, 'column') + ': ' + r.columns.join(', ') + '.', name: 'columns.csv', warnings: warnings });
    },
    'find-replace-csv': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.findReplace(rows, o);
      return tbl(r.rows, { summary: 'Replaced ' + plural(r.stats.replaced, 'match') + ' in ' + plural(r.stats.cells, 'cell') + '.', name: 'replaced.csv' });
    },
    'transpose-csv': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.transpose(rows);
      return tbl(r.rows, { summary: 'Now ' + plural(r.rows.length, 'row') + ' and ' + plural(r.rows[0].length, 'column') + '.', name: 'transposed.csv' });
    },
    'csv-column-stats': function (ins, o) {
      var rows = rowsOf(ins[0]);
      var r = C.columnStats(rows, o);
      return tbl(r.rows, { summary: 'Summarised ' + plural(r.stats.columns, 'column') + ' over ' + plural(r.stats.rows, 'data row') + '. Numbers only: text cells are counted but not averaged.', name: 'column-summary.csv' });
    },
    'csv-delimiter-converter': function (ins, o) {
      var rows = rowsOf(ins[0]);
      return tbl(rows, { summary: 'Rewrote ' + plural(rows.length, 'row') + ' with a ' + ({ ',': 'comma', ';': 'semicolon', 'tab': 'tab', '|': 'pipe' }[o.outDelimiter || ','] || 'comma') + ' delimiter.', name: 'converted.' + (o.outDelimiter === 'tab' ? 'tsv' : 'csv') });
    }
  };
  return R;
});
