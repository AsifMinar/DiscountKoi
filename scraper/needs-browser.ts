/**
 * Prints whether any enabled source needs headless Chromium, and writes
 * `browser=true|false` to $GITHUB_OUTPUT so the daily workflow can skip installing
 * the browser when nothing uses it.
 */
import { appendFileSync } from "node:fs";
import { SOURCES } from "./sources";

const users = SOURCES.filter((s) => s.enabled && s.needsBrowser).map((s) => s.name);
const needed = users.length > 0;
console.log(
  needed ? `Chromium needed by: ${users.join(", ")}` : "No enabled source needs Chromium.",
);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `browser=${needed}\n`);
