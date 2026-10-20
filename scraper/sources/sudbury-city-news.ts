import { isFreeDeal } from "../detect";
import { parseFeed } from "../lib/feeds";
import { cleanText } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * City of Greater Sudbury news releases (official RSS feed). Only releases about
 * something free (free skates, swims, programs, events) become cards.
 * Allowed: robots.txt allows everything and the city publishes the feed for subscribers.
 */

export const CITY_NEWS_FEED =
  "https://www.greatersudbury.ca/index.cfm/_api/feed/v1/sudburyen/?feedID=ADDC8D7D-B804-7CE1-ED2155DDB41CEB62";

export function cityNewsToDeals(xml: string): RawDeal[] {
  return parseFeed(xml)
    .filter((item) => isFreeDeal(`${item.title} ${cleanText(item.description, 1000)}`))
    .map((item) => ({
      title: item.title,
      url: item.link,
      store: "City of Greater Sudbury",
      location: "sudbury",
      description: item.description,
      dealType: ["free"],
      publishedAt: item.published,
      attribution: "City of Greater Sudbury news release",
    }));
}

export const sudburyCityNews: Source = {
  id: "sudbury-city-news",
  name: "City of Greater Sudbury news",
  enabled: true,
  async fetchDeals({ http, log }) {
    const xml = await http.text(CITY_NEWS_FEED, "application/rss+xml, application/xml;q=0.9");
    const deals = cityNewsToDeals(xml);
    log(`${parseFeed(xml).length} news releases, ${deals.length} about something free`);
    return deals;
  },
};
