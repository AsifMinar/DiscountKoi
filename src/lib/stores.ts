import type { Deal } from "@shared/deal";

/** A weekly flyer link card (one per store per flyer week). */
export const isFlyer = (d: Deal) => d.source === "flyer-links";

/**
 * Store pages live at /store/<slug>/. The slug comes from the store name alone, so the
 * browser can link to a store page without knowing the whole store list.
 */
export function storeSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "store";
}

export const storeHref = (name: string) => `/store/${storeSlug(name)}/`;

export type StoreSummary = {
  name: string;
  slug: string;
  /** Deals listed for the store, not counting its weekly flyer link. */
  count: number;
  /** This week's flyer link, if the store has one. */
  flyer: Deal | null;
  /** Food banks and meal programs, which the home page leaves to the Free page. */
  foodHelp: boolean;
  /** Has a deal in Greater Sudbury: these stores come first. */
  local: boolean;
};

/**
 * One entry per store: Sudbury stores first, then most deals, then A to Z. Two names that make the same
 * slug ("Café X" and "Cafe X") share one entry and one page.
 */
export function storeDirectory(deals: Deal[]): StoreSummary[] {
  const bySlug = new Map<string, StoreSummary>();
  for (const deal of deals) {
    const slug = storeSlug(deal.store);
    let entry = bySlug.get(slug);
    if (!entry) {
      entry = { name: deal.store, slug, count: 0, flyer: null, foodHelp: true, local: false };
      bySlug.set(slug, entry);
    }
    if (isFlyer(deal)) entry.flyer ??= deal;
    else entry.count += 1;
    if (deal.category !== "food-help") entry.foodHelp = false;
    if (deal.location === "sudbury") entry.local = true;
  }
  return [...bySlug.values()].sort(
    (a, b) =>
      Number(b.local) - Number(a.local) ||
      b.count - a.count ||
      Number(Boolean(b.flyer)) - Number(Boolean(a.flyer)) ||
      a.name.localeCompare(b.name, "en-CA", { sensitivity: "base" }),
  );
}
