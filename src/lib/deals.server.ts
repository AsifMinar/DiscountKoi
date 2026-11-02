import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DealSchema, DealsFileSchema, type Deal, type DealsFile } from "@shared/deal";
import { lowestInSudbury } from "@shared/products";
import type { HistoryPoint, OntarioPricesFile, PriceInfo } from "@shared/price-info";
import type { DealExplorerProps } from "@/components/DealExplorer";
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  facetCounts,
  homeSections,
  inScope,
  isExpired,
  sortDeals,
  storeOptions,
  type PageScope,
} from "@/lib/filters";
import { isFlyer, storeDirectory } from "@/lib/stores";
import { torontoDate } from "@/lib/format";

/**
 * Reads /data/deals.json at build time (server only). Every deal is re-checked
 * against the schema and expired deals are dropped, so a bad file can never
 * break the site. Product listings that are the cheapest of several Sudbury stores
 * get `lowestInSudbury`. Returned in the default "Sudbury first" order.
 */
export function loadDeals(): DealsFile {
  const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), "data", "deals.json"), "utf8"));
  const file = DealsFileSchema.parse(raw);
  const today = torontoDate();

  const deals: Deal[] = [];
  for (const item of file.deals) {
    const result = DealSchema.safeParse(item);
    if (!result.success) {
      console.warn("[deals] skipped invalid deal:", result.error.issues[0]?.message);
      continue;
    }
    if (!isExpired(result.data, today)) deals.push(result.data);
  }

  const lowest = lowestInSudbury(deals, today);
  const marked = deals.map((d) => {
    // Always decided here, never taken from the file.
    const copy = { ...d };
    delete copy.lowestInSudbury;
    if (lowest.has(d.id)) copy.lowestInSudbury = true;
    return copy;
  });
  return { updatedAt: file.updatedAt, deals: sortDeals(marked, "sudbury") };
}

/**
 * The deal grids (home, Student, Free) leave out sample listings: they only exist
 * to show what the Products page looks like.
 */
export const forDealGrids = (deals: Deal[]) => deals.filter((d) => !d.sample);

/**
 * Everything a deal page needs at build time. Only the first screen of deals goes
 * into the HTML; the rest loads as /deals.json in the browser.
 */
export function explorerData(scope: PageScope = { page: "home" }) {
  const { updatedAt, deals: loaded } = loadDeals();
  const all = forDealGrids(loaded);
  const deals = all.filter((d) => inScope(d, scope));
  const today = torontoDate();
  const isHome = scope.page === "home";

  // The untouched home page shows its rows and the first grid page; others just the grid.
  const sections = isHome ? homeSections(deals, today) : null;
  const firstPage = deals.filter((d) => !(isHome && isFlyer(d))).slice(0, PAGE_SIZE);
  const initial = new Map(
    [
      ...(sections ? [...sections.flyers, ...sections.top, ...sections.ending] : []),
      ...firstPage,
    ].map((d) => [d.id, d]),
  );

  const explorer: DealExplorerProps = {
    initialDeals: [...initial.values()],
    total: deals.length,
    stores: storeOptions(deals),
    counts: facetCounts(deals, DEFAULT_FILTERS, today),
    buildDay: today,
    scope,
    home: isHome
      ? {
          stores: storeDirectory(deals),
          studentCount: all.filter((d) => inScope(d, { page: "student" })).length,
          freeCount: all.filter((d) => inScope(d, { page: "free" })).length,
        }
      : undefined,
  };
  return { updatedAt, explorer };
}

/** Every store with a page, for /stores/ and /store/<slug>/. Food help is included. */
export function storesData() {
  const { updatedAt, deals } = loadDeals();
  return { updatedAt, stores: storeDirectory(forDealGrids(deals)) };
}

/** How many product listings go into the Products page's HTML; more load as /deals.json. */
export const PRODUCTS_IN_HTML = 300;

/** Everything the Products page needs at build time. */
export function productsData() {
  const { updatedAt, deals } = loadDeals();
  const products = deals.filter((d) => d.productName);
  return {
    updatedAt,
    isSample: products.some((d) => d.sample),
    initialProducts: products.slice(0, PRODUCTS_IN_HTML),
    total: products.length,
    buildDay: torontoDate(),
  };
}

const readJsonFile = (name: string): unknown => {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", name), "utf8"));
  } catch {
    return null;
  }
};

/**
 * Past product prices (data/price-history.json, last 90 days) and the Ontario averages
 * (data/ontario-prices.json) for /price-info.json. Anything malformed is left out.
 */
export function priceInfo(): PriceInfo {
  const history = (readJsonFile("price-history.json") as { entries?: unknown })?.entries;
  const ontario = readJsonFile("ontario-prices.json") as Partial<OntarioPricesFile> | null;
  const isPoint = (e: HistoryPoint) =>
    typeof e?.product === "string" &&
    typeof e.store === "string" &&
    typeof e.date === "string" &&
    typeof e.price === "number";
  return {
    history: Array.isArray(history) ? (history as HistoryPoint[]).filter(isPoint) : [],
    ontario: Array.isArray(ontario?.items)
      ? ontario.items.filter((i) => typeof i?.unitPrice === "number" && typeof i.unit === "string")
      : [],
    period: typeof ontario?.period === "string" ? ontario.period : "",
  };
}
