# Keyword to URL map

One primary intent per URL. No two pages target the same query cluster, so there is no
cannibalisation: when a page covers a neighbouring term it does so as a section, and the
canonical stays on the owning page.

| URL | Primary target | Secondary (on-page sections) | Do not target here |
|---|---|---|---|
| / | brand: sheetshift, free csv tools | "csv tools online free", "spreadsheet tools no upload" | any single tool query |
| /csv-tools/ | csv tools | "free csv editor online" (as a hub, not a tool claim) | csv viewer (owned by tool page) |
| /excel-tools/ | excel tools, xlsx tools | "excel to csv" only as a link, not as a target | excel to csv (tool page) |
| /json-tools/ | json tools | "json formatter" is not ours | csv to json (tool page) |
| /data-cleaning/ | data cleaning tools, clean csv | "clean messy data" | clean csv file (tool page + guide) |
| /data-comparison/ | data comparison tools, compare data files | "diff two tables" | compare two csv files (tool page) |
| /data-conversion/ | data conversion tools, convert data files | "convert csv json excel" | each converter (tool pages) |
| /tools/csv-to-json/ | csv to json, csv to json converter online | "csv to json array", "csv to json with headers" | json to csv |
| /tools/json-to-csv/ | json to csv, json to csv converter free | "json array to csv", "nested json to csv" | csv to json |
| /tools/excel-to-csv/ | excel to csv, xlsx to csv converter | "excel to csv without excel", "convert xlsx online" | csv to excel (not built) |
| /tools/csv-viewer/ | csv viewer online, csv reader | "open csv file online", "view large csv" | csv editor (not built) |
| /tools/csv-cleaner/ | clean csv file, csv cleaner online | "fix csv formatting", "trim whitespace csv" | remove duplicates (own page) |
| /tools/remove-duplicate-rows/ | remove duplicate rows csv, remove duplicate lines csv | "dedupe csv", "remove duplicates keeping first" | remove empty rows |
| /tools/empty-rows-remover/ | remove empty rows csv, remove blank lines csv | "remove empty lines from csv" | empty columns |
| /tools/remove-empty-columns/ | remove empty columns csv | "drop blank columns" | empty rows |
| /tools/csv-comparator/ | compare two csv files for differences | "csv diff", "highlight differences csv" | compare spreadsheets guide |
| /tools/csv-merger/ | merge csv files, combine csv files | "merge csv with same headers" | split csv |
| /tools/csv-splitter/ | split csv file into multiple files | "split csv by column", "split csv in half" | merge csv |
| /tools/column-extractor/ | extract columns from csv | "keep only certain columns csv" | filter rows |
| /tools/sort-csv/ | sort csv by column, sort csv online | "sort csv numerically" | filter csv |
| /tools/filter-csv-rows/ | filter csv by column value, filter csv online | "filter csv with multiple conditions" | sort csv |
| /tools/csv-delimiter-converter/ | change csv delimiter, csv semicolon to comma | "csv tab to comma", "pipe delimited to csv" | general conversion |
| /tools/data-anonymizer/ | anonymize csv, anonymize csv data | "mask names in csv", "replace emails in csv" | compliance advice |
| /guides/how-to-clean-a-messy-csv-file/ | how to clean a messy csv file | "csv cleanup steps" | csv cleaner tool query |
| /guides/how-to-compare-two-spreadsheets/ | how to compare two spreadsheets | "compare excel sheets" | csv comparator tool query |
| /guides/why-csv-shows-weird-characters/ | csv weird characters, csv encoding issue | "csv shows Ã©", "utf-8 bom csv" | tool queries |
| /tools/rename-csv-columns/ | rename columns in csv, reorder csv columns | "delete a column from csv", "rename csv header" | column extraction |
| /tools/find-replace-csv/ | find and replace in csv | "replace text in csv column", "bulk edit csv" | cleaning rules (csv-cleaner) |
| /tools/transpose-csv/ | transpose csv | "swap rows and columns csv", "rows to columns" | delimiter conversion |
| /tools/csv-column-stats/ | sum a column in csv | "average of a csv column", "count distinct values csv" | comparison (csv-comparator) |
| /guides/how-to-open-a-large-csv-file/ | csv too large for excel | "open big csv", "csv row limit excel" | splitting tool query |
| /about/, /contact/, /privacy/, /terms/, /how-it-works/ | brand and trust queries | none | nothing commercial |

## Rules that keep this map clean

1. A new page may only be added if it owns a cluster that no row above owns. A page that
   restates an existing tool's intent in different words is a doorway page and is not
   built.
2. When a tool page and a guide could target the same phrase, the tool page takes the
   transactional phrasing and the guide takes the "how to" phrasing, and each links to
   the other once.
3. Titles are written from this table. If a title would overlap another row, the row
   is wrong, not the title.
4. Category pages never claim to be a tool. They describe the group and link down.
