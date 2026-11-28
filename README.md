# SheetShift

Free CSV, Excel and JSON tools that run in the browser. Tagline: Clean. Convert. Compare. Simplify.

All processing is client-side (vanilla JS). Hosting: Cloudflare Pages (free plan). No backend, no paid services.

## Develop
```
npm install
npm test              # unit tests for the data core
npm run build         # writes ./dist (set SITE_URL for canonical URLs)
cd dist && python3 -m http.server 8788
BASE=http://localhost:8788 node test/e2e.js   # browser tests (needs Chrome at /usr/bin/google-chrome)
```

## Layout
- `tools.js`: tool catalogue (content, options, samples, FAQs). One entry = one page.
- `build.js`: static site generator (pages, sitemap, robots, headers, samples).
- `src/assets/core.js`: parsing and data functions. `runners.js`: one runner per tool. `app.js`: UI.
- `docs/`: project documents
  - `qa-report.md` test coverage, results, known gaps
  - `seo-report.md` what was implemented and the measured state
  - `technical-seo-audit.md` crawl, on-page, performance
  - `keyword-research.md` prioritisation matrix (real autocomplete and SERP data only)
  - `keyword-map.md` keyword to URL map, cannibalisation rules
  - `campaign-30-days.md` Phase 8 plan and day map
  - `monetization-readiness.md` AdSense and other options
  - `roadmap-90-days.md`
  - `deployment.md` Cloudflare Pages setup and verification
  - `limitations.md` remaining issues
  - `autocomplete-raw.txt` raw Google autocomplete output

## Environment variables (all optional, set in Cloudflare Pages)
- `SITE_URL` canonical origin, e.g. https://sheetshift.pages.dev
- `GA4_ID` Google Analytics 4 measurement ID (loaded only after cookie consent)
- `GSC_VERIFICATION` Search Console meta verification token
- `BING_VERIFICATION` Bing Webmaster verification token
- `REPO_URL`, `CONTACT_EMAIL` shown on the Contact page

Excel parsing uses SheetJS Community Edition 0.18.5 (Apache-2.0), bundled in `src/assets/vendor/`.
