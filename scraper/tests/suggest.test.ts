import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deal } from "@shared/deal";
import { DEFAULT_FILTERS } from "@/lib/filters";
import { countWithoutFilters, editDistance, spellingSuggestion } from "@/lib/suggest";

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
  source: "test-source",
  scrapedAt: "2026-10-18T10:00:00.000Z",
  ...over,
});

const deals = [
  deal({ title: "Pizza night special", store: "Metro" }),
  deal({ title: "Coffee beans", store: "Food Basics", dealType: ["online"] }),
];

test("editDistance counts edits, including swapped letters", () => {
  assert.equal(editDistance("metro", "metro"), 0);
  assert.equal(editDistance("mtero", "metro"), 1);
  assert.equal(editDistance("piza", "pizza"), 1);
  assert.equal(editDistance("abc", "xyzxyz"), 3);
});

test("spellingSuggestion fixes typos only when the fix finds deals", () => {
  const f = (q: string) => ({ ...DEFAULT_FILTERS, q });
  assert.deepEqual(spellingSuggestion(deals, f("cofee"), TODAY), { query: "coffee", count: 1 });
  assert.deepEqual(spellingSuggestion(deals, f("mtero piza"), TODAY), {
    query: "metro pizza",
    count: 1,
  });
  assert.equal(spellingSuggestion(deals, f("metro"), TODAY), null);
  assert.equal(spellingSuggestion(deals, f("unicorn"), TODAY), null);
  // A fix that the filters would still hide isn't offered.
  assert.equal(spellingSuggestion(deals, { ...f("cofee"), channel: "in-store" }, TODAY), null);
});

test("countWithoutFilters keeps the search but drops the filters", () => {
  const filters = { ...DEFAULT_FILTERS, q: "coffee", channel: "in-store" as const };
  assert.equal(countWithoutFilters(deals, filters, TODAY), 1);
});
