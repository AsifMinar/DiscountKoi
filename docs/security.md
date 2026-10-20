# Security

Discount Koi is a static site: no server, no database, no logins, no cookies. The risks are
untrusted text (scraped pages, feeds, submissions) ending up as code in a visitor's browser, and
the supply chain (dependencies and GitHub Actions). Each protection and where it lives:

## In the browser

| Protection                                                                                                                                                                                                                                    | Where                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Content Security Policy** on every page. Scripts only from this site plus each page's hashed inline scripts; no `unsafe-inline` or `unsafe-eval` for scripts; images from this site or `https:`; no plugins, frames or outside connections. | `scripts/csp-hash.ts`, run by `npm run build` after `next build`                              |
| **Referrer policy** `strict-origin-when-cross-origin`: stores see only "asifminar.github.io", never which page or search you came from. Thumbnails also load with `no-referrer`.                                                              | `src/app/layout.tsx` (`metadata.referrer`), `src/components/DealParts.tsx`                    |
| **Safe outside links**: always `target="_blank" rel="noopener noreferrer"`; affiliate links add `sponsored`.                                                                                                                                  | `externalLinkProps()` in `src/components/ui/Button.tsx` (the only place `_blank` is used)     |
| **No raw HTML**: every deal, product, feed and submitted text is rendered as plain text by React. The project never uses `dangerouslySetInnerHTML`.                                                                                           | all components                                                                                |
| **Links and images checked twice**: http(s) only for links, https only for thumbnails. Once by the scraper, again by the schema when the site is built.                                                                                       | `scraper/lib/text.ts` (`safeUrl`), `shared/deal.ts` (`DealSchema`), `src/lib/deals.server.ts` |
| **URL parameters whitelisted**: filters only accept known values; search text is capped at 100 characters and only ever shown as text.                                                                                                        | `src/lib/filters.ts` (`parseFilters`)                                                         |

## In the data

| Protection                                                                                                                                                                                                                                                                         | Where                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Everything scraped is cleaned**: HTML tags, scripts, entities, control and invisible characters (zero-width, bidi overrides) stripped; lengths capped.                                                                                                                           | `scraper/lib/text.ts` (`cleanText`), `scraper/normalize.ts`                                       |
| **Every deal validated** against one schema before saving, and again at build time. Bad deals are dropped and logged, never shown.                                                                                                                                                 | `shared/deal.ts`, `scraper/pipeline.ts`                                                           |
| **Submissions are never published automatically.** `npm run approve-deal` re-checks every field (HTML stripped, `javascript:`/`data:` links and passwords in links refused, overlong text refused, forged form sections refused), shows you the result, and asks before adding it. | `scraper/submissions.ts`, `scripts/approve-deal.ts`, tests in `scraper/tests/submissions.test.ts` |
| **Personal data isn't copied**: the open-data food program list contains contact phone numbers and emails; they're deliberately left out.                                                                                                                                          | `scraper/sources/sudbury-food-programs.ts`                                                        |
| **Polite, honest scraping**: robots.txt and Crawl-delay obeyed, one identifying user agent, 401/403/429 treated as "blocked" and never worked around, response size capped, gzip bombs capped.                                                                                     | `scraper/lib/http.ts`, `scraper/lib/engine/`                                                      |

## Supply chain and automation

| Protection                                                                                                                                                                                 | Where                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **GitHub Actions pinned to exact commit SHAs**, minimal `permissions`, no stored credentials in checkouts except where the daily job pushes.                                               | `.github/workflows/*.yml`                          |
| **Secrets never in the repo**: `.env*` ignored; affiliate feed URLs only ever come from the `AFFILIATE_FEED_URLS` secret.                                                                  | `.gitignore`, `scraper/sources/affiliate-feeds.ts` |
| **`npm audit`: 0 vulnerabilities.** `braces` (GHSA-vfj7-8cjw-p6xm, no patched release) is removed by pointing ESLint's `fast-glob` at `tinyglobby`, which offers the same `globSync` call. | `package.json` → `overrides`                       |
| **Reproducible installs**: `npm ci` from `package-lock.json` in every workflow.                                                                                                            | `.github/workflows/*.yml`                          |

## Known limits

- **No HTTP security headers.** GitHub Pages can't send custom headers, so the CSP is a `<meta>`
  tag. That means `frame-ancestors` (anti-framing) isn't possible. The site has no logins or
  actions worth clickjacking, so the risk is low. A host like Cloudflare Pages could add real
  headers if that ever matters.
- **`style-src` allows inline styles**: React and the theme switcher set a few. Styles can't run
  code, and scripts stay locked down.
- **`img-src https:`**: thumbnails come from many store domains, so any https image is allowed.
  A CSP can't limit that per element.

## GitHub settings to turn on

Repo **Settings → Code security** (and **Settings → Pages**):

1. **Dependabot alerts**: on. (Alerts only. Don't enable Dependabot _version updates_; they open
   branches and pull requests. There's deliberately no `dependabot.yml`.)
2. **Dependabot security updates**: leave **off**. They also create branches.
3. **Secret scanning**: on.
4. **Push protection**: on. It blocks a push that contains a token or key.
5. **Private vulnerability reporting**: on (lets people report problems privately).
6. **Code scanning (CodeQL) default setup**: optional. It runs on GitHub's side and needs no file
   in the repo.
7. **Pages → Enforce HTTPS**: on.
8. **Actions → General → Workflow permissions**: "Read repository contents" (the workflows ask for
   write only where they need it), and leave "Allow GitHub Actions to create and approve pull
   requests" **unchecked**.
9. **Branches → add a ruleset for `main`** (optional): block force pushes and deletion.
