/**
 * Runs every enabled source, merges the results with yesterday's deals and writes
 * data/deals.json.
 *
 *   npm run scrape                   run all sources and save
 *   npm run scrape -- --dry-run      run, print the summary, don't save
 *   npm run scrape -- --only=<id>    run one source (others keep their current deals)
 *   npm run scrape:local             run only the sources that read files in this repo
 *                                    (flyer links, weekly picks, manual deals…), no web
 *                                    requests. Keeps updatedAt, so the 6 AM run still happens.
 *
 * Also keeps data/price-history.json up to date (for the "Price drop" badge).
 *
 * Exits with an error (and saves nothing) if the run produced 0 deals or every source
 * failed, so the daily GitHub workflow turns red and GitHub emails you.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { torontoDate } from "@shared/dates";
import { DealsFileSchema, type DealsFile } from "@shared/deal";
import { CONFIG } from "./config";
import { BlockedError, PoliteFetcher } from "./lib/http";
import { buildDealsFile, runProblem, type SourceRun } from "./pipeline";
import {
  PRICE_HISTORY_FILE,
  applyPriceHistory,
  readPriceHistory,
  serializePriceHistory,
} from "./price-history";
import { formatSummary, writeGithubSummary } from "./report";
import { SOURCES } from "./sources";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const localOnly = args.includes("--local");

const log = (message: string) =>
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

function readPrevious(): DealsFile | null {
  try {
    const parsed = DealsFileSchema.parse(JSON.parse(readFileSync(CONFIG.dealsFile, "utf8")));
    return parsed as DealsFile;
  } catch (error) {
    log(`No usable previous ${CONFIG.dealsFile} (${(error as Error).message}); starting fresh.`);
    return null;
  }
}

async function main() {
  const now = new Date();
  const started = now.getTime();
  const previous = readPrevious();
  const http = new PoliteFetcher(log);
  const runs: SourceRun[] = [];

  if (only && !SOURCES.some((s) => s.id === only)) {
    throw new Error(`Unknown source "${only}". Known: ${SOURCES.map((s) => s.id).join(", ")}`);
  }

  try {
    // One source at a time, never in parallel, to stay gentle on every site.
    for (const source of SOURCES) {
      const base = { id: source.id, name: source.name, raw: [] };
      if (!source.enabled) {
        runs.push({ ...base, status: "disabled" });
        continue;
      }
      if ((only && source.id !== only) || (localOnly && !source.local)) {
        // Not run this time, so its current deals are kept as they are.
        runs.push({ ...base, status: "not-run" });
        continue;
      }
      log(`▶ ${source.name}`);
      try {
        const raw = await source.fetchDeals({ http, log: (m) => log(`  ${m}`), now });
        runs.push({ ...base, status: "ok", raw });
        log(`  ✓ ${raw.length} deals found`);
      } catch (error) {
        const blocked = error instanceof BlockedError;
        const message = error instanceof Error ? error.message : String(error);
        runs.push({ ...base, status: blocked ? "blocked" : "failed", error: message });
        log(`  ✗ ${blocked ? "skipped (blocked)" : "failed"}: ${message}`);
      }
    }
  } finally {
    await http.close();
  }

  const built = buildDealsFile(previous, runs, now);
  const { summary } = built;
  const problem = runProblem(summary);
  const priced = applyPriceHistory(built.file.deals, readPriceHistory(), torontoDate(now));
  const file: DealsFile = {
    // A local-only run isn't the daily check, so "Last updated" (and the time gate) stay put.
    updatedAt: localOnly && previous ? previous.updatedAt : built.file.updatedAt,
    deals: priced.deals,
  };
  console.log(formatSummary(summary, http.requestCount, (Date.now() - started) / 1000));
  writeGithubSummary(summary, problem);

  if (problem) {
    console.error(`\n✗ Run failed: ${problem}. deals.json was not changed.`);
    process.exitCode = 1;
  } else if (dryRun) {
    log("Dry run: deals.json was not changed.");
  } else {
    writeFileSync(CONFIG.dealsFile, `${JSON.stringify(file, null, 2)}\n`);
    writeFileSync(PRICE_HISTORY_FILE, serializePriceHistory(priced.history));
    log(`Saved ${file.deals.length} deals to ${CONFIG.dealsFile}`);
    log(`Saved ${priced.history.length} price history entries to ${PRICE_HISTORY_FILE}`);
  }
}

main().catch((error) => {
  // Only reached for problems outside any single source (e.g. can't write the file).
  console.error(error);
  process.exit(1);
});
