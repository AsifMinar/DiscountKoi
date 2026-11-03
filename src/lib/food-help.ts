import type { Deal } from "@shared/deal";

/*
 * Food banks, meal programs and Good Food Box locations (category "food-help") are
 * places rather than deals, so the Free page lists them as a directory instead of
 * deal cards. Their titles look like "Free food bank · 44 Pine Street" (see
 * scraper/sources/sudbury-food-programs.ts): the part before " · " says what kind of
 * program it is, the part after is the address.
 */

export const isFoodHelp = (d: Deal) => d.category === "food-help";

const KINDS = [
  { prefix: "Free food bank", label: "Food banks" },
  { prefix: "Free meal program", label: "Meal programs" },
  { prefix: "Good Food Box", label: "Good Food Box (affordable produce)" },
] as const;
const OTHER = "Other programs";

export type FoodProgram = {
  id: string;
  name: string;
  address: string;
  /** Who it's for and opening hours, as the City lists them. */
  notes: string;
  url: string;
};

export type FoodProgramGroup = { label: string; programs: FoodProgram[] };

/** Food help deals grouped by kind (food banks first), each group A to Z by name. */
export function foodProgramGroups(deals: Deal[]): FoodProgramGroup[] {
  const groups = new Map<string, FoodProgram[]>(
    [...KINDS.map((k) => k.label), OTHER].map((label) => [label, []]),
  );
  for (const deal of deals.filter(isFoodHelp)) {
    const at = deal.title.indexOf(" · ");
    const kind = KINDS.find((k) => deal.title.startsWith(k.prefix));
    groups.get(kind?.label ?? OTHER)!.push({
      id: deal.id,
      name: deal.store,
      // Trailing commas come straight from the City's data ("24 Delamere Road,").
      address: at === -1 ? "" : deal.title.slice(at + 3).replace(/[,\s]+$/, ""),
      notes: deal.description,
      url: deal.url,
    });
  }
  return [...groups]
    .filter(([, programs]) => programs.length > 0)
    .map(([label, programs]) => ({
      label,
      programs: programs.sort((a, b) => a.name.localeCompare(b.name, "en-CA")),
    }));
}
