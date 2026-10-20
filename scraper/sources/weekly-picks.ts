import { readFileSync } from "node:fs";
import { z } from "zod";
import { CATEGORY_IDS, LOCATION_IDS } from "@shared/taxonomy";
import { UNITS } from "@shared/units";
import { FLYER_STORES_FILE, weekLabel } from "./flyer-links";
import type { RawDeal, Source } from "./types";

/*
 * Weekly product picks from data/weekly-picks.json: short factual listings
 * ("Chicken breast, $3.99/lb, No Frills, ends Oct 28") that Asif writes by hand from
 * the official Sudbury flyers, each linking to that flyer. No web requests.
 *
 * Add one with `npm run add-pick`, or edit the file (instructions are at its top).
 */

export const WEEKLY_PICKS_FILE = "data/weekly-picks.json";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD, e.g. 2026-10-28");
const money = z.number().nonnegative().max(100_000);

/** One pick. Unknown fields are refused so a typo ("salesPrice") is caught, not ignored. */
export const PickSchema = z
  .object({
    productName: z.string().trim().min(1).max(120),
    store: z.string().trim().min(1).max(80),
    salePrice: money,
    size: z.string().trim().min(1).max(40).optional(),
    unit: z.enum(UNITS).optional(),
    unitPrice: money.optional(),
    originalPrice: money.optional(),
    previousPrice: money.optional(),
    startDate: isoDay.optional(),
    endDate: isoDay,
    /** The official flyer. Leave it out to use the store's flyer link from flyer-stores.json. */
    url: z.url({ protocol: /^https?$/ }).optional(),
    category: z.enum(CATEGORY_IDS).default("grocery"),
    location: z.enum(LOCATION_IDS).default("sudbury"),
    brand: z.string().trim().min(1).max(80).optional(),
    /** A short line in your own words. */
    note: z.string().trim().min(1).max(160).optional(),
    /** "sample" marks an example entry: labelled on the site, never in price history. */
    source: z.literal("sample").optional(),
  })
  .strict();

export type Pick = z.output<typeof PickSchema>;

/** Store name → its official flyer link, from data/flyer-stores.json. */
export function flyerUrlsByStore(file: unknown): Map<string, string> {
  const stores = (file as { stores?: Array<{ store?: unknown; url?: unknown }> })?.stores ?? [];
  return new Map(
    stores
      .filter((s) => typeof s.store === "string" && typeof s.url === "string")
      .map((s) => [(s.store as string).toLowerCase(), s.url as string]),
  );
}

export function pickToDeal(pick: Pick, flyers: Map<string, string>): RawDeal | string {
  const url = pick.url ?? flyers.get(pick.store.toLowerCase());
  if (!url) return `no link for "${pick.store}": add "url" (the official flyer page)`;
  const week = pick.startDate ? ` (${weekLabel(pick.startDate, pick.endDate)})` : "";
  return {
    title: pick.size ? `${pick.productName}, ${pick.size}` : pick.productName,
    url,
    store: pick.store,
    location: pick.location,
    category: pick.category,
    brand: pick.brand,
    description:
      pick.note ??
      `From the ${pick.store} flyer${week}. Prices can differ between stores, so check the flyer for your Sudbury store.`,
    productName: pick.productName,
    size: pick.size,
    unit: pick.unit,
    unitPrice: pick.unitPrice,
    salePrice: pick.salePrice,
    originalPrice: pick.originalPrice,
    previousPrice: pick.previousPrice,
    dealType: pick.location === "ships-to-ontario" ? ["online"] : ["in-store"],
    startDate: pick.startDate,
    endDate: pick.endDate,
    sample: pick.source === "sample" || undefined,
    // The same product can be picked again next week: that's a new listing.
    variant: `${pick.startDate ?? ""}/${pick.endDate}`,
  };
}

/** Turns the file into deals. Bad entries are skipped and reported, the rest still load. */
export function picksToDeals(
  file: unknown,
  flyers: Map<string, string>,
): { deals: RawDeal[]; problems: string[] } {
  const picks = (file as { picks?: unknown })?.picks;
  if (!Array.isArray(picks)) return { deals: [], problems: ['the file has no "picks" list'] };
  const deals: RawDeal[] = [];
  const problems: string[] = [];
  picks.forEach((entry, i) => {
    const parsed = PickSchema.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      problems.push(`pick #${i + 1}: ${issue.path.join(".") || "entry"}: ${issue.message}`);
      return;
    }
    const deal = pickToDeal(parsed.data, flyers);
    if (typeof deal === "string") problems.push(`pick #${i + 1}: ${deal}`);
    else deals.push(deal);
  });
  return { deals, problems };
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export const weeklyPicks: Source = {
  id: "weekly-picks",
  name: "Weekly product picks",
  enabled: true,
  local: true,
  async fetchDeals({ log }) {
    const { deals, problems } = picksToDeals(
      readJson(WEEKLY_PICKS_FILE),
      flyerUrlsByStore(readJson(FLYER_STORES_FILE)),
    );
    problems.forEach((p) => log(`skipped ${p}`));
    return deals;
  },
};
