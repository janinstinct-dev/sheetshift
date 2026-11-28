# Keyword research and prioritisation

Date: 27-28 Nov 2026. Sources: Google autocomplete (captured 27 Nov, raw output in
`docs/autocomplete-raw.txt`), a top-10 SERP read for four seed queries (28 Nov),
Google Search Console and Bing Webmaster for our own site.

## What this document does not contain

No search volumes, no keyword difficulty scores, no traffic estimates. There is no free
source that gives real numbers for those, and inventing them would make every later
decision wrong. Search Console has no query data yet (the site is not indexed), so our
own impressions and clicks are zero rather than unknown.

What is real here: the exact suggestion strings Google returned, whether a query appears
in autocomplete at all (a signal that people type it), and what the top 10 results for a
query actually are.

## Observed SERP shape (28 Nov)

Four seed queries, top 10 each:

| Query | What the top 10 is made of |
|---|---|
| csv to json converter online free | 10 of 10 are dedicated single-purpose converters on small sites. Several lead with "no upload" / "private" in the title. |
| compare two csv files for differences online | 10 of 10 are dedicated CSV diff tools. Half promise cell-level highlighting. |
| remove duplicate rows csv online | 10 of 10 are dedicated dedupe tools, several covering Excel and JSON too. |
| csv viewer online | 10 of 10 are viewers; two are editors as well. |

Read: these are not dominated by large brands, but each query has ten small sites
already aimed at it. A new page wins only if it is better in a way a visitor can see
quickly, or if it targets a phrasing the ten are not using. "No upload" is now table
stakes rather than a differentiator.

## Prioritisation matrix

Priority reflects how well the query matches a tool we already ship and how the SERP
looks. "Autocomplete" means the phrase appeared in Google's suggestions when typed on
27 Nov.

| # | Query cluster | Autocomplete | Existing page | Intent match | SERP read | Priority |
|---|---|---|---|---|---|---|
| 1 | csv to json / csv to json converter online | yes (10 variants) | /tools/csv-to-json/ | exact | 10 dedicated tools | P1 |
| 2 | json to csv / json to csv converter free | yes (10 variants) | /tools/json-to-csv/ | exact | mixed, weaker than above | P1 |
| 3 | compare two csv files for differences | yes (10 variants) | /tools/csv-comparator/ | exact | 10 diff tools | P1 |
| 4 | remove duplicate rows csv / remove duplicate lines csv | yes | /tools/remove-duplicate-rows/ | exact | 10 dedupe tools | P1 |
| 5 | excel to csv / excel to csv converter free | yes (10 variants) | /tools/excel-to-csv/ | exact | converter-heavy, brand-light | P1 |
| 6 | csv viewer online / csv reader online | yes (10 variants) | /tools/csv-viewer/ | exact | 10 viewers | P1 |
| 7 | merge csv files / merge csv files online free | yes (10 variants) | /tools/csv-merger/ | exact | mixed | P2 |
| 8 | split csv file into multiple files | yes (10 variants) | /tools/csv-splitter/ | exact | thin results | P2 |
| 9 | sort csv by column / sort csv online | yes | /tools/sort-csv/ | exact | generic | P2 |
| 10 | filter csv by column value / filter csv online | yes | /tools/filter-csv-rows/ | exact | generic | P2 |
| 11 | remove empty rows csv / remove empty lines from csv | yes | /tools/empty-rows-remover/ | exact | thin | P2 |
| 12 | remove empty columns csv | yes (4 variants) | /tools/remove-empty-columns/ | exact | very thin | P2 |
| 13 | extract columns from csv / extract column from csv online | yes (10 variants) | /tools/column-extractor/ | exact | scripting-heavy results | P2 |
| 14 | change csv delimiter / csv semicolon to comma | yes (10 variants) | /tools/csv-delimiter-converter/ | exact | Excel-heavy | P2 |
| 15 | clean csv file online / clean csv data | yes (10 variants) | /tools/csv-cleaner/ + /data-cleaning/ | broad | mixed | P2 |
| 16 | anonymize csv / anonymize csv data | yes (2 variants) | /tools/data-anonymizer/ | exact, low volume signal (only 2 suggestions) | very thin | P3 |
| 17 | how to compare two spreadsheets | not typed | /guides/how-to-compare-two-spreadsheets/ | informational | guide results | P2 |
| 18 | how to clean a messy csv file | not typed | /guides/how-to-clean-a-messy-csv-file/ | informational | guide results | P2 |
| 19 | why does csv show weird characters | not typed | /guides/why-csv-shows-weird-characters/ | informational | forum-heavy | P3 |
| 20 | csv to json python / json to csv python | yes | no page | wrong intent for us | developer docs own it | skip |

Notes on the skipped row: "csv to json python" and similar are among the strongest
autocomplete variants, but the searcher wants code, not a web tool. A page aimed at it
would either be a doorway page or a tutorial that duplicates the guide section. The
honest move is to mention the code path inside the tool page's FAQ, not to build a page
for it.

## Cluster logic

Three clusters carry the site: conversion (CSV/JSON/Excel), cleaning (dedupe, empty rows,
delimiter, anonymise), comparison (diff, merge, split). Category pages exist for all
three plus viewers and sorting/filtering. Each cluster page links down to its tools and
each tool links back up, so link equity flows to the pages with the exact-intent match.

## What would change this ranking

Search Console query data once the site is indexed. The first 4-6 weeks of impressions
will show which phrasings we actually appear for, and the matrix should be re-sorted
from that data rather than from autocomplete. Until then, this matrix is a hypothesis
built on observed suggestions, and it is labelled as one.
