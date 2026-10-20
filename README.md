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
src/app/            pages (App Router) and global styles (design tokens live in globals.css)
src/components/     Navbar, Footer, Logo, ThemeToggle
src/components/ui/  design system: GlassCard, Button, Chip, Badge, Avatar
scripts/            helper scripts (local preview server)
```

## Run the scraper manually _(coming in Phase 4)_

## Add a new scraper source _(coming in Phase 4)_

## Edit categories and student discounts _(coming in Phases 4–5)_

## Deploy to GitHub Pages _(coming in Phase 6)_
