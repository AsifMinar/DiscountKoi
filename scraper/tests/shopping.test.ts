import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deal } from "@shared/deal";
import { groupProducts, productKey } from "@shared/products";
import { offersFor, planShopping } from "@shared/shopping";

let n = 0;
const listing = (
  productName: string,
  store: string,
  salePrice: number,
  over: Partial<Deal> = {},
): Deal => ({
  id: `p${++n}`,
  title: productName,
  description: "",
  store,
  dealType: ["in-store"],
  category: "grocery",
  location: "sudbury",
  url: "https://store.example/flyer",
  source: "sheet-picks",
  scrapedAt: "2026-11-01T10:00:00.000Z",
  productName,
  salePrice,
  ...over,
});

const deals = [
  listing("Eggs", "A", 4),
  listing("Eggs", "B", 3),
  listing("Milk", "A", 5),
  listing("Milk", "B", 6),
  listing("Milk", "B", 5.5), // B's cheaper milk is the one that counts
  listing("Bread", "C", 1),
  listing("Bread", "A", 2.5),
  listing("Butter", "A", 9, { sample: true }), // samples never count
];
const groups = new Map(groupProducts(deals).map((g) => [g.key, g]));
const item = (name: string) => ({ name, offers: offersFor(groups.get(productKey(name))) });

test("each store's cheapest listing of a product, cheapest store first", () => {
  assert.deepEqual(
    item("Milk").offers.map((o) => [o.store, o.price]),
    [
      ["A", 5],
      ["B", 5.5],
    ],
  );
  assert.deepEqual(item("Butter").offers, []);
});

test("plans: best single store, a better pair, and the cheapest of all", () => {
  const plans = planShopping(["Eggs", "Milk", "Bread", "Butter"].map(item));
  // A has all three priced items: 4 + 5 + 2.5.
  assert.deepEqual(plans.oneStore[0].stores, ["A"]);
  assert.equal(plans.oneStore[0].total, 11.5);
  assert.deepEqual(
    plans.oneStore.map((p) => [p.stores[0], p.picks.length]),
    [
      ["A", 3],
      ["B", 2],
      ["C", 1],
    ],
  );
  // B + C: eggs 3, milk 5.5 (B), bread 1 (C) = 9.5, which beats A + C (10) and A + B (10.5).
  assert.deepEqual(plans.twoStores?.stores, ["B", "C"]);
  assert.equal(plans.twoStores?.total, 9.5);
  // Every item at its cheapest store: eggs B 3, milk A 5, bread C 1.
  assert.equal(plans.cheapest.total, 9);
  assert.deepEqual([...plans.cheapest.stores].sort(), ["A", "B", "C"]);
  assert.deepEqual(plans.notOnSale, ["Butter"]);
});

test("no pair is suggested when one store is already best", () => {
  const plans = planShopping(["Milk"].map(item));
  assert.equal(plans.twoStores, null);
  assert.equal(plans.oneStore[0].total, 5);
});
