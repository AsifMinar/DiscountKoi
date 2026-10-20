import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deal } from "@shared/deal";
import {
  groupProducts,
  isPriceDrop,
  lowestInSudbury,
  productKey,
  searchProducts,
} from "@shared/products";
import { convertUnitPrice, parseSize, resolveUnitPrice, soldByUnit } from "@shared/units";
import { formatUnitPrice } from "@/lib/format";
import { buildPick, suggestedWeek } from "../add-pick";
import { buildDealsFile } from "../pipeline";
import { applyPriceHistory, previousPriceFor, type PriceHistoryEntry } from "../price-history";
import { picksToDeals } from "../sources/weekly-picks";

const NOW = new Date("2026-10-20T10:05:00Z"); // 6:05 AM in Sudbury
const TODAY = "2026-10-20";

let n = 0;
const deal = (over: Partial<Deal> = {}): Deal => ({
  id: `deal-${++n}`,
  title: "Milk",
  description: "",
  store: "No Frills",
  dealType: ["in-store"],
  category: "grocery",
  location: "sudbury",
  url: "https://store.example/flyer",
  source: "weekly-picks",
  scrapedAt: "2026-10-20T10:00:00.000Z",
  productName: "Milk",
  endDate: "2026-10-28",
  ...over,
});

/* ---------- Unit-price math ---------- */

test("parseSize reads weights, volumes, counts and multipacks", () => {
  assert.deepEqual(parseSize("4 L"), { amount: 4, dimension: "volume", base: 4000 });
  assert.deepEqual(parseSize("355mL"), { amount: 355, dimension: "volume", base: 355 });
  assert.deepEqual(parseSize("12 x 355 mL"), { amount: 4260, dimension: "volume", base: 4260 });
  assert.deepEqual(parseSize("1,5 kg"), { amount: 1.5, dimension: "weight", base: 1500 });
  assert.equal(parseSize("3 lb")?.base.toFixed(2), "1360.78");
  assert.deepEqual(parseSize("dozen"), { amount: 12, dimension: "count", base: 12 });
  assert.deepEqual(parseSize("12 eggs"), { amount: 12, dimension: "count", base: 12 });
  assert.equal(parseSize("family size"), undefined);
  assert.equal(parseSize("2.5 eggs"), undefined);
  assert.equal(parseSize(""), undefined);
});

test("resolveUnitPrice: per package, per weight, and given values", () => {
  // $5.49 for 4 L → $1.3725/L
  assert.deepEqual(resolveUnitPrice({ salePrice: 5.49, size: "4 L" }), {
    unit: "L",
    unitPrice: 1.3725,
  });
  // Small volumes are per 100 mL
  assert.deepEqual(resolveUnitPrice({ salePrice: 1.99, size: "500 mL" }), {
    unit: "100mL",
    unitPrice: 0.398,
  });
  // $5.99 for 400 g → $1.4975 per 100 g
  assert.deepEqual(resolveUnitPrice({ salePrice: 5.99, size: "400 g" }), {
    unit: "100g",
    unitPrice: 1.4975,
  });
  // Pound sizes stay per lb
  assert.deepEqual(resolveUnitPrice({ salePrice: 3.99, size: "3 lb" }), {
    unit: "lb",
    unitPrice: 1.33,
  });
  // $3.99/lb chicken: the price IS the unit price
  assert.deepEqual(resolveUnitPrice({ salePrice: 3.99, unit: "lb" }), {
    unit: "lb",
    unitPrice: 3.99,
  });
  // A dozen eggs → each
  assert.deepEqual(resolveUnitPrice({ salePrice: 3.96, size: "dozen" }), {
    unit: "each",
    unitPrice: 0.33,
  });
  // Asked-for unit wins when it fits the size
  assert.deepEqual(resolveUnitPrice({ salePrice: 8, size: "2 kg", unit: "kg" }), {
    unit: "kg",
    unitPrice: 4,
  });
  // Given unit price is kept
  assert.deepEqual(resolveUnitPrice({ salePrice: 9, unit: "kg", unitPrice: 4.5, size: "2 kg" }), {
    unit: "kg",
    unitPrice: 4.5,
  });
  // Unreadable size, or no price: nothing
  assert.equal(resolveUnitPrice({ salePrice: 2, size: "family pack" }), undefined);
  assert.equal(resolveUnitPrice({ size: "4 L" }), undefined);
});

test("convertUnitPrice and soldByUnit", () => {
  assert.equal(convertUnitPrice(9.9, "kg", "lb"), 4.4906);
  assert.equal(convertUnitPrice(3.99, "lb", "100g"), 0.8796);
  assert.equal(convertUnitPrice(1.5, "L", "100mL"), 0.15);
  assert.equal(convertUnitPrice(1, "L", "kg"), undefined);
  assert.equal(soldByUnit({ salePrice: 3.99, unit: "lb", unitPrice: 3.99 }), true);
  assert.equal(soldByUnit({ salePrice: 5.49, size: "4 L", unit: "L", unitPrice: 1.3725 }), false);
  assert.equal(soldByUnit({ salePrice: 0.5, unit: "each", unitPrice: 0.5 }), false);
});

test("formatUnitPrice", () => {
  assert.equal(formatUnitPrice(1.3725, "L"), "$1.37/L");
  assert.equal(formatUnitPrice(0.8796, "100g"), "$0.88/100 g");
  assert.equal(formatUnitPrice(0.33, "each"), "$0.33 each");
  assert.equal(formatUnitPrice(0.045, "100mL"), "$0.045/100 mL");
});

/* ---------- Comparison and badges ---------- */

test("productKey groups plural and punctuation variants", () => {
  assert.equal(productKey("Chicken Breasts, boneless!"), "chicken breast boneless");
  assert.equal(productKey("Eggs"), productKey("egg"));
  assert.equal(productKey("Strawberries"), productKey("strawberry"));
  assert.equal(productKey("Tomatoes"), productKey("tomato"));
  assert.equal(productKey("Crème fraîche"), "creme fraiche");
});

test("groupProducts puts every store side by side, cheapest per unit first", () => {
  const groups = groupProducts([
    deal({ store: "No Frills", salePrice: 5.49, size: "4 L", unit: "L", unitPrice: 1.3725 }),
    deal({ store: "Metro", salePrice: 2.49, size: "1 L", unit: "L", unitPrice: 2.49 }),
    deal({ store: "Food Basics", salePrice: 5.29, size: "4 L", unit: "L", unitPrice: 1.3225 }),
    deal({ store: "Walmart", productName: "Milk", salePrice: 4.99, size: "family jug" }),
    deal({
      productName: "Bananas",
      title: "Bananas",
      store: "FreshCo",
      salePrice: 0.69,
      unit: "lb",
      unitPrice: 0.69,
    }),
  ]);
  assert.deepEqual(
    groups.map((g) => g.name),
    ["Milk", "Bananas"],
  );
  const milk = groups[0];
  assert.equal(milk.unit, "L");
  assert.equal(milk.stores, 4);
  // Cheapest per litre first; the jug with no readable size can't be compared, so it's last.
  assert.deepEqual(
    milk.deals.map((d) => d.store),
    ["Food Basics", "No Frills", "Metro", "Walmart"],
  );
  assert.deepEqual(
    searchProducts(groups, "milks").map((g) => g.name),
    ["Milk"],
  );
  assert.deepEqual(
    searchProducts(groups, "freshco").map((g) => g.name),
    ["Bananas"],
  );
  assert.equal(searchProducts(groups, "airpods").length, 0);
});

test("lowestInSudbury: per unit across sizes and units, needs 2+ Sudbury stores", () => {
  const a = deal({
    store: "No Frills",
    productName: "Chicken breast",
    salePrice: 3.99,
    unit: "lb",
    unitPrice: 3.99,
  });
  // $9.90/kg = $4.49/lb: more expensive
  const b = deal({
    store: "Metro",
    productName: "Chicken breasts",
    salePrice: 9.9,
    unit: "kg",
    unitPrice: 9.9,
  });
  // Cheaper, but in Ontario, not Sudbury
  const c = deal({
    store: "Online Grocer",
    productName: "Chicken breast",
    salePrice: 3,
    unit: "lb",
    unitPrice: 3,
    location: "ontario",
  });
  // Cheapest of all, but expired
  const d = deal({
    store: "FreshCo",
    productName: "Chicken breast",
    salePrice: 2,
    unit: "lb",
    unitPrice: 2,
    endDate: "2026-10-19",
  });
  // Only one Sudbury store sells eggs: no badge
  const e = deal({
    store: "Metro",
    productName: "Eggs",
    salePrice: 4.49,
    size: "dozen",
    unit: "each",
    unitPrice: 0.3742,
  });
  // Same package size without unit prices: plain price compared
  const f = deal({ store: "Walmart", productName: "AirPods Pro", salePrice: 299 });
  const g = deal({ store: "Best Buy", productName: "AirPods Pro", salePrice: 279 });
  const lowest = lowestInSudbury([a, b, c, d, e, f, g], TODAY);
  assert.deepEqual([...lowest].sort(), [a.id, g.id].sort());
});

test("lowestInSudbury: a tie gives both stores the badge", () => {
  const a = deal({ store: "No Frills", salePrice: 5, size: "4 L", unit: "L", unitPrice: 1.25 });
  const b = deal({ store: "Food Basics", salePrice: 5, size: "4 L", unit: "L", unitPrice: 1.25 });
  assert.equal(lowestInSudbury([a, b], TODAY).size, 2);
});

/* ---------- Price drops and history ---------- */

const entry = (over: Partial<PriceHistoryEntry>): PriceHistoryEntry => ({
  product: "Milk",
  store: "No Frills",
  date: "2026-10-08",
  price: 5.99,
  size: "4 L",
  unit: "L",
  unitPrice: 1.4975,
  ...over,
});

test("price drop: compared with the last earlier listing at the same store", () => {
  const now = {
    productName: "Milk",
    store: "No Frills",
    salePrice: 5.49,
    size: "4 L",
    unit: "L" as const,
    unitPrice: 1.3725,
  };
  const history = [
    entry({ date: "2026-10-01", price: 4.99, unitPrice: 1.2475 }),
    entry({ date: "2026-10-15", price: 5.99, unitPrice: 1.4975 }),
    entry({ date: "2026-10-22", price: 9.99, unitPrice: 2.4975 }), // same day as now: ignored
    entry({ store: "Metro", date: "2026-10-16", price: 7.99 }), // other store: ignored
  ];
  assert.equal(previousPriceFor(now, "2026-10-22", history), 5.99);
  assert.equal(isPriceDrop(deal({ salePrice: 5.49, previousPrice: 5.99 })), true);
  assert.equal(isPriceDrop(deal({ salePrice: 5.49, previousPrice: 5.49 })), false);
  assert.equal(isPriceDrop(deal({ salePrice: 5.49, previousPrice: 4.99 })), false);
});

test("price drop: a smaller package at the same price is not a drop (unit prices compared)", () => {
  // Last week 4 L for $5.49; now 3 L for $5.49 → same amount would have cost $4.12 before.
  const now = {
    productName: "Milk",
    store: "No Frills",
    salePrice: 5.49,
    size: "3 L",
    unit: "L" as const,
    unitPrice: 1.83,
  };
  const previous = previousPriceFor(now, "2026-10-22", [entry({ price: 5.49, unitPrice: 1.3725 })]);
  assert.equal(previous, 4.12);
  assert.equal(isPriceDrop(deal({ salePrice: 5.49, previousPrice: previous })), false);
});

test("price drop: without unit prices, only the same package size is compared", () => {
  const now = { productName: "AirPods Pro", store: "Best Buy", salePrice: 279 };
  const plain = (over: Partial<PriceHistoryEntry>) =>
    entry({
      product: "AirPods Pro",
      store: "Best Buy",
      size: undefined,
      unit: undefined,
      unitPrice: undefined,
      ...over,
    });
  assert.equal(previousPriceFor(now, "2026-10-22", [plain({ price: 329 })]), 329);
  assert.equal(
    previousPriceFor(now, "2026-10-22", [plain({ price: 329, size: "2 pack" })]),
    undefined,
  );
});

test("applyPriceHistory records listings, fills previousPrice, skips samples, prunes after 90 days", () => {
  const current = deal({
    store: "No Frills",
    salePrice: 5.49,
    size: "4 L",
    unit: "L",
    unitPrice: 1.3725,
    startDate: "2026-10-22",
  });
  const sample = deal({
    store: "Metro",
    salePrice: 1,
    size: "1 L",
    unit: "L",
    unitPrice: 1,
    sample: true,
    startDate: "2026-10-22",
  });
  const notProduct = deal({ productName: undefined, salePrice: 2 });
  const { deals, history } = applyPriceHistory(
    [current, sample, notProduct],
    [
      entry({ date: "2026-10-15", price: 5.99, unitPrice: 1.4975 }),
      entry({ date: "2026-07-01", price: 4.0 }), // older than 90 days
    ],
    TODAY,
  );
  assert.equal(deals[0].previousPrice, 5.99);
  assert.equal(deals[1].previousPrice, undefined);
  assert.deepEqual(
    history.map((e) => `${e.date} ${e.store} ${e.price}`),
    ["2026-10-15 No Frills 5.99", "2026-10-22 No Frills 5.49"],
  );
  // Running again the same week doesn't duplicate the entry.
  assert.equal(applyPriceHistory([current], history, TODAY).history.length, 2);
});

/* ---------- Weekly picks file ---------- */

const flyers = new Map([["no frills", "https://www.nofrills.ca/en/deals/flyer"]]);

test("weekly picks: valid entries become product deals with the store's flyer link", () => {
  const { deals, problems } = picksToDeals(
    {
      picks: [
        {
          productName: "Chicken breast",
          store: "No Frills",
          salePrice: 3.99,
          unit: "lb",
          startDate: "2026-10-22",
          endDate: "2026-10-28",
          source: "sample",
        },
        {
          productName: "Milk",
          store: "Metro",
          salePrice: 5.49,
          size: "4 L",
          endDate: "2026-10-28",
          url: "https://www.metro.ca/en/flyer",
        },
        { productName: "Typo", store: "No Frills", salesPrice: 1, endDate: "2026-10-28" },
        { productName: "No link", store: "Corner Store", salePrice: 1, endDate: "2026-10-28" },
        { productName: "Bad date", store: "No Frills", salePrice: 1, endDate: "Oct 28" },
      ],
    },
    flyers,
  );
  assert.equal(deals.length, 2);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /pick #3/);
  assert.match(problems[1], /no link for "Corner Store"/);
  assert.match(problems[2], /endDate/);

  const { file } = buildDealsFile(
    null,
    [{ id: "weekly-picks", name: "w", status: "ok", raw: deals }],
    NOW,
  );
  const chicken = file.deals.find((d) => d.productName === "Chicken breast")!;
  assert.equal(chicken.url, "https://www.nofrills.ca/en/deals/flyer");
  assert.equal(chicken.unit, "lb");
  assert.equal(chicken.unitPrice, 3.99);
  assert.equal(chicken.sample, true);
  assert.match(chicken.description, /Oct 22–28/);
  const milk = file.deals.find((d) => d.productName === "Milk")!;
  assert.equal(milk.title, "Milk, 4 L");
  assert.equal(milk.unitPrice, 1.3725);
  assert.equal(milk.sample, undefined);
});

test("weekly picks: the same product picked again next week is a new listing", () => {
  const week = (start: string, end: string) =>
    picksToDeals(
      {
        picks: [
          {
            productName: "Milk",
            store: "No Frills",
            salePrice: 5.49,
            size: "4 L",
            startDate: start,
            endDate: end,
          },
        ],
      },
      flyers,
    ).deals;
  const ids = buildDealsFile(
    null,
    [
      {
        id: "weekly-picks",
        name: "w",
        status: "ok",
        raw: [...week("2026-10-15", "2026-10-21"), ...week("2026-10-22", "2026-10-28")],
      },
    ],
    NOW,
  ).file.deals.map((d) => d.id);
  assert.equal(new Set(ids).size, 2);
});

/* ---------- npm run add-pick ---------- */

test("add-pick suggests this flyer week, or next week's on the last days", () => {
  assert.deepEqual(suggestedWeek("2026-10-17", "thu"), { start: "2026-10-15", end: "2026-10-21" });
  // Tuesday Oct 20: the Thursday flyer ends tomorrow, so suggest the new one.
  assert.deepEqual(suggestedWeek(TODAY, "thu"), { start: "2026-10-22", end: "2026-10-28" });
});

test("add-pick turns answers into a valid pick, or says what's wrong", () => {
  const base = {
    store: "No Frills",
    productName: "Chicken breast",
    salePrice: "$3.99",
    pricing: "lb" as const,
    endDate: "2026-10-28",
  };
  const ok = buildPick({
    ...base,
    originalPrice: "5.99",
    startDate: "2026-10-22",
    category: "grocery",
  });
  assert.ok("pick" in ok);
  assert.deepEqual(ok.pick, {
    productName: "Chicken breast",
    store: "No Frills",
    salePrice: 3.99,
    unit: "lb",
    originalPrice: 5.99,
    startDate: "2026-10-22",
    endDate: "2026-10-28",
    category: "grocery",
  });
  const pack = buildPick({ ...base, pricing: "package", size: "4 L" });
  assert.ok("pick" in pack && pack.pick.size === "4 L" && pack.pick.unit === undefined);
  assert.deepEqual(buildPick({ ...base, salePrice: "free?" }), {
    error: "the sale price must be a number, e.g. 3.99",
  });
  assert.match((buildPick({ ...base, endDate: "28/10" }) as { error: string }).error, /endDate/);
  assert.match((buildPick({ ...base, category: "toys" }) as { error: string }).error, /category/);
  assert.deepEqual(buildPick({ ...base, startDate: "2026-10-29" }), {
    error: "the first day is after the last day",
  });
});
