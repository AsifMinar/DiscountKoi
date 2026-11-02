import { readFileSync } from "node:fs";
import { daysBetween } from "@shared/dates";
import type { OntarioPrice, OntarioPricesFile } from "@shared/price-info";
import { parseSize, type Unit } from "@shared/units";
import type { PoliteFetcher } from "./lib/http";

/*
 * Ontario average prices from Statistics Canada, table 18-10-0245-01 "Monthly average
 * retail prices for selected products" (Statistics Canada Open Licence: free to reuse
 * with credit). Used by the "good deal" meter: "18% below the Ontario average".
 *
 * Two POSTs to StatCan's data API (www150.statcan.gc.ca/t1/wds, allowed by robots.txt,
 * Crawl-delay 2): the table's product list, then the latest Ontario value of each.
 * The table changes once a month, so this runs at most once a week.
 */

export const ONTARIO_PRICES_FILE = "data/ontario-prices.json";
const TABLE = 18100245;
const ONTARIO = 6;
const WDS = "https://www150.statcan.gc.ca/t1/wds/rest";
/** Checked again after this many days. */
export const REFRESH_DAYS = 7;
export const ONTARIO_CREDIT =
  "Statistics Canada, Table 18-10-0245-01, Monthly average retail prices for selected products";

export function readOntarioPrices(path = ONTARIO_PRICES_FILE): OntarioPricesFile | null {
  try {
    const file = JSON.parse(readFileSync(path, "utf8")) as OntarioPricesFile;
    return Array.isArray(file.items) && typeof file.checked === "string" ? file : null;
  } catch {
    return null;
  }
}

export function serializeOntarioPrices(file: OntarioPricesFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

const isDue = (file: OntarioPricesFile | null, today: string) =>
  !file || daysBetween(file.checked, today) >= REFRESH_DAYS;

/**
 * "Eggs, 1 dozen" → { product: "Eggs", amount: 12 items }; "Chicken breasts, per kilogram"
 * → per 1000 g; "Lemons, unit" → 1 item; "Tea (20 bags)" → 20 items.
 */
export function parseStatcanName(
  name: string,
): { product: string; unit: Unit; perUnit: number } | undefined {
  const bags = /^(.*?)\s*\((\d+) bags\)$/.exec(name.trim());
  const comma = name.lastIndexOf(",");
  const product = (bags ? bags[1] : comma > 0 ? name.slice(0, comma) : name).trim();
  const qty = (bags ? `${bags[2]}` : comma > 0 ? name.slice(comma + 1) : "").trim().toLowerCase();

  let amount: { dimension: "weight" | "volume" | "count"; base: number } | undefined;
  if (qty === "per kilogram") amount = { dimension: "weight", base: 1000 };
  else if (qty === "unit") amount = { dimension: "count", base: 1 };
  else if (/^1 dozen$/.test(qty)) amount = { dimension: "count", base: 12 };
  else if (/^\d+$/.test(qty)) amount = { dimension: "count", base: Number(qty) };
  else amount = parseSize(qty);
  if (!product || !amount || !(amount.base > 0)) return undefined;

  // Unit prices are kept per kg, per L or each: the same units the site shows.
  const unit: Unit =
    amount.dimension === "weight" ? "kg" : amount.dimension === "volume" ? "L" : "each";
  const unitBase = unit === "each" ? 1 : 1000;
  return { product, unit, perUnit: amount.base / unitBase };
}

type Metadata = Array<{
  status: string;
  object?: {
    dimension?: Array<{
      dimensionPositionId: number;
      member: Array<{ memberId: number; memberNameEn: string }>;
    }>;
  };
}>;
type DataAnswer = Array<{
  status: string;
  object?: {
    coordinate: string;
    vectorDataPoint?: Array<{ refPer: string; value: number | null }>;
  };
}>;

/** Fetches the latest Ontario averages. Returns null when the saved file is recent enough. */
export async function updateOntarioPrices(
  http: PoliteFetcher,
  today: string,
  saved = readOntarioPrices(),
): Promise<OntarioPricesFile | null> {
  if (!isDue(saved, today)) return null;

  const meta = await http.postJson<Metadata>(`${WDS}/getCubeMetadata`, [{ productId: TABLE }]);
  const products =
    meta[0]?.object?.dimension?.find((d) => d.dimensionPositionId === 2)?.member ?? [];
  if (!products.length) throw new Error("StatCan: no product list in the table metadata");

  const answer = await http.postJson<DataAnswer>(
    `${WDS}/getDataFromCubePidCoordAndLatestNPeriods`,
    products.map((p) => ({
      productId: TABLE,
      coordinate: `${ONTARIO}.${p.memberId}.0.0.0.0.0.0.0.0`,
      latestN: 1,
    })),
  );

  const nameById = new Map(products.map((p) => [String(p.memberId), p.memberNameEn.trim()]));
  const items: OntarioPrice[] = [];
  let period = "";
  for (const row of answer) {
    const point = row.object?.vectorDataPoint?.[0];
    const id = row.object?.coordinate.split(".")[1];
    const name = id ? nameById.get(id) : undefined;
    if (row.status !== "SUCCESS" || !point || typeof point.value !== "number" || !name) continue;
    const parsed = parseStatcanName(name);
    if (!parsed) continue;
    items.push({
      name,
      product: parsed.product,
      price: point.value,
      unit: parsed.unit,
      unitPrice: round4(point.value / parsed.perUnit),
      period: point.refPer.slice(0, 7),
    });
    if (point.refPer.slice(0, 7) > period) period = point.refPer.slice(0, 7);
  }
  if (!items.length) throw new Error("StatCan: no Ontario prices in the answer");
  return { _about: ONTARIO_CREDIT, checked: today, period, items };
}
