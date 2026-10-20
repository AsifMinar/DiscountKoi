import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldRun } from "../time-gate";

test("summer (EDT, UTC-4): the 10:00 UTC run goes, the 11:00 UTC run is skipped", () => {
  assert.equal(shouldRun(new Date("2026-07-15T10:00:00Z"), "2026-07-14T10:03:00Z").run, true);
  assert.equal(shouldRun(new Date("2026-07-15T11:00:00Z"), "2026-07-15T10:03:00Z").run, false);
});

test("winter (EST, UTC-5): the 10:00 UTC run is too early, the 11:00 UTC run goes", () => {
  assert.equal(shouldRun(new Date("2026-01-15T10:00:00Z"), "2026-01-14T11:03:00Z").run, false);
  assert.equal(shouldRun(new Date("2026-01-15T11:00:00Z"), "2026-01-14T11:03:00Z").run, true);
});

test("if GitHub drops the 6 AM run, the 7 AM run catches up", () => {
  assert.equal(shouldRun(new Date("2026-07-15T11:20:00Z"), "2026-07-14T10:03:00Z").run, true);
});

test("a manual run in the middle of the night doesn't block the morning run", () => {
  assert.equal(shouldRun(new Date("2026-07-15T10:00:00Z"), "2026-07-15T06:00:00Z").run, true);
});

test("never runs outside the window", () => {
  assert.equal(shouldRun(new Date("2026-07-15T16:00:00Z"), null).run, false);
});
