import type { Deal } from "@shared/deal";
import { daysBetween, torontoDate } from "@shared/dates";
import {
  CATEGORY_IDS,
  DEAL_TYPE_IDS,
  LOCATION_IDS,
  locationRank,
  type CategoryId,
  type DealTypeId,
  type LocationId,
} from "@shared/taxonomy";
import { isFoodHelp } from "@/lib/food-help";
import { isFlyer, storeSlug } from "@/lib/stores";

/*
 * Everything about filtering and sorting deals lives here. It's plain functions on
 * the deal list, so the home, Student, Free and store pages all behave the same.
 */

export const PAGE_SIZE = 24;
/** How many deals the "Top deals" and "Ending soon" rows on the home page show. */
export const ROW_SIZE = 10;
/** A home page row needs at least this many deals, or it's left out. */
export const ROW_MIN = 3;
/** ...and deals from at least this many stores, so a row is never one shop's ad. */
export const ROW_MIN_STORES = 2;
/** At most this many deals from one store per home page row, so one shop can't fill it. */
export const ROW_PER_STORE = 3;

export const SORTS = [
  { id: "sudbury", label: "Sudbury first" },
  { id: "newest", label: "Newest" },
  { id: "discount", label: "Biggest discount" },
  { id: "price", label: "Lowest price" },
  { id: "ending", label: "Ending soon" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

/** Where you buy it: the "All / In store / Online" switch. */
export const CHANNELS = [
  { id: "in-store", label: "In store" },
  { id: "online", label: "Online" },
] as const satisfies ReadonlyArray<{ id: DealTypeId; label: string }>;
export type ChannelId = (typeof CHANNELS)[number]["id"];

/** "At least X% off" choices. */
export const MIN_DISCOUNTS = [10, 25, 50] as const;
/** "Under $X" choices. */
export const MAX_PRICES = [10, 25, 50, 100] as const;

export type Filters = {
  q: string;
  types: DealTypeId[];
  cats: CategoryId[];
  loc: LocationId | null;
  store: string | null;
  channel: ChannelId | null;
  /** At least this many percent off. */
  off: number | null;
  /** Costs this much or less. */
  under: number | null;
  sort: SortId;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  types: [],
  cats: [],
  loc: null,
  store: null,
  channel: null,
  off: null,
  under: null,
  sort: "sudbury",
};

// URL keys. Example: ?q=coffee&type=free&cat=grocery&loc=sudbury&ch=online&off=25&under=50&sort=newest
const KEYS = ["q", "type", "cat", "loc", "store", "ch", "off", "under", "sort"] as const;

const pick = <T extends string>(allowed: readonly T[], values: string[]) =>
  [...new Set(values)].filter((v): v is T => (allowed as readonly string[]).includes(v));

const pickNumber = (allowed: readonly number[], value: string | null) =>
  allowed.find((n) => String(n) === value) ?? null;

/** Reads filters from a query string, ignoring anything unknown or malformed. */
export function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  const loc = params.get("loc");
  const ch = params.get("ch");
  const sort = params.get("sort");
  let types = pick(DEAL_TYPE_IDS, params.getAll("type"));
  let channel = CHANNELS.find((c) => c.id === ch)?.id ?? null;
  // Older links said ?type=in-store; that's the In store switch now.
  const legacy = types.filter((t): t is ChannelId => CHANNELS.some((c) => c.id === t));
  if (legacy.length === 1 && !channel) {
    channel = legacy[0];
    types = types.filter((t) => t !== channel);
  }
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    types,
    cats: pick(CATEGORY_IDS, params.getAll("cat")),
    loc: pick(LOCATION_IDS, loc ? [loc] : [])[0] ?? null,
    store: params.get("store")?.slice(0, 80) || null,
    channel,
    off: pickNumber(MIN_DISCOUNTS, params.get("off")),
    under: pickNumber(MAX_PRICES, params.get("under")),
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
  if (filters.channel) params.set("ch", filters.channel);
  if (filters.off) params.set("off", String(filters.off));
  if (filters.under) params.set("under", String(filters.under));
  if (filters.sort !== "sudbury") params.set("sort", filters.sort);
  return params.toString();
}

/** True when anything narrows the list (sort alone doesn't count). */
export function hasActiveFilters(f: Filters): boolean {
  return activeFilterCount(f) > 0 || Boolean(f.q.trim() || f.channel);
}

/**
 * How many filters in the filter panel are picked, for the "Filters (3)" button. Search,
 * sort and the In store / Online switch have their own controls, so they don't count.
 */
export function activeFilterCount(f: Filters): number {
  return (
    f.types.length +
    f.cats.length +
    [f.loc, f.store, f.off, f.under].filter((v) => v !== null).length
  );
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

/** Lower case without accents, so "Cafe" finds "Café". */
export const fold = (text: string) =>
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
      (!f.channel || d.dealType.includes(f.channel)) &&
      (!f.off || effectiveDiscount(d) >= f.off) &&
      // "Under $X" means Canadian dollars, so US-dollar prices aren't compared with it.
      (!f.under || (isCad(d) && d.salePrice !== undefined && d.salePrice <= f.under)) &&
      (!words.length || words.every((w) => haystack(d).includes(w))),
  );
}

const newestFirst = (a: Deal, b: Deal) => b.scrapedAt.localeCompare(a.scrapedAt);
const biggestFirst = (a: Deal, b: Deal) => effectiveDiscount(b) - effectiveDiscount(a);
const byId = (a: Deal, b: Deal) => a.id.localeCompare(b.id);
const isCad = (d: Deal) => (d.currency ?? "CAD") === "CAD";
// Free first, then Canadian prices, then US-dollar prices (not mixed in), then no price.
const priceGroup = (d: Deal) => (isFree(d) ? 0 : d.salePrice === undefined ? 3 : isCad(d) ? 1 : 2);
const priceOf = (d: Deal) => (isFree(d) ? 0 : (d.salePrice ?? 0));

const COMPARATORS: Record<SortId, (a: Deal, b: Deal) => number> = {
  // Sudbury, then Ontario, then ships-to-ON; inside each: newest, then biggest discount.
  sudbury: (a, b) =>
    locationRank(a.location) - locationRank(b.location) ||
    newestFirst(a, b) ||
    biggestFirst(a, b) ||
    byId(a, b),
  newest: (a, b) => newestFirst(a, b) || biggestFirst(a, b) || byId(a, b),
  discount: (a, b) => biggestFirst(a, b) || newestFirst(a, b) || byId(a, b),
  price: (a, b) =>
    priceGroup(a) - priceGroup(b) || priceOf(a) - priceOf(b) || COMPARATORS.sudbury(a, b),
  // Deals with an end date first (soonest on top), then the rest in default order.
  ending: (a, b) =>
    (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999") || COMPARATORS.sudbury(a, b),
};

export function sortDeals(deals: Deal[], sort: SortId): Deal[] {
  return [...deals].sort(COMPARATORS[sort]);
}

/* ---------- Which deals a page shows ---------- */

/**
 * The set of deals a page lists before any filter: Student and Free list their type, a
 * store page lists that store. Food help is only on its store pages and in the Free
 * page's own directory.
 */
export type PageScope =
  { page: "home" } | { page: "student" } | { page: "free" } | { page: "store"; slug: string };

export function inScope(deal: Deal, scope: PageScope): boolean {
  switch (scope.page) {
    case "home":
      return !isFoodHelp(deal);
    case "student":
      return deal.dealType.includes("student");
    case "free":
      return deal.dealType.includes("free") && !isFoodHelp(deal);
    case "store":
      // The store page shows its weekly flyer in the header, not as a card.
      return storeSlug(deal.store) === scope.slug && !isFlyer(deal);
  }
}

/** The deal type a page already locks in, so its filter is hidden. */
export function lockedType(scope: PageScope): DealTypeId | undefined {
  return scope.page === "student" || scope.page === "free" ? scope.page : undefined;
}

/* ---------- Home page sections ---------- */

/** Sudbury first, then the rest of Canada, then US-dollar deals (the sort is stable). */
const localFirst = (d: Deal) => (d.location === "sudbury" ? 0 : isCad(d) ? 1 : 2);

/** The first ROW_SIZE deals, at most ROW_PER_STORE from any one store. */
function varied(sorted: Deal[]): Deal[] {
  const perStore = new Map<string, number>();
  const picked: Deal[] = [];
  for (const deal of sorted) {
    const n = perStore.get(deal.store) ?? 0;
    if (n >= ROW_PER_STORE) continue;
    perStore.set(deal.store, n + 1);
    picked.push(deal);
    if (picked.length === ROW_SIZE) break;
  }
  return picked;
}

/** First seen today (Sudbury time): gets a "New" badge. */
export const isNewToday = (deal: Deal, today: string) =>
  torontoDate(new Date(deal.scrapedAt)) === today;

/** A row is shown only with enough deals from enough different stores. */
const fullRow = (row: Deal[]) =>
  row.length >= ROW_MIN && new Set(row.map((d) => d.store)).size >= ROW_MIN_STORES ? row : [];

/**
 * The rows above the main grid on the untouched home page: this week's flyer links,
 * the biggest discounts, and deals ending within a week. Flyers stay out of the grid;
 * the other rows only highlight deals that are in the grid too, and a deal shows in
 * one row at most.
 */
export function homeSections(deals: Deal[], today: string) {
  const live = deals.filter((d) => !isFlyer(d) && !isExpired(d, today));
  const top = fullRow(
    varied(
      sortDeals(
        live.filter((d) => d.discountPercent && !isFree(d)),
        "discount",
      ).sort((a, b) => localFirst(a) - localFirst(b)),
    ),
  );
  const inTop = new Set(top.map((d) => d.id));
  const ending = fullRow(
    varied(
      sortDeals(
        live.filter((d) => d.endDate && daysBetween(today, d.endDate) <= 7 && !inTop.has(d.id)),
        "ending",
      ).sort((a, b) => localFirst(a) - localFirst(b)),
    ),
  );
  return {
    flyers: deals.filter((d) => isFlyer(d) && !isExpired(d, today)),
    top,
    ending,
  };
}

export type FacetCounts = {
  types: Partial<Record<DealTypeId, number>>;
  cats: Partial<Record<CategoryId, number>>;
};

/**
 * How many deals each type and category chip would show if picked, given the other
 * filters. A group ignores its own selection, so picking Grocery doesn't zero out
 * every other category.
 */
export function facetCounts(deals: Deal[], f: Filters, today: string): FacetCounts {
  const counts: FacetCounts = { types: {}, cats: {} };
  for (const d of filterDeals(deals, { ...f, types: [] }, today)) {
    for (const t of d.dealType) counts.types[t] = (counts.types[t] ?? 0) + 1;
  }
  for (const d of filterDeals(deals, { ...f, cats: [] }, today)) {
    counts.cats[d.category] = (counts.cats[d.category] ?? 0) + 1;
  }
  return counts;
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
