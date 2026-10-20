import { isFreeDeal } from "../detect";
import { parseFeed } from "../lib/feeds";
import { cleanText } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * Ontario Parks blog (official RSS feed). Only posts about something free (e.g. free
 * day-use days) become cards. Crown copyright allows non-commercial reproduction with
 * credit and without changes, so titles are kept as-is and no post text is copied.
 * Allowed: no robots.txt (everything allowed).
 */

export const ONTARIO_PARKS_FEED = "https://blog.ontarioparks.ca/feed/";

export function ontarioParksToDeals(xml: string, now: Date): RawDeal[] {
  return parseFeed(xml)
    .filter((item) => isFreeDeal(`${item.title} ${cleanText(item.description, 1000)}`))
    .map((item) => ({
      title: item.title,
      url: item.link,
      store: "Ontario Parks",
      location: "ontario",
      description: "From the Ontario Parks blog. Open the post for dates and details.",
      dealType: ["free"],
      category: "sports-outdoors",
      publishedAt: item.published,
      attribution: `© King's Printer for Ontario, ${now.getFullYear()}. Ontario Parks blog.`,
    }));
}

export const ontarioParks: Source = {
  id: "ontario-parks",
  name: "Ontario Parks blog",
  enabled: true,
  async fetchDeals({ http, log, now }) {
    const xml = await http.text(ONTARIO_PARKS_FEED, "application/rss+xml, application/xml;q=0.9");
    const deals = ontarioParksToDeals(xml, now);
    log(`${parseFeed(xml).length} posts, ${deals.length} about something free`);
    return deals;
  },
};
