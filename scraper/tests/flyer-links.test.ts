import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { possessive } from "../lib/text";
import { buildDealsFile } from "../pipeline";
import { buildFlyerCards, FLYER_STORES_FILE, flyerWeek, weekLabel } from "../sources/flyer-links";

// Tuesday, Oct 20 2026, 6:05 AM in Sudbury.
const NOW = new Date("2026-10-20T10:05:00Z");

test("finds the flyer week that contains today", () => {
  assert.deepEqual(flyerWeek("2026-10-20", "thu"), { start: "2026-10-15", end: "2026-10-21" });
  assert.deepEqual(flyerWeek("2026-10-20", "sat"), { start: "2026-10-17", end: "2026-10-23" });
  assert.deepEqual(flyerWeek("2026-10-20", "tue"), { start: "2026-10-20", end: "2026-10-26" });
  assert.deepEqual(flyerWeek("2026-10-22", "thu"), { start: "2026-10-22", end: "2026-10-28" });
});

test("labels weeks within and across months", () => {
  assert.equal(weekLabel("2026-10-22", "2026-10-28"), "Oct 22–28");
  assert.equal(weekLabel("2026-10-29", "2026-11-04"), "Oct 29 – Nov 4");
});

test("the real data/flyer-stores.json produces one valid card per store", () => {
  const file = JSON.parse(readFileSync(FLYER_STORES_FILE, "utf8"));
  const cards = buildFlyerCards(file, NOW);
  assert.equal(cards.length, file.stores.length);

  const { file: deals, summary } = buildDealsFile(
    null,
    [{ id: "flyer-links", name: "Flyers", status: "ok", raw: cards }],
    NOW,
  );
  assert.equal(summary.sources[0].invalid.length, 0, summary.sources[0].invalid.join("\n"));
  assert.equal(deals.deals.length, file.stores.length);
  assert.ok(deals.deals.every((d) => d.location === "sudbury" && d.endDate && d.startDate));
  assert.ok(
    deals.deals.every((d) => !d.dealType.includes("free")),
    "flyers aren't free stuff",
  );
});

test("store names ending in s get a correct possessive (Food Basics' site, not Basics's)", () => {
  const cards = buildFlyerCards(JSON.parse(readFileSync(FLYER_STORES_FILE, "utf8")), NOW);
  const text = (store: string) => cards.find((c) => c.store === store)?.description ?? "";
  assert.match(text("Food Basics"), /on Food Basics' site/);
  assert.match(text("No Frills"), /on No Frills' site/);
  assert.match(text("Metro"), /on Metro's site/);
  assert.match(text("Shoppers Drug Mart"), /on Shoppers Drug Mart's site/);
  assert.ok(cards.every((c) => !/s's /.test(c.description ?? "")));
  assert.equal(possessive("Giant Tiger"), "Giant Tiger's");
});

test("next week's card replaces this week's", () => {
  const file = {
    stores: [
      { store: "No Frills", url: "https://www.nofrills.ca/en/deals/flyer", startsOn: "thu" },
    ],
  };
  const run = (now: Date, prev: Parameters<typeof buildDealsFile>[0]) =>
    buildDealsFile(
      prev,
      [{ id: "flyer-links", name: "F", status: "ok", raw: buildFlyerCards(file, now) }],
      now,
    );

  const tuesday = run(NOW, null);
  const thursday = run(new Date("2026-10-22T10:05:00Z"), tuesday.file);
  assert.equal(thursday.file.deals.length, 1);
  assert.match(thursday.file.deals[0].title, /Oct 22–28/);
  assert.equal(thursday.summary.added, 1);
  assert.equal(thursday.summary.removed, 1);
});
