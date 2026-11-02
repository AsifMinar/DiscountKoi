import { productKey } from "./products";
import { parseSize, perBase, unitDimension, type Unit } from "./units";

/*
 * The "good deal" meter: is this price low compared with past prices (data/price-history.json)
 * and with the Ontario average (Statistics Canada)? Shared by the build, the deal popup and
 * the tests. Everything is compared per gram, per mL or per item, so sizes don't matter.
 */

/** One product's Ontario average, e.g. "Eggs, 1 dozen" at $5.00 = $0.4167 each. */
export type OntarioPrice = {
  /** StatCan's name, e.g. "Eggs, 1 dozen". */
  name: string;
  /** The product part, e.g. "Eggs". */
  product: string;
  price: number;
  unit: Unit;
  unitPrice: number;
  /** YYYY-MM */
  period: string;
};

export type OntarioPricesFile = {
  _about: string;
  /** YYYY-MM-DD of the last check. */
  checked: string;
  /** Latest month in the data, YYYY-MM. */
  period: string;
  items: OntarioPrice[];
};

/** A past listing, as kept in data/price-history.json. */
export type HistoryPoint = {
  product: string;
  store: string;
  date: string;
  price: number;
  size?: string;
  unit?: Unit;
  unitPrice?: number;
};

/** What /price-info.json holds: the last 90 days of listings and the Ontario averages. */
export type PriceInfo = { history: HistoryPoint[]; ontario: OntarioPrice[]; period: string };

const words = (text: string) => new Set(productKey(text).split(" ").filter(Boolean));

/**
 * The Ontario average for a product, if StatCan tracks it: every word of StatCan's product
 * ("Chicken breasts") must be in ours ("Chicken breast, boneless skinless"), the most
 * specific match wins ("Peanut butter" over "Butter"), and it must be measured the same
 * way (weight, volume or count). Among sizes ("Milk, 1/2/4 litres"), the closest one wins.
 */
export function ontarioPriceFor(
  deal: { productName?: string; unit?: Unit; size?: string },
  items: OntarioPrice[],
): OntarioPrice | undefined {
  if (!deal.productName || !deal.unit) return undefined;
  const ours = words(deal.productName);
  const dimension = unitDimension(deal.unit);
  let best: OntarioPrice[] = [];
  let bestScore = 0;
  for (const item of items) {
    if (unitDimension(item.unit) !== dimension) continue;
    const theirs = [...words(item.product)];
    if (!theirs.length || !theirs.every((w) => ours.has(w))) continue;
    if (theirs.length > bestScore) [best, bestScore] = [[item], theirs.length];
    else if (theirs.length === bestScore) best.push(item);
  }
  if (best.length <= 1) return best[0];
  // Same product in several sizes: pick the size nearest ours (or the per-kg one).
  const size = parseSize(deal.size)?.base;
  const statcanSize = (item: OntarioPrice) => parseSize(item.name.split(",").pop())?.base;
  return [...best].sort((a, b) => {
    if (!size) return (statcanSize(a) ? 1 : 0) - (statcanSize(b) ? 1 : 0);
    const gap = (item: OntarioPrice) => Math.abs(Math.log((statcanSize(item) ?? size) / size));
    return gap(a) - gap(b);
  })[0];
}

export type Verdict = {
  label: "Lowest price in 90 days" | "Good price" | "Usual price" | "Higher than usual";
  tone: "great" | "good" | "neutral" | "high";
  /** Why, in a few words: "Lowest of 6 listings since Aug 4". */
  reason: string;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Past per-gram/mL/item prices of this product, any store, before `date`. */
export function pastValues(
  deal: { productName?: string; unit?: Unit; unitPrice?: number },
  history: HistoryPoint[],
  date: string,
): number[] {
  if (!deal.productName || !deal.unit || deal.unitPrice === undefined) return [];
  const key = productKey(deal.productName);
  const dimension = unitDimension(deal.unit);
  return history.flatMap((h) => {
    if (h.date >= date || productKey(h.product) !== key || !h.unit || h.unitPrice === undefined)
      return [];
    const value = perBase(h.unit, h.unitPrice);
    return value.dimension === dimension ? [value.value] : [];
  });
}

/** Ontario average vs ours: -0.18 means 18% cheaper than the average. */
export function vsOntario(deal: { unit?: Unit; unitPrice?: number }, ontario: OntarioPrice) {
  if (!deal.unit || deal.unitPrice === undefined) return undefined;
  const ours = perBase(deal.unit, deal.unitPrice);
  const theirs = perBase(ontario.unit, ontario.unitPrice);
  if (ours.dimension !== theirs.dimension || theirs.value <= 0) return undefined;
  return ours.value / theirs.value - 1;
}

/**
 * The meter's answer. With 3 or more past listings, today's price is judged against them;
 * otherwise against the Ontario average (±10%). Nothing to compare with: undefined.
 */
export function priceVerdict(
  current: number,
  past: number[],
  ontarioGap?: number,
): Verdict | undefined {
  if (past.length >= 3) {
    const low = Math.min(...past);
    const usual = median(past);
    const of = `${past.length} earlier listings`;
    if (current <= low + 1e-9)
      return { label: "Lowest price in 90 days", tone: "great", reason: `Cheaper than all ${of}` };
    if (current <= usual * 0.97)
      return { label: "Good price", tone: "good", reason: `Below the usual price of ${of}` };
    if (current <= usual * 1.03)
      return { label: "Usual price", tone: "neutral", reason: `About the same as ${of}` };
    return { label: "Higher than usual", tone: "high", reason: `Above the usual price of ${of}` };
  }
  if (ontarioGap === undefined) return undefined;
  const pct = Math.round(Math.abs(ontarioGap) * 100);
  if (ontarioGap <= -0.1)
    return { label: "Good price", tone: "good", reason: `${pct}% below the Ontario average` };
  if (ontarioGap <= 0.1)
    return { label: "Usual price", tone: "neutral", reason: "Close to the Ontario average" };
  return { label: "Higher than usual", tone: "high", reason: `${pct}% above the Ontario average` };
}
