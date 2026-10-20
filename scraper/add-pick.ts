import { daysBetween } from "@shared/dates";
import { flyerWeek } from "./sources/flyer-links";
import { PickSchema, type Pick } from "./sources/weekly-picks";
import { parsePrice } from "./lib/text";

/*
 * The thinking behind `npm run add-pick`, kept apart from the terminal questions so it
 * can be tested: default flyer dates, turning typed answers into a valid pick, and a
 * one-line preview.
 */

type Weekday = Parameters<typeof flyerWeek>[1];

const addDays = (isoDay: string, days: number) =>
  new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * The flyer week a new pick most likely belongs to: the current one, or next week's
 * if the current flyer ends today or tomorrow (new flyers are usually previewed early).
 */
export function suggestedWeek(today: string, startsOn: Weekday) {
  const current = flyerWeek(today, startsOn);
  if (daysBetween(today, current.end) > 1) return current;
  return flyerWeek(addDays(current.end, 1), startsOn);
}

export type PickAnswers = {
  store: string;
  productName: string;
  salePrice: string;
  /** How the price is given: for a package/item, or per weight. */
  pricing: "package" | "lb" | "kg" | "100g";
  size?: string;
  originalPrice?: string;
  startDate?: string;
  endDate: string;
  category?: string;
  note?: string;
  url?: string;
};

const blank = (value?: string) => (value?.trim() ? value.trim() : undefined);

/** Typed answers → a pick ready for weekly-picks.json, or the first problem found. */
export function buildPick(answers: PickAnswers): { pick: Pick } | { error: string } {
  const salePrice = parsePrice(answers.salePrice);
  if (salePrice === undefined || salePrice <= 0)
    return { error: "the sale price must be a number, e.g. 3.99" };
  const original = blank(answers.originalPrice);
  const originalPrice = original === undefined ? undefined : parsePrice(original);
  if (original !== undefined && originalPrice === undefined) {
    return { error: "the regular price must be a number, e.g. 5.99" };
  }

  const candidate = {
    productName: blank(answers.productName),
    store: blank(answers.store),
    salePrice,
    ...(answers.pricing === "package"
      ? blank(answers.size) && { size: blank(answers.size) }
      : { unit: answers.pricing }),
    ...(originalPrice !== undefined && originalPrice > salePrice && { originalPrice }),
    ...(blank(answers.startDate) && { startDate: blank(answers.startDate) }),
    endDate: blank(answers.endDate),
    ...(blank(answers.category) && { category: blank(answers.category) }),
    ...(blank(answers.note) && { note: blank(answers.note) }),
    ...(blank(answers.url) && { url: blank(answers.url) }),
  };
  const parsed = PickSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "entry"}: ${issue.message}` };
  }
  if (parsed.data.startDate && parsed.data.startDate > parsed.data.endDate) {
    return { error: "the first day is after the last day" };
  }
  // Only keep what was typed (not the schema's defaults), so the file stays short.
  return { pick: candidate as Pick };
}

/** "Chicken breast: $3.99/lb at No Frills, until 2026-10-28" */
export function describePick(pick: Pick): string {
  const per = pick.unit ? `/${pick.unit === "100g" ? "100 g" : pick.unit}` : "";
  const size = pick.size ? ` (${pick.size})` : "";
  return `${pick.productName}${size}: $${pick.salePrice.toFixed(2)}${per} at ${pick.store}, until ${pick.endDate}`;
}
