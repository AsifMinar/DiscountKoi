# Affiliate product feeds: how to apply and switch them on

Affiliate networks give approved publishers a product feed: a CSV or XML file listing a retailer's
products, prices and tracking links. Discount Koi can read those feeds and show the discounted
products as deals and on the Products page.

**Status: built but switched off.** Nothing happens until you're approved and you switch it on.
Applying to a network is a free account signup on their side; it's your call which (if any) to join.

## How affiliate deals look on the site

- Every affiliate card and product row has an **"Affiliate link"** badge.
- The deal popup says: _"Affiliate link: Discount Koi may earn a small commission if you buy through
  it, at no extra cost to you."_
- The link gets `rel="sponsored noopener noreferrer"` (what search engines ask for paid links).
- The About page explains affiliate links in plain words.
- Only products that are actually discounted (at least 10% off by default), in stock and priced in
  CAD or USD are shown.

## Before you apply

Networks review your site. Things that help:

- A live site on its own address with real content: you have https://asifminar.github.io/DiscountKoi/.
- A clear About page with the affiliate disclosure (already there).
- Describe it honestly: "a free Sudbury deals site; daily flyer links, student discounts and free
  stuff; product comparisons".
- Most networks also ask for your name, address, tax info (for payouts) and how you promote. Have
  your SIN or a business number ready for Canadian tax forms if they ask.

## The networks

| Network                     | Signup                                                                       | Feeds                                                                                                                                                      | Notes                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Impact** (impact.com)     | Free. Marketplace approval takes about 2 business days; verify your website. | Content → Product Catalogs: download (.gz), FTP or API. Each brand decides who sees its catalog.                                                           | Apply to each brand separately. Best Buy Canada and Sport Chek run their programs here.                                     |
| **Rakuten Advertising**     | Free. Needs a live website on your own domain with original content.         | Catalogs come by **SFTP** as XML or pipe-separated text. You need technical approval for feeds, then each advertiser's approval.                           | Walmart Canada and Well.ca run their programs here. SFTP feeds need an extra download step (see "Limits" below).            |
| **CJ Affiliate** (cj.com)   | Free. Needs an active website.                                               | Subscribe to a joined advertiser's catalog by email or FTP, or use CJ's Product Feed API.                                                                  | Apply to each advertiser in the CJ Account Manager.                                                                         |
| **Awin**                    | A refundable $1 deposit at signup.                                           | "Create-a-Feed" builds a CSV download link. You choose the columns and filters there, which helps keep the file small.                                     | Each advertiser approves you separately. The easiest network for this project, because its feeds are plain HTTPS CSV links. |
| **AvantLink**               | Free; apply per merchant.                                                    | Datafeeds per merchant.                                                                                                                                    | MEC's affiliate program is on AvantLink.                                                                                    |
| **Amazon Associates (.ca)** | Free; your account is reviewed after **3 qualifying sales in 180 days**.     | **No product feeds.** Amazon's old Product Advertising API is being replaced by the "Creators API". It needs separate approval and has sales requirements. | Not a fit for the feed reader. Plain affiliate links in hand-written picks would work, but must be marked as affiliate.     |

## Canadian retailers you could apply to

"Confirmed" means we found the retailer's own affiliate page, or a page that links to the network.
"Reported" means only third-party lists say so: check the network's advertiser search after you join.
Programs move between networks, so always check before applying.

| Retailer           | Category              | Network                                              | Source                                                                                    |
| ------------------ | --------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Best Buy Canada    | Electronics           | Impact (confirmed)                                   | https://www.bestbuy.ca/en-ca/about/affiliate-program/blt82df225e80ec75e9                  |
| Sport Chek         | Sports & outdoors     | Impact (confirmed)                                   | https://www.sportchek.ca/en/customer-service/corporate-information/affiliate-program.html |
| Walmart Canada     | Grocery, everything   | Rakuten (confirmed)                                  | https://www.walmart.ca/en/cp/affiliate-program/6000208941216                              |
| Well.ca            | Health & beauty, baby | Rakuten (confirmed)                                  | https://well.ca/affiliates                                                                |
| MEC                | Sports & outdoors     | AvantLink (confirmed)                                | https://www.mec.ca/fr/explore/mec-affiliate-program                                       |
| Canadian Tire      | Home, automotive      | Impact (reported)                                    | Search "Canadian Tire" in Impact's marketplace                                            |
| Staples Canada     | Office, electronics   | Impact (reported)                                    | Search in Impact                                                                          |
| Simons             | Fashion, home         | Impact (reported)                                    | Search in Impact                                                                          |
| Lenovo             | Electronics           | Impact (confirmed for the UK store; Canada reported) | Search "Lenovo Canada" in Impact                                                          |
| Dell Canada        | Electronics           | CJ (reported)                                        | Search in CJ                                                                              |
| Indigo             | Books, gifts          | CJ (reported)                                        | Search in CJ                                                                              |
| Shoppers Drug Mart | Pharmacy, beauty      | CJ (reported)                                        | Search in CJ                                                                              |
| Roots              | Fashion               | Rakuten (reported)                                   | Search in Rakuten                                                                         |
| Sephora Canada     | Beauty                | Rakuten (reported)                                   | https://www.sephora.com/ca/en/beauty/affiliates                                           |

Not worth chasing: **Hudson's Bay** (liquidated in 2025, no program). **Apple** (only a media and
services program, by invitation).

A good first step: **Best Buy Canada (Impact)** and **Walmart Canada (Rakuten)** cover electronics and
everyday items that people in Sudbury buy online, and both are confirmed.

## Switching it on (after you're approved)

1. **Get a feed link.** In the network, open the retailer's product catalog and get an **HTTPS**
   download link for a **CSV, tab-separated or XML** file. Use the network's filters (category,
   on-sale only, the columns you need) to keep it **under 5 MB**, and pick **uncompressed** if
   there's a choice.
2. **Store the link as a secret.** Feed links contain your account credentials, so they never go in
   the repo. On GitHub: repo **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `AFFILIATE_FEED_URLS`
   - Value: JSON with one entry per feed, for example
     `{"bestbuy-ca": "https://…", "walmart-ca": "https://…"}`
3. **Describe the feed** in `data/affiliate-feeds.json`: copy the `_example` into `feeds`. Set `id` to
   the same name as in the secret, plus `store`, `network` and optionally `category`,
   `minDiscountPercent` and `maxItems`.
4. **Switch it on:** in `scraper/sources/affiliate-feeds.ts` change `enabled: false` to
   `enabled: true`.
5. **Test it locally**, without saving anything. In PowerShell:
   ```powershell
   $env:AFFILIATE_FEED_URLS = '{"bestbuy-ca": "https://…"}'
   npm run scrape -- --only=affiliate-feeds --dry-run
   ```
   The summary shows how many discounted products it found.
6. **Commit and push** `data/affiliate-feeds.json` and the `enabled: true` change. From then on the
   daily scrape passes the secret to the scraper every morning.

## Limits (and what would lift them)

- **SFTP/FTP-only feeds** (Rakuten's standard delivery) can't be fetched directly. You'd need a small
  extra workflow step that downloads the file over SFTP with a key stored as a secret. Ask if you
  want that built.
- **Compressed (.gz) feeds** aren't unpacked. Choose uncompressed, or ask for gzip support.
- **5 MB per download** (`maxBodyBytes` in `scraper/config.ts`) keeps the daily run fast. Filter the
  feed in the network's feed builder rather than raising the limit.
- **Feed formats** understood: Awin CSV, Impact CSV/TSV, CJ CSV/XML, Rakuten XML and Google
  Shopping-style XML. Columns are matched by name, so most variants work. If a feed shows 0
  products, run the dry run above and send the first two lines of the file.

## Your obligations

- Follow each network's and retailer's publisher terms (for example, no bidding on their brand
  names, no coupon codes they didn't give you, keep prices current). The daily scrape refreshes
  feed prices every morning, and expired sales drop off by themselves.
- Keep the affiliate labels and the About page disclosure. Canada's Competition Bureau expects
  paid relationships to be disclosed clearly.
