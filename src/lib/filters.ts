import type { Deal } from "@shared/deal";
import {
  CATEGORY_IDS,
  DEAL_TYPE_IDS,
  LOCATION_IDS,
  locationRank,
  type CategoryId,
  type DealTypeId,
  type LocationId,
} from "@shared/taxonomy";

/*
 * Everything about filtering and sorting deals lives here. It's plain functions on
 * the deal list, so the home page, Student and Free pages all behave the same.
 */

export const PAGE_SIZE = 24;
export const SUDBURY_SECTION_SIZE = 8;

export const SORTS = [
  { id: "sudbury", label: "Sudbury first" },
  { id: "newest", label: "Newest" },
  { id: "discount", label: "Biggest discount" },
  { id: "ending", label: "Ending soon" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export type Filters = {
  q: string;
  types: DealTypeId[];
  cats: CategoryId[];
  loc: LocationId | null;
  store: string | null;
  sort: SortId;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  types: [],
  cats: [],
  loc: null,
  store: null,
  sort: "sudbury",
};

// URL keys. Example: ?q=coffee&type=free&cat=grocery&cat=pets&loc=sudbury&sort=newest
const KEYS = ["q", "type", "cat", "loc", "store", "sort"] as const;

const pick = <T extends string>(allowed: readonly T[], values: string[]) =>
  [...new Set(values)].filter((v): v is T => (allowed as readonly string[]).includes(v));

/** Reads filters from a query string, ignoring anything unknown or malformed. */
export function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  const loc = params.get("loc");
  const sort = params.get("sort");
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    types: pick(DEAL_TYPE_IDS, params.getAll("type")),
    cats: pick(CATEGORY_IDS, params.getAll("cat")),
    loc: pick(LOCATION_IDS, loc ? [loc] : [])[0] ?? null,
    store: params.get("store")?.slice(0, 80) || null,
    sort: SORTS.some((s) => s.id === sort) ? (sort as SortId) : "sudbury",
  };
}

/** Writes filters into a query string. Other params (like ?deal=) are kept as they are. */
export function filtersToSearch(filters: Filters, current = ""): string {
  const params = new URLSearchParams(current);
  KEYS.forEach((key) => params.delete(key));
  if (filters.q) params.set("q", filters.q);
  filters.types.forEach((t) => params.append("type", t));
  filters.cats.forEach((c) => params.append("cat", c));
  if (filters.loc) params.set("loc", filters.loc);
  if (filters.store) params.set("store", filters.store);
  if (filters.sort !== "sudbury") params.set("sort", filters.sort);
  return params.toString();
}

/** True when anything narrows the list (sort alone doesn't count). */
export function hasActiveFilters(f: Filters): boolean {
  return Boolean(f.q.trim() || f.types.length || f.cats.length || f.loc || f.store);
}

/** The untouched home page: no filters and the default sort. */
export function isDefaultView(f: Filters): boolean {
  return !hasActiveFilters(f) && f.sort === "sudbury";
}

export function isExpired(deal: Deal, today: string): boolean {
  return Boolean(deal.endDate && deal.endDate < today);
}

export function isFree(deal: Deal): boolean {
  return deal.dealType.includes("free") || deal.salePrice === 0;
}

/** Discount used for sorting. Free counts as 100%; unknown sorts last. */
export function effectiveDiscount(deal: Deal): number {
  return deal.discountPercent ?? (isFree(deal) ? 100 : -1);
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const haystacks = new WeakMap<Deal, string>();
function haystack(deal: Deal): string {
  let text = haystacks.get(deal);
  if (text === undefined) {
    text = fold(`${deal.title} ${deal.store} ${deal.brand ?? ""}`);
    haystacks.set(deal, text);
  }
  return text;
}

/**
 * Keeps deals that match every active filter. Within one group it's "any of"
 * (Student OR Free), across groups it's "all of" (Free AND Grocery).
 */
export function filterDeals(deals: Deal[], f: Filters, today: string): Deal[] {
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  return deals.filter(
    (d) =>
      !isExpired(d, today) &&
      (!f.types.length || d.dealType.some((t) => f.types.includes(t))) &&
      (!f.cats.length || f.cats.includes(d.category)) &&
      (!f.loc || d.location === f.loc) &&
      (!f.store || d.store === f.store || d.brand === f.store) &&
      (!words.length || words.every((w) => haystack(d).includes(w))),
  );
}

const newestFirst = (a: Deal, b: Deal) => b.scrapedAt.localeCompare(a.scrapedAt);
const biggestFirst = (a: Deal, b: Deal) => effectiveDiscount(b) - effectiveDiscount(a);
const byId = (a: Deal, b: Deal) => a.id.localeCompare(b.id);

const COMPARATORS: Record<SortId, (a: Deal, b: Deal) => number> = {
  // Sudbury, then Ontario, then ships-to-ON; inside each: newest, then biggest discount.
  sudbury: (a, b) =>
    locationRank(a.location) - locationRank(b.location) ||
    newestFirst(a, b) ||
    biggestFirst(a, b) ||
    byId(a, b),
  newest: (a, b) => newestFirst(a, b) || biggestFirst(a, b) || byId(a, b),
  discount: (a, b) => biggestFirst(a, b) || newestFirst(a, b) || byId(a, b),
  // Deals with an end date first (soonest on top), then the rest in default order.
  ending: (a, b) =>
    (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999") || COMPARATORS.sudbury(a, b),
};

export function sortDeals(deals: Deal[], sort: SortId): Deal[] {
  return [...deals].sort(COMPARATORS[sort]);
}

/**
 * Splits the default home page into the "Sudbury deals" highlight and everything else.
 * Expects `sorted` to be in the default (Sudbury first) order.
 */
export function splitDefaultView(sorted: Deal[]) {
  const highlight = sorted.filter((d) => d.location === "sudbury").slice(0, SUDBURY_SECTION_SIZE);
  const shown = new Set(highlight);
  return {
    highlight,
    sudburyTotal: sorted.filter((d) => d.location === "sudbury").length,
    rest: sorted.filter((d) => !shown.has(d)),
  };
}

export type StoreOption = { name: string; count: number };

/** Every store and brand name with how many deals mention it, A to Z. */
export function storeOptions(deals: Deal[]): StoreOption[] {
  const counts = new Map<string, number>();
  for (const d of deals) {
    for (const name of new Set([d.store, d.brand].filter(Boolean) as string[])) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "en-CA", { sensitivity: "base" }));
}
