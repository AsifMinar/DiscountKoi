/**
 * Approves a "Submit a deal" submission and puts it on the site.
 *
 *   npm run approve-deal -- 42           (42 = the GitHub issue number)
 *   npm run approve-deal -- 42 --yes     (skip the "Add it?" question)
 *
 * Reads the issue through GitHub's public API (no login needed), checks every field,
 * shows you the result, adds it to data/manual-deals.json and refreshes data/deals.json.
 * Then commit and push both files, and close the issue on GitHub.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { torontoDate } from "@shared/dates";
import { MANUAL_DEALS_FILE } from "../scraper/sources/manual-deals";
import { addManualDeal, submissionToDeal } from "../scraper/submissions";

const REPO = process.env.GITHUB_REPOSITORY ?? "AsifMinar/DiscountKoi";

type Issue = {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  pull_request?: unknown;
};

async function fetchIssue(number: number): Promise<Issue> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues/${number}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "DiscountKoi-approve-deal",
      "x-github-api-version": "2022-11-28",
      // Optional: a token only raises GitHub's rate limit. Never required.
      ...(process.env.GITHUB_TOKEN && { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 404) throw new Error(`Issue #${number} doesn't exist in ${REPO}.`);
  if (!res.ok) throw new Error(`GitHub answered ${res.status}. Try again in a minute.`);
  return (await res.json()) as Issue;
}

async function main() {
  const args = process.argv.slice(2);
  const number = Number(args.find((a) => /^\d+$/.test(a)));
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error("Give the issue number, e.g. npm run approve-deal -- 42");
  }

  const issue = await fetchIssue(number);
  if (issue.pull_request) throw new Error(`#${number} is a pull request, not a submission.`);
  if (issue.state !== "open")
    throw new Error(`Issue #${number} is closed. Reopen it to approve it.`);

  const result = submissionToDeal(issue.body ?? "", number, torontoDate());
  if (!result.ok) {
    console.error(`\n✗ Issue #${number} can't be approved as it is:`);
    result.errors.forEach((e) => console.error(`  - ${e}`));
    console.error(`\nYou could reply on ${issue.html_url} and ask for a fix.`);
    process.exitCode = 1;
    return;
  }

  const file = JSON.parse(readFileSync(MANUAL_DEALS_FILE, "utf8")) as { deals?: unknown[] };
  const added = addManualDeal(file, result.deal);
  if (!added.ok) throw new Error(added.error);

  console.log(`\nIssue #${number}: ${issue.html_url}\n`);
  for (const [key, value] of Object.entries(result.deal)) {
    console.log(`  ${key.padEnd(14)} ${Array.isArray(value) ? value.join(", ") : value}`);
  }
  console.log("\nOpen the link above and check it really is a public, current deal.");

  if (!args.includes("--yes")) {
    const rl = createInterface({ input, output });
    const answer = (await rl.question("\nAdd it to the site? (y/n) [n]: ")).trim();
    rl.close();
    if (!/^y/i.test(answer)) {
      console.log("Nothing saved.");
      return;
    }
  }

  writeFileSync(MANUAL_DEALS_FILE, `${JSON.stringify(added.file, null, 2)}\n`);
  console.log(`✓ Added to ${MANUAL_DEALS_FILE}. Updating data/deals.json…\n`);
  spawnSync("npm", ["run", "--silent", "scrape:local"], { stdio: "inherit", shell: true });
  console.log(
    `\nNext: commit and push data/manual-deals.json and data/deals.json, then close ${issue.html_url}`,
  );
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
