import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDealsFile, runProblem, type SourceRun } from "../pipeline";
import type { RawDeal } from "../sources/types";

const NOW = new Date("2026-10-20T10:05:00Z"); // 6:05 AM in Sudbury

const raw = (over: Partial<RawDeal> = {}): RawDeal => ({
  title: "Avocados, bag of 4",
  url: "https://store.example/avocados",
  store: "FreshCo",
  location: "sudbury",
  originalPrice: 5.99,
  salePrice: 3.49,
  endDate: "2026-10-22",
  ...over,
});

const ok = (id: string, deals: RawDeal[]): SourceRun => ({
  id,
  name: id,
  status: "ok",
  raw: deals,
});

test("cleans, completes and validates fresh deals", () => {
  const { file, summary } = buildDealsFile(
    null,
    [
      ok("flyers", [
        raw({ title: "<b>Avocados</b> &amp; limes", description: "<script>x()</script>Fresh" }),
      ]),
    ],
    NOW,
  );
  const [deal] = file.deals;
  assert.equal(deal.title, "Avocados & limes");
  assert.equal(deal.description, "Fresh");
  assert.equal(deal.discountPercent, 42);
  assert.equal(deal.category, "grocery");
  assert.deepEqual(deal.dealType, ["in-store"]);
  assert.equal(deal.scrapedAt, NOW.toISOString());
  assert.equal(summary.sources[0].added, 1);
});

test("drops invalid deals and reports them", () => {
  const { file, summary } = buildDealsFile(
    null,
    [
      ok("flyers", [
        raw(),
        raw({ title: "Bad link", url: "javascript:alert(1)" }),
        raw({ title: "  " }),
      ]),
    ],
    NOW,
  );
  assert.equal(file.deals.length, 1);
  assert.equal(summary.sources[0].invalid.length, 2);
});

test("a failed or blocked source keeps yesterday's deals", () => {
  const first = buildDealsFile(
    null,
    [
      ok("flyers", [raw()]),
      ok("rfd", [raw({ title: "TV", url: "https://rfd.example/1", location: "ships-to-ontario" })]),
    ],
    NOW,
  );
  const later = new Date("2026-10-21T10:05:00Z");
  const { file, summary } = buildDealsFile(
    first.file,
    [
      { id: "flyers", name: "flyers", status: "failed", raw: [], error: "timeout" },
      { id: "rfd", name: "rfd", status: "blocked", raw: [], error: "HTTP 403" },
    ],
    later,
  );
  assert.equal(file.deals.length, 2);
  assert.equal(summary.sources[0].label, "failed, kept 1 from last run");
  assert.equal(summary.sources[1].label, "skipped (blocked), kept 1");
});

test("keeps first-seen date, removes expired, stale and orphaned deals", () => {
  const first = buildDealsFile(
    null,
    [
      ok("flyers", [
        raw(),
        raw({ title: "No end date", url: "https://s.example/a", endDate: undefined }),
        raw({ title: "Free sample", url: "https://s.example/b", endDate: undefined, salePrice: 0 }),
      ]),
      ok("old-source", [raw({ title: "Orphan", url: "https://s.example/c" })]),
    ],
    NOW,
  );
  assert.equal(first.file.deals.length, 4);

  // 9 days later: the avocado deal has expired, the freebie is past 7 days,
  // the no-end-date deal (14 days) survives, and "old-source" no longer exists.
  const later = new Date("2026-10-29T10:05:00Z");
  const again = buildDealsFile(
    first.file,
    [
      ok("flyers", [
        raw(),
        raw({ title: "No end date", url: "https://s.example/a", endDate: undefined }),
        raw({ title: "Free sample", url: "https://s.example/b", endDate: undefined, salePrice: 0 }),
      ]),
    ],
    later,
  );
  assert.deepEqual(
    again.file.deals.map((d) => d.title),
    ["No end date"],
  );
  assert.equal(again.file.deals[0].scrapedAt, NOW.toISOString(), "first-seen date is kept");
  assert.equal(again.summary.removed, 3);

  // 15 days after first seen, the no-end-date deal ages out too.
  const muchLater = new Date("2026-11-04T10:05:00Z");
  const third = buildDealsFile(
    again.file,
    [ok("flyers", [raw({ title: "No end date", url: "https://s.example/a", endDate: undefined })])],
    muchLater,
  );
  assert.equal(third.file.deals.length, 0);
});

test("duplicates are merged, first source wins", () => {
  const { file } = buildDealsFile(null, [ok("flyers", [raw(), raw()])], NOW);
  assert.equal(file.deals.length, 1);
});

test("sample data is dropped on the first real run", () => {
  const sample = buildDealsFile(null, [ok("sample", [raw()])], NOW).file;
  const { file, summary } = buildDealsFile(sample, [ok("flyers", [raw({ title: "Real" })])], NOW);
  assert.deepEqual(
    file.deals.map((d) => d.title),
    ["Real"],
  );
  assert.equal(summary.removed, 1);
});

test("runProblem: a healthy run passes", () => {
  const { summary } = buildDealsFile(null, [ok("flyers", [raw()])], NOW);
  assert.equal(runProblem(summary), null);
});

test("runProblem: 0 deals fails the run", () => {
  const { summary } = buildDealsFile(null, [ok("flyers", [])], NOW);
  assert.match(runProblem(summary) ?? "", /0 deals/);
});

test("runProblem: every source failing fails the run, even if old deals were kept", () => {
  const first = buildDealsFile(null, [ok("flyers", [raw()])], NOW);
  const { summary } = buildDealsFile(
    first.file,
    [{ id: "flyers", name: "flyers", status: "failed", raw: [], error: "boom" }],
    NOW,
  );
  assert.equal(summary.total, 1, "the old deal is still kept");
  assert.match(runProblem(summary) ?? "", /every source failed/);
});

test("runProblem: one failure among working sources is fine", () => {
  const { summary } = buildDealsFile(
    null,
    [ok("flyers", [raw()]), { id: "rfd", name: "rfd", status: "blocked", raw: [], error: "403" }],
    NOW,
  );
  assert.equal(runProblem(summary), null);
});

test("runProblem: disabled and not-run sources don't count as failures", () => {
  const { summary } = buildDealsFile(
    null,
    [ok("flyers", [raw()]), { id: "rfd", name: "rfd", status: "disabled", raw: [] }],
    NOW,
  );
  assert.equal(runProblem(summary), null);
});
