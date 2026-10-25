import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deal } from "@shared/deal";
import { DEFAULT_FILTERS, facetCounts } from "@/lib/filters";

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
