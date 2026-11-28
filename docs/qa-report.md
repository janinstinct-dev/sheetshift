# SheetShift QA report

Last full run: 27 Nov 2026, 09:08 EET (local build + live site).
Site under test: https://sheetshift-tools.pages.dev
Commit: 77d8635

## What was tested

| Layer | Command | Result |
|---|---|---|
| Data core unit tests | `npm test` (test/core.test.js) | 45 passed, 0 failed |
| Browser end-to-end, local | `BASE=http://localhost:8788 node test/e2e.js` | 102 checks passed, 0 failed |
| Browser end-to-end, live | `BASE=https://sheetshift-tools.pages.dev node test/e2e.js` | 102 checks passed, 0 failed |
| Build | `npm run build` | dist written, no errors |

The end-to-end suite drives a real headless Chrome. For every tool it loads the page,
feeds a sample file through the UI, triggers the action, and asserts the output is
correct (row counts, cell values, header order, encoding, JSON shape). It also checks
that no request leaves the page while a file is being processed.

## Coverage by tool

All 16 tool pages were exercised. Each one: file selection, parse, action, preview,
download, and the empty/invalid-input path.

- CSV Viewer, CSV Cleaner, Remove Duplicate Rows, Remove Empty Rows, Remove Empty Columns
- CSV to JSON, JSON to CSV, Excel to CSV, CSV Delimiter Converter
- CSV Merger, CSV Splitter, CSV Comparator, Column Extractor
- Data Anonymizer, Sort CSV, Filter CSV Rows

Parsing cases covered: comma, semicolon, tab and pipe delimiters; quoted fields with
embedded commas, quotes and newlines; CRLF and LF; UTF-8 with and without BOM;
header-only files; files with ragged rows.

## Site-level checks

- All 32 URLs in sitemap.xml return 200 over HTTPS.
- A non-existent path returns the custom 404 page with a 404 status.
- Canonical tag present and self-referencing on every page.
- robots.txt allows crawling and points to the sitemap.
- Google Search Console verification file served at the site root.
- Cookie consent banner gates the GA4 script; no GA request before consent.
- Contact page shows the published contact address.
- Light and dark mode both render without layout breakage at 360 px, 768 px and 1280 px.

## Not tested / not verified

- Real Safari and Firefox runs. Only Chrome (headless, desktop and mobile emulation)
  was used. The code sticks to standard APIs, but cross-browser behaviour is unverified.
- Very large files. Tests use files up to a few MB. Memory limits for 100 MB+ inputs
  are unknown; everything runs in the tab.
- Accessibility audit with a screen reader. Semantic markup and labels are in place;
  no formal WCAG audit was run.
- Load or abuse testing. Not meaningful for a static site with no backend.

## Defects found during QA and fixed

- Semicolon-delimited files were being split on commas when the file had a `.csv`
  extension. Detection now scores candidate delimiters per line and picks the most
  consistent one.
- Excel date cells were exported as serial numbers. The converter now formats them
  using the cell's number format.
- The comparator reported rows as different when only column order changed. It now
  matches on header names.
