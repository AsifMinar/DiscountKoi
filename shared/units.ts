/*
 * Unit prices, so shoppers can compare "$5.49 for 4 L" with "$1.69 for 1 L" fairly.
 * Shared by the scraper (works out unit prices) and the site (shows and compares them).
 */

/** Units a unit price can be in. Weights and volumes are never stored per gram or per mL. */
export const UNITS = ["lb", "kg", "100g", "L", "100mL", "each"] as const;
export type Unit = (typeof UNITS)[number];

type Dimension = "weight" | "volume" | "count";

/** How much of the base amount (grams, millilitres or items) one unit is. */
const UNIT_INFO: Record<Unit, { dimension: Dimension; base: number; label: string }> = {
  lb: { dimension: "weight", base: 453.59237, label: "/lb" },
  kg: { dimension: "weight", base: 1000, label: "/kg" },
  "100g": { dimension: "weight", base: 100, label: "/100 g" },
  L: { dimension: "volume", base: 1000, label: "/L" },
  "100mL": { dimension: "volume", base: 100, label: "/100 mL" },
  each: { dimension: "count", base: 1, label: " each" },
};

export const unitLabel = (unit: Unit) => UNIT_INFO[unit].label;
export const unitDimension = (unit: Unit) => UNIT_INFO[unit].dimension;

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/** A package size read from text like "4 L", "1.36 kg", "12 x 355 mL" or "dozen". */
export type Amount = { amount: number; dimension: Dimension; base: number };

// Word → [dimension, base amount per 1 of that word].
const SIZE_WORDS: Array<[RegExp, Dimension, number]> = [
  [/^(?:lb|lbs|pound|pounds)$/, "weight", 453.59237],
  [/^(?:kg|kgs|kilo|kilos|kilogram|kilograms)$/, "weight", 1000],
  [/^(?:g|gr|gram|grams)$/, "weight", 1],
  [/^(?:l|litre|litres|liter|liters)$/, "volume", 1000],
  [/^(?:ml|millilitre|millilitres|milliliter|milliliters)$/, "volume", 1],
];

/**
 * Reads a package size. Understands weights (lb, kg, g), volumes (L, mL), counts
 * ("12", "12 eggs", "6 pack", "dozen") and multipacks ("12 x 355 mL"). Anything else
 * gives undefined, and the deal simply has no unit price.
 */
export function parseSize(text: string | undefined): Amount | undefined {
  if (!text) return undefined;
  const clean = text
    .toLowerCase()
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(/,/g, ".")
    .trim();
  if (/^(?:a\s+)?dozen\b/.test(clean)) return { amount: 12, dimension: "count", base: 12 };

  const match = /^(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*([a-z]+)?/.exec(clean);
  if (!match) return undefined;
  const packs = match[1] ? Number(match[1]) : 1;
  const amount = Number(match[2]);
  if (!(amount > 0) || !(packs > 0)) return undefined;

  const word = match[3];
  for (const [pattern, dimension, base] of SIZE_WORDS) {
    if (word && pattern.test(word)) {
      return { amount: packs * amount, dimension, base: packs * amount * base };
    }
  }
  // "12", "12 eggs", "6 pack", "8 rolls": a count. Fractions of items make no sense.
  if (!Number.isInteger(amount)) return undefined;
  return { amount: packs * amount, dimension: "count", base: packs * amount };
}

/** The unit a computed unit price is shown in: per lb for pound sizes, else per 100 g, per L, per 100 mL, each. */
function unitFor(size: Amount, text: string): Unit {
  if (size.dimension === "count") return "each";
  if (size.dimension === "volume") return size.base >= 1000 ? "L" : "100mL";
  return /lb|pound/i.test(text) ? "lb" : "100g";
}

export type UnitPricing = { unit: Unit; unitPrice: number };

/**
 * Works out a deal's unit price:
 *  - given `unit` and `unitPrice`: kept as they are,
 *  - `unit` but no size (e.g. chicken at $3.99/lb): the sale price IS the unit price,
 *  - a readable size (e.g. "4 L" for $5.49): $1.3725/L.
 */
export function resolveUnitPrice(deal: {
  salePrice?: number;
  size?: string;
  unit?: Unit;
  unitPrice?: number;
}): UnitPricing | undefined {
  const { salePrice, size, unit, unitPrice } = deal;
  if (unit && unitPrice !== undefined && unitPrice >= 0)
    return { unit, unitPrice: round4(unitPrice) };
  if (salePrice === undefined) return undefined;
  if (unit && !size) return { unit, unitPrice: round4(salePrice) };
  const amount = parseSize(size);
  if (!amount || !size) return undefined;
  const target = unit && unitDimension(unit) === amount.dimension ? unit : unitFor(amount, size);
  return { unit: target, unitPrice: round4((salePrice / amount.base) * UNIT_INFO[target].base) };
}

/** Converts a unit price to another unit of the same kind ($/lb → $/100 g). Undefined across kinds. */
export function convertUnitPrice(value: number, from: Unit, to: Unit): number | undefined {
  if (from === to) return value;
  const a = UNIT_INFO[from];
  const b = UNIT_INFO[to];
  if (a.dimension !== b.dimension) return undefined;
  return round4((value / a.base) * b.base);
}

/** Price per gram, per mL or per item: the common yardstick used for sorting and comparing. */
export function perBase(unit: Unit, unitPrice: number): { dimension: Dimension; value: number } {
  const info = UNIT_INFO[unit];
  return { dimension: info.dimension, value: unitPrice / info.base };
}

/**
 * True when the sale price is itself per unit (e.g. "$3.99/lb"), so the price is shown
 * as "$3.99/lb" rather than "$3.99" plus a separate unit price.
 */
export function soldByUnit(deal: {
  salePrice?: number;
  size?: string;
  unit?: Unit;
  unitPrice?: number;
}): boolean {
  return Boolean(
    deal.unit &&
    deal.unit !== "each" &&
    !deal.size &&
    deal.salePrice !== undefined &&
    deal.unitPrice !== undefined &&
    Math.abs(deal.unitPrice - deal.salePrice) < 0.0001,
  );
}
