import { DealSchema, type Deal, type DealsFile } from "@shared/deal";
import { daysBetween, torontoDate } from "@shared/dates";
import { sortDeals } from "@/lib/filters";
import { CONFIG } from "./config";
import { normalizeDeal } from "./normalize";
import type { RawDeal } from "./sources/types";

export type RunStatus = "ok" | "failed" | "blocked" | "disabled" | "not-run";

/** Statuses where the source produced nothing new, so yesterday's deals are kept. */
const KEEPS_PREVIOUS: ReadonlySet<RunStatus> = new Set(["failed", "blocked", "not-run"]);

/** What happened when one source ran. */
export type SourceRun = {
  id: string;
  name: string;
  status: RunStatus;
  raw: RawDeal[];
  error?: string;
};

export type SourceSummary = {
  id: string;
  name: string;
  status: RunStatus;
  /** Shown in the summary table, e.g. "ok", "failed (kept 120)", "skipped (blocked)". */
  label: string;
  deals: number;
  added: number;
  removed: number;
  invalid: string[];
  error?: string;
};

export type RunSummary = {
  sources: SourceSummary[];
  total: number;
  added: number;
  removed: number;
};

/**
 * Returns why a run should count as failed, or null if it's fine. A failed run doesn't
 * save, and in GitHub Actions it turns the workflow red, so GitHub emails the owner.
 */
export function runProblem(summary: RunSummary): string | null {
  const ran = summary.sources.filter((s) => s.status !== "disabled" && s.status !== "not-run");
  if (ran.length > 0 && ran.every((s) => s.status === "failed" || s.status === "blocked")) {
    return "every source failed or was blocked";
  }
  if (summary.total === 0) return "the scrape produced 0 deals";
  return null;
}

/** Ages out deals that have no end date (sooner for freebies). */
function isStale(deal: Deal, today: string): boolean {
  if (deal.endDate || deal.ongoing) return false;
  const maxAge = deal.dealType.includes("free")
    ? CONFIG.maxAgeDaysFreebies
    : CONFIG.maxAgeDaysNoEndDate;
  return daysBetween(torontoDate(new Date(deal.scrapedAt)), today) > maxAge;
}

/**
 * Combines this run's results with the previous deals.json:
 *  - sources that worked contribute their fresh deals (cleaned + validated),
 *  - sources that failed or were blocked keep their deals from last time,
 *  - deals from sources that no longer exist (or are disabled) are dropped,
 *  - expired and stale deals are removed, duplicates are merged,
 * and reports what changed per source.
 */
export function buildDealsFile(
  previous: DealsFile | null,
  runs: SourceRun[],
  now: Date,
): { file: DealsFile; summary: RunSummary } {
  const nowIso = now.toISOString();
  const today = torontoDate(now);
  const previousDeals = (previous?.deals ?? []).filter((d) => DealSchema.safeParse(d).success);
  const previousIds = new Set(previousDeals.map((d) => d.id));
  const firstSeen = new Map(previousDeals.map((d) => [d.id, d.scrapedAt]));

  const collected: Deal[] = [];
  const invalidBySource = new Map<string, string[]>();

  for (const run of runs) {
    if (run.status === "ok") {
      const invalid: string[] = [];
      for (const raw of run.raw) {
        const result = normalizeDeal(raw, run.id, nowIso, firstSeen);
        if (result.ok) collected.push(result.deal);
        else invalid.push(`${result.reason} — "${String(raw.title).slice(0, 60)}"`);
      }
      invalidBySource.set(run.id, invalid);
    } else if (KEEPS_PREVIOUS.has(run.status)) {
      // One broken source must never empty the site: keep what it had yesterday.
      collected.push(...previousDeals.filter((d) => d.source === run.id));
    }
  }

  // First copy of a duplicate wins (sources earlier in the list take priority).
  const unique = new Map<string, Deal>();
  for (const deal of collected) {
    if (!unique.has(deal.id)) unique.set(deal.id, deal);
  }
  const deals = sortDeals(
    [...unique.values()].filter((d) => !(d.endDate && d.endDate < today) && !isStale(d, today)),
    "sudbury",
  );
  const finalIds = new Set(deals.map((d) => d.id));

  const sources: SourceSummary[] = runs.map((run) => {
    const mine = deals.filter((d) => d.source === run.id);
    const kept = KEEPS_PREVIOUS.has(run.status);
    const LABELS: Record<RunStatus, string> = {
      ok: "ok",
      blocked: `skipped (blocked)${mine.length ? `, kept ${mine.length}` : ""}`,
      failed: `failed, kept ${mine.length} from last run`,
      "not-run": `not run, kept ${mine.length}`,
      disabled: "disabled",
    };
    return {
      id: run.id,
      name: run.name,
      status: run.status,
      label: LABELS[run.status],
      deals: mine.length,
      added: kept ? 0 : mine.filter((d) => !previousIds.has(d.id)).length,
      removed: previousDeals.filter((d) => d.source === run.id && !finalIds.has(d.id)).length,
      invalid: invalidBySource.get(run.id) ?? [],
      error: run.error,
    };
  });

  return {
    file: { updatedAt: nowIso, deals },
    summary: {
      sources,
      total: deals.length,
      added: deals.filter((d) => !previousIds.has(d.id)).length,
      removed: previousDeals.filter((d) => !finalIds.has(d.id)).length,
    },
  };
}
