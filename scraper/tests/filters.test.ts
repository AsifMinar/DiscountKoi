import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deal } from "@shared/deal";
import {
  DEFAULT_FILTERS,
  facetCounts,
  filterDeals,
  filtersToSearch,
  homeSections,
  inScope,
  parseFilters,
  sortDeals,
} from "@/lib/filters";
import { storeDirectory, storeSlug } from "@/lib/stores";

const TODAY = "2026-10-20";

let n = 0;
const deal = (over: Partial<Deal> = {}): Deal => ({
  id: `deal-${++n}`,
  title: "Deal",
  description: "",
  store: "Store",
  dealType: ["in-store"],
  category: "grocery",
  location: "sudbury",
  url: "https://store.example/",
  source: "weekly-picks",
  scrapedAt: "2026-10-20T10:00:00.000Z",
  ...over,
});

const deals = [
  deal({ dealType: ["free"], category: "grocery" }),
  deal({ dealType: ["free", "student"], category: "entertainment" }),
  deal({ dealType: ["online"], category: "entertainment", location: "ships-to-ontario" }),
  deal({ dealType: ["in-store"], category: "grocery", endDate: "2026-10-19" }), // expired
];

test("facetCounts with no filters counts every live deal", () => {
  const counts = facetCounts(deals, DEFAULT_FILTERS, TODAY);
  assert.deepEqual(counts.types, { free: 2, student: 1, online: 1 });
  assert.deepEqual(counts.cats, { grocery: 1, entertainment: 2 });
});

test("facetCounts: a group ignores its own picks but follows the other filters", () => {
  const counts = facetCounts(deals, { ...DEFAULT_FILTERS, cats: ["entertainment"] }, TODAY);
  // Types only count Entertainment deals…
  assert.deepEqual(counts.types, { free: 1, student: 1, online: 1 });
  // …while Grocery keeps its count, so it can still be added.
  assert.deepEqual(counts.cats, { grocery: 1, entertainment: 2 });

  const sudbury = facetCounts(deals, { ...DEFAULT_FILTERS, loc: "sudbury" }, TODAY);
  assert.deepEqual(sudbury.cats, { grocery: 1, entertainment: 1 });
});

test("parseFilters reads the new filters and ignores values that aren't offered", () => {
  const f = parseFilters("?ch=online&off=25&under=50&sort=price");
  assert.equal(f.channel, "online");
  assert.equal(f.off, 25);
  assert.equal(f.under, 50);
  assert.equal(f.sort, "price");

  const bad = parseFilters("?ch=teleport&off=33&under=-1");
  assert.equal(bad.channel, null);
  assert.equal(bad.off, null);
  assert.equal(bad.under, null);
});

test("old ?type=in-store links turn into the In store switch", () => {
  const f = parseFilters("?type=in-store&type=student&cat=grocery");
  assert.equal(f.channel, "in-store");
  assert.deepEqual(f.types, ["student"]);
  assert.equal(filtersToSearch(f), "type=student&cat=grocery&ch=in-store");

  // Both kinds picked: kept as a deal type filter, like before.
  const both = parseFilters("?type=in-store&type=online");
  assert.equal(both.channel, null);
  assert.deepEqual(both.types, ["in-store", "online"]);
});

test("channel, discount and price filters", () => {
  const list = [
    deal({ id: "a", dealType: ["online"], salePrice: 8, discountPercent: 20 }),
    deal({ id: "b", dealType: ["in-store"], salePrice: 40, discountPercent: 60 }),
    deal({ id: "c", dealType: ["in-store", "free"], salePrice: 0 }),
    deal({ id: "d", dealType: ["in-store"] }), // no price
  ];
  const ids = (patch: Partial<typeof DEFAULT_FILTERS>) =>
    filterDeals(list, { ...DEFAULT_FILTERS, ...patch }, TODAY).map((d) => d.id);

  assert.deepEqual(ids({ channel: "online" }), ["a"]);
  assert.deepEqual(ids({ channel: "in-store" }), ["b", "c", "d"]);
  // Free counts as 100% off.
  assert.deepEqual(ids({ off: 50 }), ["b", "c"]);
  // Deals without a price drop out of a price filter.
  assert.deepEqual(ids({ under: 10 }), ["a", "c"]);
});

test("Lowest price sort: free first, unpriced last", () => {
  const list = [
    deal({ id: "pricey", salePrice: 30 }),
    deal({ id: "none" }),
    deal({ id: "free", dealType: ["free"], salePrice: 0 }),
    deal({ id: "cheap", salePrice: 2 }),
  ];
  assert.deepEqual(
    sortDeals(list, "price").map((d) => d.id),
    ["free", "cheap", "pricey", "none"],
  );
});

test("page scopes: food help lives on the Free page, store pages skip the flyer card", () => {
  const foodBank = deal({ category: "food-help", dealType: ["in-store"], store: "Food Bank" });
  const flyer = deal({ source: "flyer-links", store: "No Frills" });
  const pick = deal({ store: "No Frills" });

  assert.equal(inScope(foodBank, { page: "home" }), false);
  assert.equal(inScope(foodBank, { page: "free" }), true);
  assert.equal(inScope(flyer, { page: "home" }), true);
  assert.equal(inScope(flyer, { page: "store", slug: "no-frills" }), false);
  assert.equal(inScope(pick, { page: "store", slug: "no-frills" }), true);
  assert.equal(inScope(pick, { page: "store", slug: "metro" }), false);
});

test("home rows: top deals by discount (not free), ending within a week, at least 4 each", () => {
  const discounted = [10, 50, 30, 20, 40].map((p) =>
    deal({ id: `off-${p}`, discountPercent: p, salePrice: 5, endDate: "2026-10-24" }),
  );
  const extra = [
    deal({ id: "free", dealType: ["free"], salePrice: 0, discountPercent: 100 }),
    deal({ id: "flyer", source: "flyer-links", endDate: "2026-10-21" }),
    deal({ id: "later", discountPercent: 5, salePrice: 1, endDate: "2026-12-01" }),
  ];
  const rows = homeSections([...discounted, ...extra], TODAY);
  assert.deepEqual(
    rows.top.map((d) => d.id),
    ["off-50", "off-40", "off-30", "off-20", "off-10", "later"],
  );
  assert.equal(rows.ending.length, 5); // the flyer and "later" are left out
  assert.deepEqual(
    rows.flyers.map((d) => d.id),
    ["flyer"],
  );

  // Too few for a row: no row at all.
  assert.deepEqual(homeSections(discounted.slice(0, 3), TODAY).top, []);
});

test("store slugs and the store directory", () => {
  assert.equal(storeSlug("No Frills"), "no-frills");
  assert.equal(storeSlug("itch.io"), "itch-io");
  assert.equal(storeSlug("Café Rendez-vous"), "cafe-rendez-vous");
  assert.equal(storeSlug("Bed & Bath"), "bed-and-bath");
  assert.equal(storeSlug("!!!"), "store");

  const dir = storeDirectory([
    deal({ store: "Metro", source: "flyer-links" }),
    deal({ store: "itch.io" }),
    deal({ store: "itch.io" }),
    deal({ store: "Food Bank", category: "food-help" }),
  ]);
  assert.deepEqual(
    dir.map((s) => [s.name, s.count, Boolean(s.flyer), s.foodHelp]),
    [
      ["itch.io", 2, false, false],
      ["Food Bank", 1, false, true],
      ["Metro", 0, true, false],
    ],
  );
});
