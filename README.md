# Discount Koi

Every discount, deal and freebie for Sudbury, Ontario (plus Ontario-wide deals), in one calm place.
A scraper refreshes the deals every morning at 6 AM Sudbury time, and the site is hosted for free on
GitHub Pages.

> This README grows with each build phase. Sections marked _(coming)_ arrive in later phases.

## Run it locally

You need **Node.js 24 or newer**.

```bash
npm install
npm run dev
```

Open **http://localhost:3000/discount-koi/**. The `/discount-koi` part is there because GitHub Pages
serves the site from that folder, and local development matches it.

### Preview the production build

```bash
npm run build      # writes the static site to /out
npm run preview    # serves /out at http://localhost:4173/discount-koi/
```

### Code quality

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier (also sorts Tailwind classes)
```

## Project layout

```
data/deals.json     all deals ({ updatedAt, deals: [...] }); written by the scraper
shared/             deal schema (Zod) and the category / deal type / location lists
src/app/            pages (App Router) and global styles (design tokens live in globals.css)
src/components/     DealExplorer, FilterBar, SearchBar, DealCard, Navbar, Footer, Logo, ...
src/components/ui/  design system: GlassCard, Button, Chip, Badge, Avatar, Select
src/lib/            filtering & sorting, URL state, date/price formatting
scripts/            helper scripts (local preview server)
```

### Pages

| URL           | What it shows                                                               |
| ------------- | --------------------------------------------------------------------------- |
| `/`           | All deals: search, filters, a "Sudbury deals" section, then everything else |
| `/student/`   | Only student deals (same filters, minus the Student chip)                   |
| `/free/`      | Only free stuff (same filters, minus the Free chip)                         |
| `/about/`     | What Discount Koi is, update schedule, sources, badge meanings, privacy     |
| `?deal=<id>`  | On any deal page, opens that deal's detail popup. Shareable; Back closes it |
| anything else | Friendly 404 page (`404.html`, which GitHub Pages serves automatically)     |

### How the home page loads deals

- At build time, the first screen of deals (the Sudbury section + 24 more) is written straight into
  the HTML, so the page shows deals instantly and search engines can read them.
- The full list is published as `/deals.json`. The browser downloads it right after the page loads
  and does all filtering, searching and sorting locally. No server is involved.
- Filters live in the URL (e.g. `?type=free&cat=grocery&loc=sudbury&sort=newest`), so any filtered
  view can be shared as a link.

> `data/deals.json` currently holds **sample data** (every deal has `source: "sample"` and links to
> example.com). The site says "Showing sample data" until real scraped deals replace it.

## Run the scraper manually

```bash
npm run scrape                       # run every source and update data/deals.json
npm run scrape -- --dry-run          # run everything, print the summary, change nothing
npm run scrape -- --only=<source-id> # run one source; the others keep their current deals
npm test                             # scraper tests (no internet needed)
```

At the end you get a summary like this (also shown on the GitHub Actions run page):

```
Source         Status                       Deals  New  Removed  Invalid
-------------  ---------------------------  -----  ---  -------  -------
RFD Hot Deals  ok                           118    +23  -19      0
Some retailer  skipped (blocked)            0      +0   -0       0
Another one    failed, kept 40 from last run 40    +0   -0       0
```

- **ok**: fresh deals saved.
- **failed, kept N from last run**: something broke (site down, layout changed). Yesterday's deals
  from that source stay up, so one broken scraper never empties the site.
- **skipped (blocked)**: the site's robots.txt says no, or it answered 401/403/429. The scraper
  never tries to get around this.
- **Invalid**: deals dropped because they failed validation (e.g. a `javascript:` link). The reasons
  are listed under the table.

### How the scraper stays polite

All requests go through `scraper/lib/http.ts`, which reads each site's robots.txt first and
refuses disallowed pages, waits 2–3 seconds between requests to the same site (longer if the site
asks for a Crawl-delay), sends a clear `DiscountKoiBot/1.0` user agent, and fetches one page at a
time. Playwright (headless Chromium) is only used by sources that need JavaScript.

### What happens to every deal

`scraper/normalize.ts` strips all HTML from scraped text, rejects any link that isn't `http(s)`,
works out the discount %, detects **Free** and **Student** deals, picks a category, gives it a
stable id (a hash of source + url + title), and validates it with the Zod schema in
`shared/deal.ts`. Then `scraper/pipeline.ts` removes expired deals, deals with no end date after
14 days (7 for freebies), and duplicates.

## Add a new scraper source

1. Create `scraper/sources/my-source.ts`:

   ```ts
   import { load } from "cheerio";
   import type { Source } from "./types";

   export const mySource: Source = {
     id: "my-source", // permanent; saved on every deal
     name: "My Source",
     enabled: true,
     async fetchDeals({ http, log }) {
       const html = await http.text("https://example.com/deals"); // polite fetch
       const $ = load(html);
       return $(".deal")
         .map((_, el) => ({
           title: $(el).find(".title").text(),
           url: $(el).find("a").attr("href") ?? "",
           store: "Example Store",
           location: "ontario", // "sudbury" | "ontario" | "ships-to-ontario"
           salePrice: Number(
             $(el)
               .find(".price")
               .text()
               .replace(/[^\d.]/g, ""),
           ),
         }))
         .get();
     },
   };
   ```

   Only `title`, `url`, `store` and `location` are required; see `scraper/sources/types.ts` for
   the optional fields. For pages that need JavaScript, use `await http.rendered(url)` instead of
   `http.text(url)`.

2. Add it to the list in `scraper/sources/index.ts`.
3. Try it: `npm run scrape -- --only=my-source --dry-run`.

If a source throws, the run carries on and that source's previous deals are kept.

## Edit categories, free/student detection and timing

| What                                  | Where                                                         |
| ------------------------------------- | ------------------------------------------------------------- |
| Category keyword rules                | `scraper/categorize.ts` → `CATEGORY_RULES` (first match wins) |
| Category fallback per store           | `scraper/categorize.ts` → `STORE_DEFAULTS`                    |
| Words that mark a deal Free / Student | `scraper/detect.ts`                                           |
| 14-day / 7-day expiry, request delays | `scraper/config.ts`                                           |
| Category names shown on the site      | `shared/taxonomy.ts` (change `label` only, never `id`)        |

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
next one. The start days are best guesses, so check them against real flyers and correct any that
are off.

> **Why links instead of scraped prices?** The flyer sites' terms (Flipp, which hosts most Canadian
> flyers, and each chain's own site) forbid copying or republishing their content, so Discount Koi
> links to the flyers instead.

## Edit student discounts _(coming in Phase 5)_

## Deploy to GitHub Pages _(coming in Phase 6)_
