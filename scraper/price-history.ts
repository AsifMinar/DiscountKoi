import { readFileSync } from "node:fs";
import { z } from "zod";
import type { Deal } from "@shared/deal";
import { daysBetween, torontoDate } from "@shared/dates";
import { productKey } from "@shared/products";
import { UNITS, perBase, type Unit } from "@shared/units";
import { round2 } from "./lib/text";

/*
 * data/price-history.json: one line per product, store and listing date, kept for
 * 90 days. It's what "Price drop" compares against: a product is a price drop when
 * it's cheaper now than the last time the same store listed it.
 */

export const PRICE_HISTORY_FILE = "data/price-history.json";
export const HISTORY_DAYS = 90;

const EntrySchema = z.object({
  product: z.string().min(1).max(120),
  store: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().nonnegative(),
  size: z.string().max(40).optional(),
  unit: z.enum(UNITS).optional(),
  unitPrice: z.number().nonnegative().optional(),
});

export type PriceHistoryEntry = z.infer<typeof EntrySchema>;

const ABOUT = [
  "Written by the scraper. One entry per product, store and listing date, kept for 90 days.",
  "Used for the 'Price drop' badge. Safe to delete: it starts again from the next run.",
];

/** Reads the history, skipping any entry that doesn't look right. Missing file = empty. */
export function readPriceHistory(path = PRICE_HISTORY_FILE): PriceHistoryEntry[] {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
  const entries = (raw as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((e) => {
    const parsed = EntrySchema.safeParse(e);
    return parsed.success ? [parsed.data] : [];
  });
}

export function serializePriceHistory(entries: PriceHistoryEntry[]): string {
  return `${JSON.stringify({ _about: ABOUT, entries }, null, 2)}\n`;
}

/** The date a listing counts for: its flyer start, or the day we first saw it. */
export const listingDate = (deal: Deal) => deal.startDate ?? torontoDate(new Date(deal.scrapedAt));

const sameListing = (product: string, store: string) => {
  const key = productKey(product);
  const shop = productKey(store);
  return (e: PriceHistoryEntry) => productKey(e.product) === key && productKey(e.store) === shop;
};

/**
 * What the last earlier listing of this product at this store would cost for the same
 * amount as now. Unit prices are compared when both have one (so a smaller package at the
 * same price isn't a "drop"); otherwise only identical package sizes are compared.
 */
export function previousPriceFor(
  deal: Pick<Deal, "productName" | "store" | "salePrice" | "size" | "unit" | "unitPrice">,
  date: string,
  history: PriceHistoryEntry[],
): number | undefined {
  if (!deal.productName || deal.salePrice === undefined) return undefined;
  const earlier = history
    .filter(sameListing(deal.productName, deal.store))
    .filter((e) => e.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const last = earlier[0];
  if (!last) return undefined;

  const now = deal.unit && deal.unitPrice !== undefined ? perBase(deal.unit, deal.unitPrice) : null;
  const then =
    last.unit && last.unitPrice !== undefined ? perBase(last.unit, last.unitPrice) : null;
  if (now && then) {
    if (now.dimension !== then.dimension || now.value <= 0) return undefined;
    return round2((deal.salePrice * then.value) / now.value);
  }
  if (!now && !then && productKey(deal.size ?? "") === productKey(last.size ?? "")) {
    return last.price;
  }
  return undefined;
}

/**
 * Adds today's product listings to the history, fills in each listing's previous price,
 * and drops entries older than 90 days. Sample listings are never recorded.
 */
export function applyPriceHistory(
  deals: Deal[],
  history: PriceHistoryEntry[],
  today: string,
): { deals: Deal[]; history: PriceHistoryEntry[] } {
  const updated = deals.map((deal) => {
    if (!deal.productName || deal.sample || deal.previousPrice !== undefined) return deal;
    const previous = previousPriceFor(deal, listingDate(deal), history);
    return previous === undefined ? deal : { ...deal, previousPrice: previous };
  });

  const byKey = new Map<string, PriceHistoryEntry>();
  const keyOf = (e: PriceHistoryEntry) =>
    `${productKey(e.product)}|${productKey(e.store)}|${e.date}`;
  for (const entry of history) byKey.set(keyOf(entry), entry);
  for (const deal of deals) {
    if (!deal.productName || deal.sample || deal.salePrice === undefined) continue;
    const entry: PriceHistoryEntry = {
      product: deal.productName,
      store: deal.store,
      date: listingDate(deal),
      price: deal.salePrice,
      ...(deal.size && { size: deal.size }),
      ...(deal.unit && { unit: deal.unit as Unit }),
      ...(deal.unitPrice !== undefined && { unitPrice: deal.unitPrice }),
    };
    byKey.set(keyOf(entry), entry);
  }

  const kept = [...byKey.values()]
    .filter((e) => daysBetween(e.date, today) <= HISTORY_DAYS)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.product.localeCompare(b.product) ||
        a.store.localeCompare(b.store),
    );
  return { deals: updated, history: kept };
}
