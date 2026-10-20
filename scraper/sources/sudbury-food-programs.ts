import type { CategoryId } from "@shared/taxonomy";
import { csvToObjects } from "../lib/csv";
import { cleanText, safeUrl } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * Free and low-cost food programs in Greater Sudbury, from the City's open data
 * ("EarthCare Sudbury Food Access Map"). Food banks and meal programs are free; the
 * Good Food Box is affordable produce. Gardens, markets and farm-gate sales aren't deals,
 * so they're left out.
 *
 * Licence: Open Data Licence – City of Greater Sudbury (attribution required).
 * robots.txt asks for a 60-second Crawl-delay, which the fetcher honours.
 * Privacy: the dataset includes contact phone numbers and emails (some personal);
 * those are deliberately never copied.
 */

export const FOOD_ACCESS_CSV =
  "https://opendata.greatersudbury.ca/api/download/v1/items/70ee9904977948eda74612ee6d50a507/csv?layers=0";
export const FOOD_ACCESS_PAGE =
  "https://opendata.greatersudbury.ca/datasets/Sudbury::earthcare-sudbury-food-access-map";
export const OPEN_DATA_CREDIT =
  "Contains information licensed under the Open Data Licence – City of Greater Sudbury.";

const PROGRAMS: Record<string, { label: string; category: CategoryId }> = {
  "Food Bank": { label: "Free food bank", category: "grocery" },
  "Meal Program": { label: "Free meal program", category: "food-restaurants" },
  "Good Food Box": { label: "Good Food Box (affordable produce)", category: "grocery" },
};

/** First plain web link in a field like "https://a.ca and https://b.ca". */
const firstLink = (text: string) =>
  (text.match(/https?:\/\/[^\s,;]+/g) ?? []).map((u) => safeUrl(u)).find(Boolean);

export function foodProgramsToDeals(csv: string, lastModified?: string): RawDeal[] {
  const deals: RawDeal[] = [];
  for (const row of csvToObjects(csv)) {
    const program = PROGRAMS[row.Category];
    if (!program || !row.Name) continue;
    const address = cleanText(row.Address, 80);
    deals.push({
      title: address ? `${program.label} · ${address}` : program.label,
      url: firstLink(row.Website ?? "") ?? FOOD_ACCESS_PAGE,
      store: row.Name,
      location: "sudbury",
      description: row.Services,
      category: program.category,
      ongoing: true,
      // When the City last updated the dataset, so these don't all look brand new.
      publishedAt: lastModified ? new Date(lastModified).toISOString() : undefined,
      attribution: OPEN_DATA_CREDIT,
    });
  }
  return deals;
}

export const sudburyFoodPrograms: Source = {
  id: "sudbury-food-programs",
  name: "Sudbury food programs (open data)",
  enabled: true,
  async fetchDeals({ http, log }) {
    const page = await http.fetch(FOOD_ACCESS_CSV, "text/csv");
    const deals = foodProgramsToDeals(page.body, page.lastModified);
    log(`${deals.length} food banks, meal programs and Good Food Box locations`);
    return deals;
  },
};
