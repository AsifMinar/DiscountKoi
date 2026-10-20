import { appendFileSync } from "node:fs";
import type { RunSummary } from "./pipeline";

/** Plain-text summary for the terminal and the GitHub Actions log. */
export function formatSummary(summary: RunSummary, requests: number, seconds: number): string {
  const rows = summary.sources.map((s) => [
    s.name,
    s.label,
    String(s.deals),
    `+${s.added}`,
    `-${s.removed}`,
    String(s.invalid.length),
  ]);
  const header = ["Source", "Status", "Deals", "New", "Removed", "Invalid"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");

  const out = [
    "",
    "Discount Koi scrape summary",
    "===========================",
    line(header),
    line(widths.map((w) => "-".repeat(w))),
    ...rows.map(line),
    "",
    `Total: ${summary.total} deals (+${summary.added} new, -${summary.removed} removed). ` +
      `${requests} requests in ${seconds.toFixed(0)}s.`,
  ];

  const errors = summary.sources.filter((s) => s.error);
  if (errors.length) {
    out.push("", "Errors:", ...errors.map((s) => `  - ${s.name}: ${s.error}`));
  }
  const invalid = summary.sources.filter((s) => s.invalid.length);
  if (invalid.length) {
    out.push("", "Dropped (failed validation):");
    for (const s of invalid) {
      out.push(...s.invalid.slice(0, 10).map((reason) => `  - ${s.name}: ${reason}`));
      if (s.invalid.length > 10) out.push(`  - ${s.name}: …and ${s.invalid.length - 10} more`);
    }
  }
  return out.join("\n");
}

/** Adds a Markdown table to the GitHub Actions run page, when running there. */
export function writeGithubSummary(summary: RunSummary, problem: string | null = null) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const md = [
    "## Discount Koi scrape",
    "",
    ...(problem ? [`> **❌ Run failed: ${problem}.** deals.json was not changed.`, ""] : []),
    "| Source | Status | Deals | New | Removed | Invalid |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...summary.sources.map(
      (s) =>
        `| ${s.name} | ${s.label} | ${s.deals} | +${s.added} | -${s.removed} | ${s.invalid.length} |`,
    ),
    "",
    `**Total:** ${summary.total} deals (+${summary.added} new, -${summary.removed} removed)`,
    ...summary.sources.filter((s) => s.error).map((s) => `- ⚠️ **${s.name}**: ${s.error}`),
    "",
  ].join("\n");
  appendFileSync(file, md);
}
