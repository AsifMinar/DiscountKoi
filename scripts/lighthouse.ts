/**
 * Runs Lighthouse (mobile and desktop) on the built site and prints the scores.
 *
 *   npm run build && npm run lighthouse
 *
 * Uses Lighthouse through npx (not a dependency of the project) and Playwright's
 * Chromium. Each page is measured 3 times and the median run is reported, as Lighthouse
 * recommends (single runs vary by a few points). Reports: screenshots/lighthouse/ (git-ignored).
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const LIGHTHOUSE = "lighthouse@13.5.0";
const PORT = Number(process.env.LIGHTHOUSE_PORT ?? 4181);
const BASE = `http://localhost:${PORT}/DiscountKoi`;
const OUT = join("screenshots", "lighthouse");
const PAGES = ["/", "/products/", "/student/", "/free/", "/about/"];
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;
const RUNS = Number(process.env.LIGHTHOUSE_RUNS ?? 3);

type Report = {
  categories: Record<string, { score: number | null }>;
  audits: Record<string, { score: number | null; title: string; scoreDisplayMode: string }>;
};

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/`)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Preview server didn't start on port ${PORT}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = spawn(process.execPath, ["scripts/preview.mjs"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  const rows: string[][] = [];
  const failing = new Set<string>();
  try {
    await waitForServer();
    for (const form of ["mobile", "desktop"] as const) {
      for (const path of PAGES) {
        const page = `${form}${path.replace(/\//g, "-").replace(/-$/, "") || "-home"}`;
        const runs: Report[] = [];
        for (let run = 1; run <= RUNS; run++) {
          const name = `${page}-${run}`;
          const result = spawnSync(
            "npx",
            [
              "--yes",
              LIGHTHOUSE,
              `${BASE}${path}`,
              "--quiet",
              "--output=json",
              "--output=html",
              `--output-path=${join(OUT, name)}`,
              `--only-categories=${CATEGORIES.join(",")}`,
              '--chrome-flags="--headless=new --no-sandbox"',
              ...(form === "desktop" ? ["--preset=desktop"] : []),
            ],
            { shell: true, env: { ...process.env, CHROME_PATH: chromium.executablePath() } },
          );
          if (result.status !== 0) {
            throw new Error(
              `Lighthouse failed on ${path}: ${result.stderr?.toString().slice(-500)}`,
            );
          }
          runs.push(JSON.parse(readFileSync(join(OUT, `${name}.report.json`), "utf8")) as Report);
        }
        const perf = (r: Report) => r.categories.performance?.score ?? 0;
        const report = [...runs].sort((a, b) => perf(a) - perf(b))[Math.floor(runs.length / 2)];
        const scores = CATEGORIES.map((c) => Math.round((report.categories[c]?.score ?? 0) * 100));
        rows.push([form, path, ...scores.map(String)]);
        for (const audit of Object.values(report.audits)) {
          if (audit.scoreDisplayMode === "binary" && audit.score === 0) {
            failing.add(`${audit.title} (${form} ${path})`);
          }
        }
        process.stdout.write(".");
      }
    }
  } finally {
    server.kill();
  }

  const header = ["Form", "Page", "Perf", "A11y", "Best pr.", "SEO"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(`\n\n${line(header)}\n${line(widths.map((w) => "-".repeat(w)))}`);
  rows.forEach((r) => console.log(line(r)));
  if (failing.size)
    console.log(`\nFailed audits:\n${[...failing].map((f) => `  - ${f}`).join("\n")}`);
  console.log(`\nFull reports: ${OUT}/*.report.html`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
