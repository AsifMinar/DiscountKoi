import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DealSchema, DealsFileSchema, type Deal, type DealsFile } from "@shared/deal";
import { lowestInSudbury } from "@shared/products";
import type { DealTypeId } from "@shared/taxonomy";
import type { DealExplorerProps } from "@/components/DealExplorer";
import { PAGE_SIZE, isExpired, sortDeals, splitDefaultView, storeOptions } from "@/lib/filters";
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
export function explorerData(lockedType?: DealTypeId) {
  const { updatedAt, deals: loaded } = loadDeals();
  const all = forDealGrids(loaded);
  const deals = lockedType ? all.filter((d) => d.dealType.includes(lockedType)) : all;
  const { highlight, rest } = splitDefaultView(deals);
  const explorer: DealExplorerProps = {
    initialDeals: [...highlight, ...rest.slice(0, PAGE_SIZE)],
    total: deals.length,
    stores: storeOptions(deals),
    buildDay: torontoDate(),
    lockedType,
  };
  return { updatedAt, isSample: all.some((d) => d.source === "sample"), explorer };
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
