/**
 * Decides whether a *scheduled* run should go ahead.
 *
 * GitHub's cron runs in UTC and Sudbury switches between EDT and EST, so the workflow
 * fires at both 10:00 and 11:00 UTC. This check lets exactly one of them through:
 * it must be 6:00–7:59 AM in Sudbury, and the scraper must not have run yet today.
 * (If the 6 AM run is delayed or dropped by GitHub, the 7 AM one catches up.)
 *
 * Prints the decision and writes `run=true|false` to $GITHUB_OUTPUT for later steps.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { torontoDate, torontoHour } from "@shared/dates";
import { CONFIG } from "./config";

export function shouldRun(now: Date, lastUpdated: string | null): { run: boolean; reason: string } {
  const hour = torontoHour(now);
  const { fromHour, toHour } = CONFIG.runWindow;
  if (hour < fromHour || hour >= toHour) {
    return {
      run: false,
      reason: `it's ${hour}:00 in Sudbury, outside the ${fromHour}–${toHour} AM window`,
    };
  }
  if (lastUpdated) {
    const last = new Date(lastUpdated);
    if (torontoDate(last) === torontoDate(now) && torontoHour(last) >= fromHour) {
      return { run: false, reason: `already ran today at ${last.toISOString()}` };
    }
  }
  return { run: true, reason: `it's ${hour}:00 in Sudbury and today's run hasn't happened yet` };
}

function lastUpdatedAt(): string | null {
  try {
    return (
      (JSON.parse(readFileSync(CONFIG.dealsFile, "utf8")) as { updatedAt?: string }).updatedAt ??
      null
    );
  } catch {
    return null;
  }
}

// Only run the CLI part when executed directly (not when imported by tests).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("scraper/time-gate.ts")) {
  const { run, reason } = shouldRun(new Date(), lastUpdatedAt());
  console.log(`${run ? "Running" : "Skipping"}: ${reason}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
}
