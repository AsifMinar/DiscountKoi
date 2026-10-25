# Discount Koi

Every discount, deal and freebie for Sudbury, Ontario (plus Ontario-wide deals), in one calm place:
weekly flyer links, store-by-store product prices, student discounts, and free programs and events.
Visitors can only read: there are no forms and nothing to submit. A scraper refreshes everything every morning (from 6 AM Sudbury time), and the site
is hosted for free on GitHub Pages at **https://asifminar.github.io/DiscountKoi/**.

- Minimal frosted-glass design, light and dark mode, works on any phone.
- Installable like an app (Chrome: "Install"; iPhone Safari: Share → Add to Home Screen).
- No accounts, no cookies, no tracking.

## Run it locally

You need **Node.js 24 or newer**.

```bash
npm install
npm run dev
```

Open **http://localhost:3000/DiscountKoi/**. The `/DiscountKoi` part is there because GitHub Pages
serves the site from that folder, and local development matches it.

### Preview the production build

```bash
npm run build      # writes the static site to /out (and adds the security policy)
npm run preview    # serves /out at http://localhost:4173/DiscountKoi/ (gzipped, like GitHub Pages)
```

### Checks

```bash
npm test             # scraper, products, filters and security tests (no internet needed)
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier (also sorts Tailwind classes)
npm run screenshots  # every page × 9 widths × light/dark, with layout checks (after a build)
npm run lighthouse   # Lighthouse mobile + desktop scores (after a build)
```

`npm run screenshots` saves `screenshots/<page>/<width>-<theme>.png` and `screenshots/report.md`.
It checks for sideways scrolling, touch targets under 44px, clipped text, overlapping controls,
glass panels without blur, and content under the iPhone notch or home bar (emulated at phone
widths). `npm run lighthouse` measures each page 3 times and reports the median. Both folders are
git-ignored.

## Project layout

```
data/
  deals.json             every deal on the site; written by the scraper
  price-history.json     product prices for the last 90 days ("Price drop"); written by the scraper
  flyer-stores.json      Sudbury stores that get a weekly flyer card          ← you edit
  weekly-picks.json      product prices you pick from the flyers each week     ← you edit (npm run add-pick)
  student-discounts.json national student programs                             ← you edit
  affiliate-feeds.json   affiliate product feeds (switched off)                ← you edit once approved
docs/                    affiliate setup, RFD permission email, security notes
shared/                  deal schema (Zod), categories/locations, unit prices, product comparison
scraper/                 the daily scraper: sources/, polite HTTP engine (lib/), pipeline, tests/
src/app/                 pages, sitemap, robots.txt, web app manifest, global styles
src/components/          deal grid, product comparison, popup, navbar, footer, design system (ui/)
src/lib/                 filtering & sorting, URL state, formatting, page metadata, site links
scripts/                 add-pick, preview server, CSP, screenshots, Lighthouse, images
.github/                 daily scrape + deploy workflows
```

### Pages

| URL           | What it shows                                                                   |
| ------------- | ------------------------------------------------------------------------------- |
| `/`           | All deals: search, filters, a "Sudbury deals" section, then everything else     |
| `/products/`  | Search a product and compare every store's price side by side, cheapest first   |
| `/student/`   | Student programs and student deals                                              |
| `/free/`      | Free programs, events and freebies                                              |
| `/about/`     | What Discount Koi is, sources, badges, affiliate links, privacy                 |
| `?deal=<id>`  | On any deal or product page, opens that item's popup. Shareable; Back closes it |
| anything else | Friendly 404 page (`404.html`, which GitHub Pages serves automatically)         |

Also generated at build time: `/deals.json` (the full list the browser filters), `/sitemap.xml`,
`/robots.txt`, `/manifest.webmanifest`, the app icons and the link-preview image.

### How pages load deals

- At build time, the first screen of deals is written straight into the HTML, so the page shows
  deals instantly and search engines can read them.
- The full list is published as `/deals.json`. The browser downloads it right after the page loads
  and does all filtering, searching and sorting locally. No server is involved.
- Filters live in the URL (e.g. `?type=free&cat=grocery&loc=sudbury&sort=newest`), so any filtered
  view can be shared as a link.

## Where the deals come from

Every enabled source was checked: its robots.txt **and** its terms allow this use. A blocked source
is reported as "skipped (blocked)" and never worked around.

| Source (`scraper/sources/`) | What it gives                                                       | Status                                        |
| --------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `flyer-links`               | One card per store per flyer week, linking to the official flyer    | on (no web requests)                          |
| `weekly-picks`              | Product prices you write from the flyers (`data/weekly-picks.json`) | on (no web requests)                          |
| `student-discounts`         | National student programs (`data/student-discounts.json`)           | on (no web requests)                          |
| `sudbury-city-news`         | City of Greater Sudbury news releases about free things (RSS)       | on                                            |
| `downtown-sudbury`          | Downtown Sudbury BIA specials (schema.org structured data)          | on (none published yet)                       |
| `sudbury-food-programs`     | Food banks, meal programs, Good Food Box (City open data, CSV)      | on                                            |
| `ontario-parks`             | Ontario Parks blog posts about free days (RSS)                      | on                                            |
| `itch-sales`                | itch.io game sales (official RSS)                                   | on                                            |
| `affiliate-feeds`           | Discounted products from affiliate networks                         | **off**: see `docs/affiliate-setup.md`        |
| `rfd-hot-deals`             | RedFlagDeals Hot Deals forum titles and links                       | **off**: see `docs/rfd-permission-request.md` |

## Weekly product picks

Short, factual product prices you take from the official Sudbury flyers each week, in your own
words, each linking to the flyer. They power the **Products** page and also show as deal cards.

**Easiest:** run

```bash
npm run add-pick
```

It asks for the store, product, price, whether it's per package or per lb/kg/100 g, the size, the
regular price and the flyer dates (suggested for you). It checks everything, saves it to
`data/weekly-picks.json`, and updates `data/deals.json`. Commit and push both files.

**By hand:** copy the `_example` in `data/weekly-picks.json` into `picks`, edit it, then run
`npm run scrape:local` (or just push; the deploy merges hand-edited files too).

```json
{
  "productName": "Chicken breast, boneless skinless",
  "store": "No Frills",
  "salePrice": 3.99,
  "unit": "lb",
  "originalPrice": 5.99,
  "startDate": "2026-10-22",
  "endDate": "2026-10-28"
}
```

- Sold by weight (e.g. $3.99/lb): set `unit` (`lb`, `kg`, `100g`, `L`, `100mL`, `each`) and no size.
- Sold by package (e.g. $5.49 for 4 L): set `size` (`"4 L"`, `"400 g"`, `"dozen"`, `"12 x 355 mL"`).
  The unit price ($1.37/L) is worked out for you.
- `url` defaults to the store's flyer link in `data/flyer-stores.json`.
- Entries with `"source": "sample"` are examples, labelled **Sample** on the site and never
  recorded in price history. They're kept off the main deal grids. **Delete them** once you add
  real picks (they also expire on their own after Oct 28, 2026).

### Product comparison and badges

- Listings with the same product name are grouped (plurals and punctuation don't matter), and each
  store's price is shown side by side, **cheapest per unit first**, in the unit most of them use
  (e.g. $9.90/kg is shown as $4.49/lb next to $3.99/lb).
- **Lowest price in Sudbury this week**: the cheapest of 2 or more Sudbury stores listing it.
  Worked out every time the site is built.
- **Price drop**: cheaper than the last time the same store listed it, from
  `data/price-history.json` (one entry per product, store and flyer week, kept for 90 days). Unit
  prices are compared, so a smaller package at the same price isn't a "drop".

## Student discounts

`data/student-discounts.json` lists well-known national programs (SPC, ISIC, UNiDAYS, Student
Beans, Prime Student, Spotify, Apple, YouTube, Microsoft 365, GitHub, JetBrains, Figma, Notion,
Adobe, Dell), each linking to its official page. They never expire on their own. Edit the file and
run `npm run scrape:local` (or push). Only add programs you've checked on their official page.

## Run the scraper manually

```bash
npm run scrape                       # run every source and update data/deals.json
npm run scrape -- --dry-run          # run everything, print the summary, change nothing
npm run scrape -- --only=<source-id> # run one source; the others keep their current deals
npm run scrape:local                 # only the sources that read files in this repo (no web requests)
```

`scrape:local` doesn't change "Last updated", so the 6 AM run still happens that day.

At the end you get a summary like this (also shown on the GitHub Actions run page):

```
Source                        Status                        Deals  New  Removed  Invalid
----------------------------  ----------------------------  -----  ---  -------  -------
Weekly flyer links            ok                            9      +9   -9       0
City of Greater Sudbury news  ok                            2      +1   -0       0
Some site                     skipped (blocked)             0      +0   -0       0
Another one                   failed, kept 40 from last run 40     +0   -0       0
```

- **ok**: fresh deals saved.
- **failed, kept N from last run**: something broke (site down, layout changed). Yesterday's deals
  from that source stay up, so one broken source never empties the site.
- **skipped (blocked)**: the site's robots.txt says no, or it answered 401/403/429.
- **Invalid**: deals dropped because they failed validation (e.g. a `javascript:` link). The reasons
  are listed under the table.

### How the scraper stays polite and reliable

Every request goes through `scraper/lib/http.ts` and `scraper/lib/engine/`:

- robots.txt is read first (redirect targets too) and its **Crawl-delay** is honoured;
- a per-site queue waits 2–3 seconds between requests to the same site, with at most 2 sites at once;
- one honest user agent: `DiscountKoiBot/1.0 (+https://github.com/AsifMinar/DiscountKoi)`;
- network errors and 5xx answers are retried with exponential backoff; `Retry-After` is honoured;
  401/403/429 mean "blocked" and are never retried or worked around;
- unchanged pages come back as tiny `304 Not Modified` thanks to an ETag / Last-Modified cache
  (`.cache/`, kept between daily runs by the workflow);
- timeouts, a 5 MB size cap, and clear timestamped logs.

Sources read **structured data** where they can (`scraper/lib/structured.ts`: schema.org JSON-LD
Product/Offer/Event and Open Graph tags), RSS/Atom (`lib/feeds.ts`) and CSV (`lib/csv.ts`), which
are far sturdier than CSS selectors. There's no headless browser: a site that only works with
JavaScript usually has a feed or JSON-LD to read instead.

### What happens to every deal

`scraper/normalize.ts` strips all HTML from scraped text, rejects any link that isn't `http(s)`,
works out the discount % and unit price, detects **Free** and **Student** deals, picks a category,
gives it a stable id, and validates it with the Zod schema in `shared/deal.ts`. Then
`scraper/pipeline.ts` removes expired deals, deals with no end date after 14 days (7 for freebies;
ongoing programs never), and duplicates, and `scraper/price-history.ts` updates the price history.

## Add a new scraper source

1. Check the site's robots.txt **and** terms of use allow it. If not, don't build it (or build it
   switched off and ask for permission, like `rfd-hot-deals`).
2. Create `scraper/sources/my-source.ts`:

   ```ts
   import { extractJsonLd } from "../lib/structured";
   import type { Source } from "./types";

   export const mySource: Source = {
     id: "my-source", // permanent; saved on every deal
     name: "My Source",
     enabled: true,
     async fetchDeals({ http }) {
       const page = await http.fetch("https://example.com/deals", "text/html"); // polite fetch
       return extractJsonLd(page.body, page.url)
         .filter((item) => item.name && item.url)
         .map((item) => ({
           title: item.name!,
           url: item.url!,
           store: "Example Store",
           location: "ontario", // "sudbury" | "ontario" | "ships-to-ontario"
           salePrice: item.price,
           originalPrice: item.originalPrice,
           endDate: item.validThrough,
         }));
     },
   };
   ```

   Only `title`, `url`, `store` and `location` are required; see `scraper/sources/types.ts` for
   the rest (including product fields like `productName`, `size` and `unit`).

3. Add it to the list in `scraper/sources/index.ts`.
4. Try it: `npm run scrape -- --only=my-source --dry-run`, and add a test in `scraper/tests/`.

If a source throws, the run carries on and that source's previous deals are kept.

## Edit categories, free/student detection and timing

| What                                  | Where                                                         |
| ------------------------------------- | ------------------------------------------------------------- |
| Category keyword rules                | `scraper/categorize.ts` → `CATEGORY_RULES` (first match wins) |
| Category fallback per store           | `scraper/categorize.ts` → `STORE_DEFAULTS`                    |
| Words that mark a deal Free / Student | `scraper/detect.ts`                                           |
| 14-day / 7-day expiry, request delays | `scraper/config.ts`                                           |
| Category names shown on the site      | `shared/taxonomy.ts` (change `label` only, never `id`)        |
| Units and unit-price rules            | `shared/units.ts`                                             |

## Edit the weekly flyer stores

`data/flyer-stores.json` lists the Sudbury stores that get a weekly flyer card. Each card links to
the store's official flyer and is titled with that week's dates (e.g. "No Frills weekly flyer · Oct
22–28"). Nothing is copied from the flyer itself, and no website is contacted to make the cards.

```json
{
  "store": "No Frills",
  "url": "https://www.nofrills.ca/en/deals/flyer",
  "startsOn": "thu",
  "label": "weekly flyer",
  "category": "grocery"
}
```

`startsOn` is the weekday a new flyer begins (`mon` … `sun`); the card runs until the day before the
next one.

> **Why links instead of scraped flyer prices?** The flyer sites' terms (Flipp, which hosts most
> Canadian flyers, and each chain's own site) forbid copying or republishing their content, so
> Discount Koi links to the flyers, and product prices are short listings you write yourself.

## Daily automatic updates

`.github/workflows/daily-scrape.yml` runs the scraper every morning from **6 AM Sudbury time**,
commits `data/deals.json` and `data/price-history.json` to `main` (as "Asif Minar"), then rebuilds
and publishes the site.

- **Timing:** GitHub's schedule runs in UTC, and Sudbury switches between EDT and EST, so the
  workflow wakes at 10:00 and 11:00 UTC (plus a 16:00 UTC backup). `scraper/time-gate.ts` lets
  exactly one through: it must be 6 AM or later in Sudbury and the scraper must not have run yet
  that day. GitHub often starts scheduled runs hours late (9–11 AM Sudbury time is common), so the
  first one to arrive after 6 AM does the scrape, and "Last updated" shows when that was. The
  skipped runs finish green in a few seconds.
- **Run it now:** Actions tab → **Daily scrape** → **Run workflow**. Manual runs skip the time check.
- **Failures email you:** the run turns red (and GitHub emails you) if the scrape finds 0 deals or
  every source fails. Nothing is saved in that case, so the site keeps yesterday's deals.
- **Results:** open a run and scroll to the summary: deals, new, removed and invalid per source.
- **Stays switched on:** GitHub pauses scheduled workflows after 60 days without repository
  activity. Every run changes `updatedAt`, so every run makes a commit and the schedule stays alive.
- **Speed:** `node_modules` and the scraper's page cache are kept between runs.

## Deploy to GitHub Pages

Every push to `main` runs `.github/workflows/deploy.yml`, which merges hand-edited data files
(`npm run scrape:local`, no web requests), builds the static site and publishes it.

### One-time setup

1. On GitHub, open the repository → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**, and tick **Enforce HTTPS**.

If this isn't set, the deploy fails at the step "Check that GitHub Pages is turned on".

### Publishing a change

```bash
git add -A
git commit -m "Describe what you changed"
git push
```

Then open the **Actions** tab on GitHub to watch "Deploy to GitHub Pages" run (about 1–2 minutes).

### Good to know

- The base path `/DiscountKoi` is set in `next.config.ts` and must match the repository name
  exactly (capital letters included). If you rename the repo or move to a custom domain, change it
  there and `SITE_ORIGIN` in `src/lib/site.ts`.
- `public/.nojekyll` tells GitHub Pages not to run Jekyll, which would otherwise hide the `_next`
  folder that holds the site's scripts.
- All workflow actions are pinned to exact commit SHAs (with the version in a comment) so a
  compromised or changed action can't sneak into your builds.

## Search engines, link previews and installing

- Every page has its own title and description (mentioning Sudbury), a canonical URL, and Open
  Graph / Twitter tags. Shared links show the 1200×630 preview image `public/og-image.png`.
- `/sitemap.xml` lists every page. `/robots.txt` allows everything and points to the sitemap. (Search
  engines only read robots.txt at a domain's root, so also submit
  `https://asifminar.github.io/DiscountKoi/sitemap.xml` in Google Search Console.)
- `/manifest.webmanifest` plus the icons in `public/icons/` and `src/app/apple-icon.png` make the
  site installable. To redraw the preview image and icons from the logo: `npm run build && npm run make-images`.

## Security

A strict Content Security Policy on every page (hashed inline scripts, no `unsafe-inline` or
`unsafe-eval` for scripts), a strict referrer policy, safe outside links, plain-text rendering of
all scraped data, and `npm audit` at 0. Details, and the GitHub settings to turn on,
are in [docs/security.md](docs/security.md).
