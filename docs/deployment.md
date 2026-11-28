# Deployment

## What runs it

- Host: Cloudflare Pages, free plan. Project name `sheetshift-tools`.
- Repo: https://github.com/janinstinct-dev/sheetshift (branch `main`).
- Build command: `npm run build`. Output directory: `dist`.
- Pushing to `main` triggers a build and deploy automatically.

## Environment variables (Cloudflare Pages > Settings > Environment variables)

| Name | Purpose |
|---|---|
| `SITE_URL` | Canonical origin, `https://sheetshift-tools.pages.dev` |
| `CONTACT_EMAIL` | Address shown on the Contact page |
| `REPO_URL` | Source link in the footer |
| `GA4_ID` | GA4 measurement ID, loaded only after cookie consent |
| `GSC_VERIFICATION` | Search Console meta token (optional; a verification file is also in `src/static/`) |
| `BING_VERIFICATION` | Bing Webmaster meta token (optional) |

All are optional at build time. Without `SITE_URL` the build falls back to a default
origin, which would put wrong absolute URLs in the sitemap and canonicals, so set it
in production.

## Deploy from scratch

1. Fork or clone the repo.
2. Create a Cloudflare Pages project connected to the repo.
3. Set the build command, output directory and the variables above.
4. Deploy. The first build produces `dist` with all 32 pages.
5. Point a custom domain at the project if you have one, then set `SITE_URL` to it and
   redeploy so canonicals and the sitemap follow the new origin.

## Manual deploy without Git

```
npm install
SITE_URL=https://your-domain npm run build
npx wrangler pages deploy dist --project-name sheetshift-tools
```

## Verify a deploy

```
BASE=https://sheetshift-tools.pages.dev node test/e2e.js
curl -s https://sheetshift-tools.pages.dev/sitemap.xml | grep -c '<loc>'
```

Expect 122 passing checks and 37 URLs.

## Rolling back

Cloudflare Pages keeps every deployment. Pick an earlier one in the dashboard and
"Rollback to this deployment"; no rebuild is needed.

## Cost

Cloudflare Pages free plan: unlimited static requests and 500 builds per month, no
card required. GitHub free plan. No other service is used at runtime.
