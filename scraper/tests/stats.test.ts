import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deal } from "@shared/deal";
import { dealStats, timeLeft } from "@/lib/stats";

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

test("dealStats counts live deals, discounts, endings and locations", () => {
  const stats = dealStats(
    [
      deal({ store: "A", discountPercent: 20, salePrice: 8, endDate: TODAY }),
      deal({ store: "B", discountPercent: 60, salePrice: 4, endDate: "2026-10-21" }),
      deal({ store: "B", dealType: ["free"], discountPercent: 100, endDate: "2026-10-25" }),
      deal({ location: "ontario", scrapedAt: "2026-10-20T12:00:00.000Z" }),
      deal({ endDate: "2026-10-19" }), // expired
      deal({ source: "flyer-links" }), // flyer link, not a deal
    ],
    TODAY,
  );
  assert.equal(stats.live, 4);
  assert.equal(stats.stores, 3);
  assert.equal(stats.newToday, 1);
  // Free deals don't pull the average up.
  assert.equal(stats.avgDiscount, 40);
  assert.equal(stats.maxDiscount, 60);
  assert.equal(stats.free, 1);
  assert.deepEqual(
    stats.ending.map((b) => b.count),
    [1, 1, 0, 1],
  );
  assert.equal(stats.endingTotal, 3);
  assert.deepEqual(stats.byLocation, [
    { id: "sudbury", count: 3 },
    { id: "ontario", count: 1 },
    { id: "ships-to-ontario", count: 0 },
  ]);
});

test("dealStats has no average when nothing states a discount", () => {
  assert.equal(dealStats([deal()], TODAY).avgDiscount, null);
});

test("timeLeft shrinks as a deal runs out and never hits zero", () => {
  const week = { startDate: "2026-10-16", endDate: "2026-10-22" };
  assert.equal(timeLeft(deal(week), TODAY), 3 / 7);
  assert.ok(timeLeft(deal({ ...week, endDate: TODAY }), TODAY)! > 0);
  assert.equal(timeLeft(deal({ ongoing: true, endDate: "2026-10-22" }), TODAY), null);
  assert.equal(timeLeft(deal(), TODAY), null);
});
