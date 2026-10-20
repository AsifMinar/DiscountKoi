import { extractJsonLd } from "../lib/structured";
import { cleanText } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * Downtown Sudbury BIA "Today's Specials" (member-business specials). Read from the
 * page's schema.org structured data (Offers, Products, Events), not from CSS layout.
 * Their terms allow sharing links and "brief excerpts for non-commercial purposes with
 * attribution", so cards get a title, a short excerpt, a link and credit to the BIA.
 *
 * As of October 2026 the page says it's "coming soon" and has no specials yet, so this
 * source finds 0 until the BIA publishes them.
 */

export const DOWNTOWN_SPECIALS_URL = "https://downtownsudbury.com/specials";

const EXCERPT_LENGTH = 160;

export function downtownSpecialsToDeals(html: string, pageUrl: string): RawDeal[] {
  return extractJsonLd(html, pageUrl)
    .filter((item) => item.name)
    .map((item) => ({
      title: item.name!,
      url: item.url ?? pageUrl,
      store: item.seller ?? "Downtown Sudbury",
      location: "sudbury",
      description: cleanText(item.description, EXCERPT_LENGTH),
      salePrice: item.currency && item.currency !== "CAD" ? undefined : item.price,
      originalPrice: item.currency && item.currency !== "CAD" ? undefined : item.originalPrice,
      dealType: item.isFree ? ["free"] : ["in-store"],
      startDate: item.validFrom,
      endDate: item.validThrough,
      attribution: "via Downtown Sudbury BIA",
    }));
}

export const downtownSudbury: Source = {
  id: "downtown-sudbury",
  name: "Downtown Sudbury BIA specials",
  enabled: true,
  async fetchDeals({ http, log }) {
    const page = await http.fetch(DOWNTOWN_SPECIALS_URL, "text/html");
    const deals = downtownSpecialsToDeals(page.body, page.url);
    if (deals.length === 0) log("no specials published on the page yet");
    return deals;
  },
};
