import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldRun } from "../time-gate";

// The workflow fires at 10:00 and 11:00 UTC every day. These tests replay both firings.

test("summer (EDT, UTC-4): the 10:00 UTC run goes, the 11:00 UTC run is skipped", () => {
  assert.equal(shouldRun(new Date("2026-07-15T10:00:00Z"), "2026-07-14T10:03:00Z").run, true);
  assert.equal(shouldRun(new Date("2026-07-15T11:00:00Z"), "2026-07-15T10:03:00Z").run, false);
});

test("winter (EST, UTC-5): the 10:00 UTC run is too early, the 11:00 UTC run goes", () => {
  assert.equal(shouldRun(new Date("2026-01-15T10:00:00Z"), "2026-01-14T11:03:00Z").run, false);
  assert.equal(shouldRun(new Date("2026-01-15T11:00:00Z"), "2026-01-14T11:03:00Z").run, true);
});

test("already ran today: a second run in the window is skipped (EDT and EST)", () => {
  const edt = shouldRun(new Date("2026-07-15T11:30:00Z"), "2026-07-15T10:04:00Z");
  assert.equal(edt.run, false);
  assert.match(edt.reason, /already ran today/);
  const est = shouldRun(new Date("2026-01-15T12:30:00Z"), "2026-01-15T11:04:00Z");
  assert.equal(est.run, false);
  assert.match(est.reason, /already ran today/);
});

test("a manual run earlier the same morning counts as today's run", () => {
  // Manual run at 6:20 AM EDT, scheduled 7 AM run is skipped.
  assert.equal(shouldRun(new Date("2026-07-15T11:00:00Z"), "2026-07-15T10:20:00Z").run, false);
});

test("if GitHub drops the 6 AM run, the 7 AM run catches up", () => {
  assert.equal(shouldRun(new Date("2026-07-15T11:20:00Z"), "2026-07-14T10:03:00Z").run, true);
});

test("a manual run in the middle of the night doesn't block the morning run", () => {
  assert.equal(shouldRun(new Date("2026-07-15T10:00:00Z"), "2026-07-15T06:00:00Z").run, true);
});

test("daylight saving switch days (2026: Mar 8 forward, Nov 1 back)", () => {
  // Mar 8: clocks go forward at 2 AM, so 10:00 UTC is already 6 AM EDT.
  assert.equal(shouldRun(new Date("2026-03-08T10:00:00Z"), "2026-03-07T11:02:00Z").run, true);
  // Nov 1: clocks go back at 2 AM, so 10:00 UTC is 5 AM EST and 11:00 UTC is 6 AM.
  assert.equal(shouldRun(new Date("2026-11-01T10:00:00Z"), "2026-10-31T10:02:00Z").run, false);
  assert.equal(shouldRun(new Date("2026-11-01T11:00:00Z"), "2026-10-31T10:02:00Z").run, true);
});

test("GitHub starting the run hours late still scrapes, once", () => {
  // Real delays seen in Oct 2026: the 10:00 UTC run started at 14:00 and 14:39 UTC.
  assert.equal(shouldRun(new Date("2026-10-25T14:00:05Z"), "2026-10-20T08:45:16Z").run, true);
  assert.equal(shouldRun(new Date("2026-10-25T14:39:11Z"), "2026-10-25T14:01:30Z").run, false);
  // The 16:00 UTC backup (noon EDT) catches up if both morning runs were dropped.
  assert.equal(shouldRun(new Date("2026-07-15T16:00:00Z"), "2026-07-14T10:03:00Z").run, true);
  // 11:59 PM EDT is still today.
  assert.equal(shouldRun(new Date("2026-07-16T03:59:00Z"), "2026-07-14T10:03:00Z").run, true);
});

test("never runs before 6 AM", () => {
  assert.equal(shouldRun(new Date("2026-07-15T09:59:00Z"), null).run, false); // 5:59 AM EDT
  assert.equal(shouldRun(new Date("2026-07-15T04:00:00Z"), null).run, false); // midnight EDT
});

test("first ever run (no deals.json yet) goes ahead in the window", () => {
  assert.equal(shouldRun(new Date("2026-07-15T10:00:00Z"), null).run, true);
});
