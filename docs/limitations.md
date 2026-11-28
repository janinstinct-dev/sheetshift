# Remaining issues and limitations

State: 28 Nov 2026.

## Product limits

1. Everything runs in the browser tab. Files are held in memory, so a file near the
   tab's memory limit (commonly a few hundred MB of text) will fail. The UI catches
   the failure and shows an error rather than freezing, but it cannot process it.
2. Excel support covers `.xlsx` and `.xls` read paths through SheetJS. Formulas are
   read as their cached values; SheetShift does not recalculate them.
3. Only the first sheet of a workbook is converted. Multi-sheet selection is not built.
4. CSV parsing follows RFC 4180 plus common leniency. Files with broken quoting
   (an unclosed quote mid-file) are reported as an error instead of guessed at.
5. Encoding: UTF-8, UTF-16 and Latin-1 are detected. Other legacy encodings may come
   out garbled; the guide on weird characters explains what to do.
6. No file is ever uploaded, so there is no server-side processing, no history, and no
   saved projects. Every session starts empty.
7. The Data Anonymizer replaces values with stable tokens per session. It does not
   claim to be irreversible: the mapping stays in the tab's memory until it is closed.

## Known gaps

- Cross-browser testing is Chrome-only so far.
- No formal accessibility audit.
- Search Console has not yet indexed any page, so there is no impression or query data.
  Bing has crawled the sitemap but no ranking data has been reviewed yet.
- GA4 has no data yet; collection started 27 Nov and reporting can lag up to 48 hours.
- No accounts, so no saved settings between visits. Theme choice is stored locally.

## Not claimed

The site does not claim SOC 2, ISO 27001, GDPR certification, "military-grade
encryption", or an uptime guarantee. The privacy page states what is true: files are
read locally in the browser, nothing is uploaded, and analytics is off until consent.
