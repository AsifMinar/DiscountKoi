import type { Deal } from "./deal";
import type { ProductGroup } from "./products";

/*
 * The shopping list's "where should I buy it?" answer. Each item costs its listed price at
 * a store (one package, or 1 lb/kg for weighed items); a store with several listings of the
 * same product counts its cheapest. Plans: one store, the best two stores, and every item
 * at its cheapest store.
 */

export type Offer = { store: string; price: number; deal: Deal };
export type ListItem = { name: string; offers: Offer[] };

/** Each store's cheapest current listing of this product (sample listings never count). */
export function offersFor(group: ProductGroup | undefined): Offer[] {
  const byStore = new Map<string, Offer>();
  for (const deal of group?.deals ?? []) {
    if (deal.sample || deal.salePrice === undefined) continue;
    const current = byStore.get(deal.store);
    if (!current || deal.salePrice < current.price) {
      byStore.set(deal.store, { store: deal.store, price: deal.salePrice, deal });
    }
  }
  return [...byStore.values()].sort((a, b) => a.price - b.price || a.store.localeCompare(b.store));
}

export type Plan = {
  stores: string[];
  /** What each item costs in this plan, and where. */
  picks: Array<{ item: string; offer: Offer }>;
  /** Items none of the plan's stores has this week. */
  missing: string[];
  total: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** Buys each item at the cheapest of `stores` that has it. */
function planFor(stores: string[], items: ListItem[]): Plan {
  const picks: Plan["picks"] = [];
  const missing: string[] = [];
  for (const item of items) {
    const offer = item.offers.find((o) => stores.includes(o.store));
    if (offer) picks.push({ item: item.name, offer });
    else missing.push(item.name);
  }
  return { stores, picks, missing, total: cents(picks.reduce((sum, p) => sum + p.offer.price, 0)) };
}

/** More items first, then cheaper, then fewer stores. */
const better = (a: Plan, b: Plan) =>
  b.picks.length - a.picks.length || a.total - b.total || a.stores.length - b.stores.length;

/**
 * The answers for a list: every single store ranked, the best pair of stores (only when
 * it beats the best single store), and the cheapest possible (each item at its cheapest
 * store, however many stores that takes).
 */
export function planShopping(items: ListItem[]) {
  const withOffers = items.filter((i) => i.offers.length > 0);
  const stores = [...new Set(withOffers.flatMap((i) => i.offers.map((o) => o.store)))].sort();
  const oneStore = stores.map((s) => planFor([s], withOffers)).sort(better);

  const pairs: Plan[] = [];
  for (let i = 0; i < stores.length; i++) {
    for (let j = i + 1; j < stores.length; j++) {
      const plan = planFor([stores[i], stores[j]], withOffers);
      // Only pairs where both stores are used: one that adds nothing isn't a pair.
      if (new Set(plan.picks.map((p) => p.offer.store)).size === 2) pairs.push(plan);
    }
  }
  const bestPair = pairs.sort(better)[0];
  // Worth showing only if it beats the best single store.
  const twoStores: Plan | null =
    bestPair && (!oneStore[0] || better(bestPair, oneStore[0]) < 0) ? bestPair : null;

  const cheapestPicks = withOffers.map((i) => ({ item: i.name, offer: i.offers[0] }));
  const cheapest: Plan = {
    stores: [...new Set(cheapestPicks.map((p) => p.offer.store))],
    picks: cheapestPicks,
    missing: [],
    total: cents(cheapestPicks.reduce((sum, p) => sum + p.offer.price, 0)),
  };
  return {
    oneStore,
    twoStores,
    cheapest,
    /** Items with no price at any store this week. */
    notOnSale: items.filter((i) => i.offers.length === 0).map((i) => i.name),
  };
}
