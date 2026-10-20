import { torontoDate } from "@shared/dates";
import { parseFeed } from "../lib/feeds";
import { parsePrice } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * itch.io "on sale" games (official RSS feed). Online deals that work from Ontario,
 * priced in US dollars and shown as "US$". Items at 0% off and non-USD prices are skipped.
 * Allowed: robots.txt allows the feed and itch.io's terms have no anti-scraping clause.
 */

export const ITCH_SALE_FEED = "https://itch.io/games/on-sale.xml";

export function itchFeedToDeals(xml: string): RawDeal[] {
  const deals: RawDeal[] = [];
  for (const item of parseFeed(xml)) {
    const percent = Number(item.field("discountpercent"));
    if (!(percent > 0) || item.field("currency") !== "USD") continue;
    const ends = item.field("saleends");
    const endsAt = ends ? Date.parse(ends) : NaN;
    deals.push({
      title: item.field("plainTitle") || item.title,
      url: item.link,
      store: "itch.io",
      location: "ships-to-ontario",
      description: item.description,
      salePrice: parsePrice(item.field("price")),
      originalPrice: parsePrice(item.field("fullPrice")),
      discountPercent: percent,
      currency: "USD",
      dealType: ["online"],
      category: "entertainment",
      imageUrl: item.field("imageurl"),
      endDate: Number.isFinite(endsAt) ? torontoDate(new Date(endsAt)) : undefined,
    });
  }
  return deals;
}

export const itchSales: Source = {
  id: "itch-io-sales",
  name: "itch.io game sales",
  enabled: true,
  async fetchDeals({ http, log }) {
    const xml = await http.text(ITCH_SALE_FEED, "application/rss+xml, application/xml;q=0.9");
    const deals = itchFeedToDeals(xml);
    log(`${parseFeed(xml).length} games on the feed, ${deals.length} discounted in USD`);
    return deals;
  },
};
