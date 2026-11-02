import { readFileSync } from "node:fs";
import { torontoDate } from "@shared/dates";
import { buildPick, suggestedWeek, type PickAnswers } from "../add-pick";
import { parseCsv } from "../lib/csv";
import { FLYER_STORES_FILE, flyerStartDays } from "./flyer-links";
import type { RawDeal, Source } from "./types";
import { flyerUrlsByStore, pickToDeal } from "./weekly-picks";

/*
 * Weekly picks from Asif's own Google Sheet, published as CSV ("File → Share → Publish
 * to web"). Same listings as data/weekly-picks.json, just quicker to type on a phone
 * while reading a flyer. The sheet's link lives in data/picks-sheet.json; setup steps
 * are in docs/google-sheet-setup.md.
 *
 * docs.google.com's robots.txt allows /spreadsheet… pages (Crawl-delay 1), and it's
 * the owner's own sheet, so there are no terms to worry about.
 */

export const PICKS_SHEET_FILE = "data/picks-sheet.json";

/** Header in the sheet → field. Headers ignore capitals, spaces and punctuation. */
const COLUMNS = {
  store: "store",
  product: "productName",
  price: "salePrice",
  saleprice: "salePrice",
  per: "per",
  size: "size",
  regularprice: "originalPrice",
  firstday: "startDate",
  lastday: "endDate",
  brand: "brand",
  category: "category",
  barcode: "barcode",
  note: "note",
  link: "url",
} as const;
type Field = (typeof COLUMNS)[keyof typeof COLUMNS];

const headerKey = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");

const PER: Record<string, PickAnswers["pricing"]> = {
  "": "package",
  package: "package",
  pack: "package",
  each: "package",
  item: "package",
  lb: "lb",
  kg: "kg",
  "100g": "100g",
  "100 g": "100g",
};

/** Only a Google Sheets "Publish to web" CSV link is accepted. */
export function isSheetCsvUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "docs.google.com" &&
      u.pathname.startsWith("/spreadsheets/") &&
      u.searchParams.get("output") === "csv"
    );
  } catch {
    return false;
  }
}

type Lookups = {
  flyers: Map<string, string>;
  startDays: ReturnType<typeof flyerStartDays>;
  today: string;
};

/**
 * The sheet's rows → deals. Blank rows are skipped; a row with a problem is reported
 * with its row number (as the sheet shows it) and the other rows still load.
 */
export function sheetToDeals(
  csv: string,
  { flyers, startDays, today }: Lookups,
): { deals: RawDeal[]; problems: string[] } {
  const [header = [], ...rows] = parseCsv(csv);
  const fields = header.map(
    (h): Field | undefined => COLUMNS[headerKey(h) as keyof typeof COLUMNS],
  );
  if (!fields.includes("store") || !fields.includes("productName")) {
    return { deals: [], problems: ['the first row needs at least "Store" and "Product" columns'] };
  }

  const deals: RawDeal[] = [];
  const problems: string[] = [];
  rows.forEach((cells, i) => {
    const row: Partial<Record<Field, string>> = {};
    fields.forEach((field, c) => {
      if (field && cells[c]?.trim()) row[field] = cells[c].trim();
    });
    if (!Object.keys(row).length) return;
    const line = `row ${i + 2}`;

    const pricing = PER[(row.per ?? "").toLowerCase()];
    if (!pricing) {
      problems.push(`${line}: "Per" must be package, lb, kg or 100g`);
      return;
    }
    // No dates typed: use the store's current flyer week.
    let { startDate, endDate } = row;
    if (!endDate) {
      const startsOn = startDays.get((row.store ?? "").toLowerCase());
      if (!startsOn) {
        problems.push(`${line}: add a "Last day" (this store has no flyer day in flyer-stores)`);
        return;
      }
      const week = suggestedWeek(today, startsOn);
      startDate ??= week.start;
      endDate = week.end;
    }

    const built = buildPick({
      store: row.store ?? "",
      productName: row.productName ?? "",
      salePrice: row.salePrice ?? "",
      pricing,
      size: row.size,
      originalPrice: row.originalPrice,
      startDate,
      endDate,
      category: row.category?.toLowerCase(),
      note: row.note,
      url: row.url,
      brand: row.brand,
      barcode: row.barcode?.replace(/\s/g, ""),
    });
    if ("error" in built) {
      problems.push(`${line}: ${built.error}`);
      return;
    }
    if (built.pick.endDate < today) return; // an old row: nothing to show
    const deal = pickToDeal(built.pick, flyers);
    if (typeof deal === "string") problems.push(`${line}: ${deal}`);
    else deals.push(deal);
  });
  return { deals, problems };
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export const sheetPicks: Source = {
  id: "sheet-picks",
  name: "Weekly picks (Google Sheet)",
  enabled: true,
  async fetchDeals({ http, log, now }) {
    const url = String((readJson(PICKS_SHEET_FILE) as { csvUrl?: unknown }).csvUrl ?? "").trim();
    if (!url) {
      log(`no sheet linked yet (${PICKS_SHEET_FILE})`);
      return [];
    }
    if (!isSheetCsvUrl(url)) {
      throw new Error(
        `${PICKS_SHEET_FILE}: csvUrl must be a Google Sheets "Publish to web" CSV link`,
      );
    }
    const csv = await http.text(url, "text/csv");
    const { deals, problems } = sheetToDeals(csv, {
      flyers: flyerUrlsByStore(readJson(FLYER_STORES_FILE)),
      startDays: flyerStartDays(readJson(FLYER_STORES_FILE)),
      today: torontoDate(now),
    });
    problems.forEach((p) => log(`skipped ${p}`));
    return deals;
  },
};
