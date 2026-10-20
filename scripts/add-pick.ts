/**
 * Adds one product pick to data/weekly-picks.json by asking a few questions.
 *
 *   npm run add-pick
 *
 * It checks the answers, saves the pick, then refreshes data/deals.json (no web
 * requests) so you can preview it with `npm run dev` and commit both files.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { torontoDate } from "@shared/dates";
import { CATEGORY_IDS } from "@shared/taxonomy";
import { buildPick, describePick, suggestedWeek, type PickAnswers } from "../scraper/add-pick";
import { FLYER_STORES_FILE } from "../scraper/sources/flyer-links";
import { WEEKLY_PICKS_FILE } from "../scraper/sources/weekly-picks";

type FlyerStore = { store: string; url: string; startsOn: Parameters<typeof suggestedWeek>[1] };

const rl = createInterface({ input, output });

async function ask(question: string, fallback?: string): Promise<string> {
  const hint = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${question}${hint}: `)).trim();
  return answer || fallback || "";
}

async function main() {
  const stores = (JSON.parse(readFileSync(FLYER_STORES_FILE, "utf8")) as { stores: FlyerStore[] })
    .stores;
  const file = JSON.parse(readFileSync(WEEKLY_PICKS_FILE, "utf8")) as { picks: unknown[] };
  const today = torontoDate();

  console.log("\nAdd a weekly pick (press Enter to accept the [suggestion]).\n");
  stores.forEach((s, i) => console.log(`  ${i + 1}. ${s.store}`));
  const storeAnswer = await ask("\nStore (number from the list, or type a name)");
  const known =
    stores[Number(storeAnswer) - 1] ??
    stores.find((s) => s.store.toLowerCase() === storeAnswer.toLowerCase());
  const store = known?.store ?? storeAnswer;

  const productName = await ask("Product (e.g. Chicken breast, boneless skinless)");
  const salePrice = await ask("Sale price in dollars (e.g. 3.99)");
  console.log("Is that price…  1) for one package or item   2) per lb   3) per kg   4) per 100 g");
  const pricingAnswer = await ask("Choose 1-4", "1");
  const pricing =
    (["package", "lb", "kg", "100g"] as const)[Number(pricingAnswer) - 1] ?? "package";
  const size =
    pricing === "package"
      ? await ask("Size, if printed (e.g. 4 L, 400 g, 12 eggs; Enter to skip)")
      : "";
  const originalPrice = await ask("Regular price, if the flyer shows one (Enter to skip)");

  const week = known ? suggestedWeek(today, known.startsOn) : undefined;
  const startDate = await ask("First day of the flyer (YYYY-MM-DD)", week?.start);
  const endDate = await ask("Last day of the flyer (YYYY-MM-DD)", week?.end);
  console.log(`Categories: ${CATEGORY_IDS.join(", ")}`);
  const category = await ask("Category", "grocery");
  const note = await ask("A short note in your own words (Enter to skip)");
  const url = known ? "" : await ask("Link to the store's official flyer (https://…)");

  const answers: PickAnswers = {
    store,
    productName,
    salePrice,
    pricing,
    size,
    originalPrice,
    startDate,
    endDate,
    category,
    note,
    url,
  };
  const result = buildPick(answers);
  if ("error" in result) {
    console.error(`\n✗ Not saved: ${result.error}. Run npm run add-pick again.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n  ${describePick(result.pick)}\n`);
  const confirm = await ask("Add it? (y/n)", "y");
  if (!/^y/i.test(confirm)) {
    console.log("Nothing saved.");
    return;
  }
  file.picks.push(result.pick);
  writeFileSync(WEEKLY_PICKS_FILE, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`✓ Added to ${WEEKLY_PICKS_FILE}. Updating data/deals.json…\n`);
  rl.close();
  spawnSync("npm", ["run", "--silent", "scrape:local"], { stdio: "inherit", shell: true });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
