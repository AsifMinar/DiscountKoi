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

## Run the scraper manually _(coming in Phase 4)_

## Add a new scraper source _(coming in Phase 4)_

## Edit categories and student discounts _(coming in Phases 4–5)_

## Deploy to GitHub Pages _(coming in Phase 6)_
