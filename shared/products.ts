import type { Deal } from "./deal";
import { convertUnitPrice, perBase, type Unit } from "./units";

/*
 * Product listings: grouping the same product across stores, putting the cheapest
 * first, and spotting the lowest Sudbury price. Plain functions on the deal list,
 * shared by the site build, the Products page and the tests.
 */

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Naive singular so "Eggs" and "egg", "Berries" and "berry" land in the same group. */
const singular = (word: string) =>
  word.length <= 3 || word.endsWith("ss")
    ? word
    : word.endsWith("ies")
      ? `${word.slice(0, -3)}y`
      : word.endsWith("oes")
        ? word.slice(0, -2)
        : word.endsWith("s")
          ? word.slice(0, -1)
          : word;

/** "Chicken Breasts, boneless!" → "chicken breast boneless". Same key = same product. */
export function productKey(name: string): string {
  return fold(name)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(singular)
    .join(" ");
}

export const isProduct = (deal: Deal): boolean => Boolean(deal.productName);

/** Price per gram / mL / item, when the deal has a unit price. */
function yardstick(deal: Deal) {
  return deal.unit && deal.unitPrice !== undefined ? perBase(deal.unit, deal.unitPrice) : undefined;
}

/**
 * Which listings can be compared with each other, and on what value: unit prices of the
 * same kind (weight, volume, count), or else the plain price of the same package size.
 */
function comparison(deal: Deal): { bucket: string; value: number } | undefined {
  const unit = yardstick(deal);
  if (unit) return { bucket: unit.dimension, value: unit.value };
  if (deal.salePrice === undefined) return undefined;
  return { bucket: `size:${productKey(deal.size ?? "")}`, value: deal.salePrice };
}

export type ProductGroup = {
  key: string;
  /** Display name: the name most listings use. */
  name: string;
  /** Cheapest first. Listings that can't be compared fairly come last. */
  deals: Deal[];
  /** Unit to show every comparable unit price in (the one most listings use). */
  unit?: Unit;
  /** How many different stores list it. */
  stores: number;
};

const mostCommon = <T>(values: T[]): T | undefined => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | undefined;
  let bestCount = 0;
  for (const [v, n] of counts) {
    if (n > bestCount) [best, bestCount] = [v, n];
  }
  return best;
};

/** Unit price of `deal` in `unit`, if they're the same kind. */
export function unitPriceIn(deal: Deal, unit: Unit | undefined): number | undefined {
  if (!unit || !deal.unit || deal.unitPrice === undefined) return undefined;
  return convertUnitPrice(deal.unitPrice, deal.unit, unit);
}

/** Puts one product's listings in order: comparable ones cheapest first, then the rest by price. */
function orderListings(deals: Deal[]): { deals: Deal[]; unit?: Unit } {
  const withUnit = deals.filter((d) => yardstick(d));
  const dimension = mostCommon(withUnit.map((d) => yardstick(d)!.dimension));
  const unit = mostCommon(
    withUnit.filter((d) => yardstick(d)!.dimension === dimension).map((d) => d.unit!),
  );
  const rank = (d: Deal) => {
    const y = yardstick(d);
    return y && y.dimension === dimension ? 0 : 1;
  };
  const value = (d: Deal) => {
    const y = yardstick(d);
    return y && y.dimension === dimension ? y.value : (d.salePrice ?? Number.POSITIVE_INFINITY);
  };
  const ordered = [...deals].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      value(a) - value(b) ||
      a.store.localeCompare(b.store) ||
      a.id.localeCompare(b.id),
  );
  return { deals: ordered, unit };
}

/** Groups product listings by product, each group cheapest first; biggest groups first. */
export function groupProducts(deals: Deal[]): ProductGroup[] {
  const byKey = new Map<string, Deal[]>();
  for (const deal of deals) {
    if (!deal.productName) continue;
    const key = productKey(deal.productName);
    byKey.set(key, [...(byKey.get(key) ?? []), deal]);
  }
  const groups = [...byKey].map(([key, listings]): ProductGroup => {
    const { deals: ordered, unit } = orderListings(listings);
    return {
      key,
      name: mostCommon(listings.map((d) => d.productName!)) ?? listings[0].productName!,
      deals: ordered,
      unit,
      stores: new Set(listings.map((d) => d.store)).size,
    };
  });
  return groups.sort(
    (a, b) =>
      b.stores - a.stores || b.deals.length - a.deals.length || a.name.localeCompare(b.name),
  );
}

/** Keeps groups where every search word appears in the product, size, store or brand. */
export function searchProducts(groups: ProductGroup[], query: string): ProductGroup[] {
  const words = productKey(query).split(" ").filter(Boolean);
  if (!words.length) return groups;
  return groups.filter((g) =>
    g.deals.some((d) => {
      const text = productKey(
        `${d.productName} ${d.title} ${d.size ?? ""} ${d.store} ${d.brand ?? ""}`,
      );
      return words.every((w) => text.includes(w));
    }),
  );
}

/**
 * Ids of listings that are the cheapest in Sudbury for their product right now,
 * among 2 or more different Sudbury stores (a single store isn't a comparison).
 * Prices are compared per unit when possible; otherwise only equal package sizes.
 */
export function lowestInSudbury(deals: Deal[], today: string): Set<string> {
  const buckets = new Map<string, Array<{ deal: Deal; value: number }>>();
  for (const deal of deals) {
    if (!deal.productName || deal.location !== "sudbury") continue;
    if (deal.endDate && deal.endDate < today) continue;
    const c = comparison(deal);
    if (!c) continue;
    const key = `${productKey(deal.productName)}|${c.bucket}`;
    buckets.set(key, [...(buckets.get(key) ?? []), { deal, value: c.value }]);
  }
  const lowest = new Set<string>();
  for (const listings of buckets.values()) {
    if (new Set(listings.map((l) => l.deal.store)).size < 2) continue;
    const min = Math.min(...listings.map((l) => l.value));
    for (const l of listings) {
      if (l.value - min <= min * 1e-9 + 1e-9) lowest.add(l.deal.id);
    }
  }
  return lowest;
}

/** "Price drop": cheaper now than the last time this store listed it. */
export function isPriceDrop(deal: Deal): boolean {
  return (
    deal.previousPrice !== undefined &&
    deal.salePrice !== undefined &&
    deal.previousPrice - deal.salePrice >= 0.01
  );
}
