import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DealSchema, DealsFileSchema, type Deal, type DealsFile } from "@shared/deal";
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
import { foodProgramGroups, isFoodHelp } from "@/lib/food-help";
import { isFlyer, storeDirectory } from "@/lib/stores";
import { torontoDate } from "@/lib/format";

/**
 * Reads /data/deals.json at build time (server only). Every deal is re-checked
 * against the schema and expired deals are dropped, so a bad file can never
 * break the site. Returned in the default "Sudbury first" order.
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
  return { updatedAt: file.updatedAt, deals: sortDeals(deals, "sudbury") };
}

/**
 * Everything a deal page needs at build time. Only the first screen of deals goes
 * into the HTML; the rest loads as /deals.json in the browser.
 */
export function explorerData(scope: PageScope = { page: "home" }) {
  const { updatedAt, deals: all } = loadDeals();
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
          freeCount: all.filter((d) => inScope(d, { page: "free" }) || isFoodHelp(d)).length,
        }
      : undefined,
  };
  return { updatedAt, explorer };
}

/** Every store with a page, for /stores/ and /store/<slug>/. Food help is included. */
export function storesData() {
  const { updatedAt, deals } = loadDeals();
  return { updatedAt, stores: storeDirectory(deals) };
}

/** The Free page: its freebies and events, plus the food help directory. */
export function freePageData() {
  const { updatedAt, explorer } = explorerData({ page: "free" });
  const food = loadDeals().deals.filter(isFoodHelp);
  return {
    updatedAt,
    explorer,
    foodHelp: foodProgramGroups(food),
    foodHelpCredit: food.find((d) => d.attribution)?.attribution,
  };
}
