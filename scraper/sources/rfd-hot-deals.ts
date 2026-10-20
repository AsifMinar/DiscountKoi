import { parseFeed } from "../lib/feeds";
import { cleanText, parsePrice } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * RedFlagDeals "Hot Deals" forum (official Atom feed). Titles and links only: no post
 * text, no images, a credit to RFD on every card, and each card links to the thread.
 *
 * SWITCHED OFF. RFD's robots.txt doesn't block the feed for our user agent, but its
 * terms of use couldn't be read (the site shows a bot check) and its owner, VerticalScope,
 * licenses content and enforces against scrapers. Turn it on only after VerticalScope
 * says yes in writing: see docs/rfd-permission-request.md.
 */

export const RFD_HOT_DEALS_FEED = "https://forums.redflagdeals.com/feed/forum/9";

/** "[Walmart] Something - $19.99 (reg $39.99)" → store "Walmart", the rest as the title. */
export function splitRfdTitle(raw: string): { store?: string; title: string } {
  const text = cleanText(raw, 300);
  const match = /^\s*\[([^\]]{1,60})\]\s*(.+)$/.exec(text);
  return match ? { store: match[1].trim(), title: match[2].trim() } : { title: text };
}

/** "$19.99 (reg $39.99)" → sale 19.99, original 39.99. Only clear dollar amounts are read. */
export function pricesFromTitle(title: string): { salePrice?: number; originalPrice?: number } {
  const original =
    /\b(?:reg(?:ular(?:ly)?)?|was|orig(?:inal(?:ly)?)?)\.?:?\s*\$\s?(\d[\d,]*(?:\.\d{1,2})?)/i.exec(
      title,
    );
  const withoutOriginal = original ? title.replace(original[0], " ") : title;
  const sale = /\$\s?(\d[\d,]*(?:\.\d{1,2})?)/.exec(withoutOriginal);
  return {
    salePrice: parsePrice(sale?.[1]),
    originalPrice: parsePrice(original?.[1]),
  };
}

export function rfdFeedToDeals(xml: string): RawDeal[] {
  return parseFeed(xml)
    .filter((item) => item.title && item.link)
    .map((item) => {
      const { store, title } = splitRfdTitle(item.title);
      return {
        title,
        url: item.link,
        store: store ?? "RedFlagDeals",
        location: "ontario",
        description: "Posted on the RedFlagDeals Hot Deals forum. Open the thread for details.",
        ...pricesFromTitle(title),
        publishedAt: item.published,
        attribution: "via RedFlagDeals.com Hot Deals forum",
      } satisfies RawDeal;
    });
}

export const rfdHotDeals: Source = {
  id: "rfd-hot-deals",
  name: "RedFlagDeals Hot Deals",
  // Off until VerticalScope gives written permission (docs/rfd-permission-request.md).
  enabled: false,
  async fetchDeals({ http, log }) {
    const xml = await http.text(RFD_HOT_DEALS_FEED, "application/atom+xml, application/xml;q=0.9");
    const deals = rfdFeedToDeals(xml);
    log(`${deals.length} threads on the feed`);
    return deals;
  },
};
