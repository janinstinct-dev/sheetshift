# Technical SEO audit

Date: 27 Nov 2026. Site: https://sheetshift-tools.pages.dev

## Crawlability and indexing

| Item | State |
|---|---|
| robots.txt | Present, allows all, declares the sitemap |
| sitemap.xml | Present, 32 URLs, all absolute, all returning 200 |
| Canonical tags | Self-referencing on all 32 pages |
| HTTPS | Enforced by Cloudflare; HTTP redirects to HTTPS |
| Trailing slashes | Directory URLs with a trailing slash, consistent in sitemap and internal links |
| 404 | Custom page, returns a real 404 status |
| Redirects | None in use; no chains |
| Pagination / faceted URLs | None; every page is a static document |

## On-page

- One `<h1>` per page, matching the page's primary intent.
- Unique `<title>` and meta description per page.
- Descriptive internal links between tool pages, category pages and guides.
- Structured data: `SoftwareApplication` on tool pages, `FAQPage` where the page has
  a real FAQ, `BreadcrumbList` on tool and category pages, `Organization` on the home page.
- Images: SVG icons inline; the Open Graph image is a PNG with explicit dimensions.
- Language: `lang="en"`, English-only site as specified.

## Performance

- No web fonts; system font stack.
- One small CSS file and one JS bundle, both static and cached by Cloudflare.
- Third-party scripts: none before consent. GA4 loads only after the visitor accepts.
- SheetJS is bundled locally rather than loaded from a CDN, so there is no third-party
  request and no third-party cookie.

## Internationalisation

English only by design. `hreflang` is deliberately absent. If other languages are
added later, `hreflang` and per-language canonicals must be added at the same time.

## Open technical items

- Search Console: property verified, sitemap submitted, homepage still
  "URL is unknown to Google" at the time of writing. Request Indexing hit the daily
  quota and needs a retry.
- Bing Webmaster: sitemap imported and processed, 32 URLs discovered, 0 errors.
- Core Web Vitals: no field data yet (no traffic). Lab numbers were not measured with
  Lighthouse in this environment; the page weight and request count are low by
  inspection, not by measurement.
