import { readFileSync } from "node:fs";
import { z } from "zod";
import { CATEGORY_IDS, LOCATION_IDS } from "@shared/taxonomy";
import { parseProductFeed, type FeedProduct } from "../lib/affiliate";
import { percentOff } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * Affiliate product feeds (Rakuten, CJ, Impact, Awin…): discounted products from
 * retailers whose affiliate program has approved Discount Koi. Every card is labelled
 * as an affiliate link on the site and its links get rel="sponsored".
 *
 * SWITCHED OFF until you're approved by a network (see docs/affiliate-setup.md).
 * Feeds are listed in data/affiliate-feeds.json. Feed URLs contain your account
 * credentials, so they are never in the repo: they come from the AFFILIATE_FEED_URLS
 * GitHub secret, a JSON object like {"example-store": "https://…"}.
 */

export const AFFILIATE_FEEDS_FILE = "data/affiliate-feeds.json";

export const FeedConfigSchema = z
  .object({
    /** Matches a key in the AFFILIATE_FEED_URLS secret. */
    id: z.string().regex(/^[a-z0-9-]{2,40}$/),
    /** Store name shown on the cards, e.g. "Best Buy". */
    store: z.string().trim().min(1).max(80),
    network: z.enum(["rakuten", "cj", "impact", "awin", "partnerize", "other"]),
    format: z.enum(["csv", "tsv", "xml"]).optional(),
    location: z.enum(LOCATION_IDS).default("ships-to-ontario"),
    category: z.enum(CATEGORY_IDS).optional(),
    /** Only products at least this much off become deals. */
    minDiscountPercent: z.number().int().min(1).max(100).default(10),
    /** At most this many deals per feed (biggest discounts first). */
    maxItems: z.number().int().min(1).max(500).default(100),
  })
  .strict();

export type FeedConfig = z.output<typeof FeedConfigSchema>;

/** One feed's products → deals: in stock, in CAD or USD, and really discounted. */
export function feedToDeals(products: FeedProduct[], feed: FeedConfig): RawDeal[] {
  return products
    .map((p) => ({ p, pct: percentOff(p.price, p.salePrice) ?? 0 }))
    .filter(
      ({ p, pct }) =>
        p.inStock &&
        pct >= feed.minDiscountPercent &&
        (!p.currency || p.currency === "CAD" || p.currency === "USD"),
    )
    .sort((a, b) => b.pct - a.pct)
    .slice(0, feed.maxItems)
    .map(({ p }) => ({
      title: p.name,
      url: p.url,
      store: feed.store,
      location: feed.location,
      category: feed.category,
      brand: p.brand,
      productName: p.name,
      originalPrice: p.price,
      salePrice: p.salePrice,
      currency: p.currency === "USD" ? "USD" : "CAD",
      imageUrl: p.image,
      endDate: p.saleEnds,
      dealType: ["online"],
      affiliate: true,
    }));
}

/** The secret's JSON, or nothing if it isn't set. */
function feedUrls(): Record<string, string> {
  const raw = process.env.AFFILIATE_FEED_URLS?.trim();
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  return z.record(z.string(), z.url({ protocol: /^https$/ })).parse(parsed);
}

export const affiliateFeeds: Source = {
  id: "affiliate-feeds",
  name: "Affiliate product feeds",
  enabled: false,
  async fetchDeals({ http, log }) {
    const config = z
      .object({ feeds: z.array(FeedConfigSchema) })
      .parse(JSON.parse(readFileSync(AFFILIATE_FEEDS_FILE, "utf8")));
    const urls = feedUrls();
    const deals: RawDeal[] = [];
    for (const feed of config.feeds) {
      const url = urls[feed.id];
      if (!url) {
        log(`${feed.id}: no URL in the AFFILIATE_FEED_URLS secret, skipped`);
        continue;
      }
      const page = await http.fetch(url, "text/csv, application/xml, text/xml, */*;q=0.5");
      const found = feedToDeals(parseProductFeed(page.body, feed.format), feed);
      log(`${feed.id}: ${found.length} discounted products`);
      deals.push(...found);
    }
    return deals;
  },
};
