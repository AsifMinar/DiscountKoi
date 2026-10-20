import { DealSchema, type Deal } from "@shared/deal";
import type { DealTypeId } from "@shared/taxonomy";
import { categorize } from "./categorize";
import { isFreeDeal, isStudentDeal } from "./detect";
import { cleanText, dealId, parsePrice, percentOff, safeUrl } from "./lib/text";
import type { RawDeal } from "./sources/types";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (value?: string) =>
  value && ISO_DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    ? value
    : undefined;

export type NormalizeResult = { ok: true; deal: Deal } | { ok: false; reason: string };

/**
 * Turns one raw scraped deal into a safe, complete, validated Deal:
 * plain-text fields, http(s)-only links, computed discount %, detected Free /
 * Student types, a category, a stable id, and the date we first saw it.
 */
export function normalizeDeal(
  raw: RawDeal,
  sourceId: string,
  now: string,
  firstSeen: ReadonlyMap<string, string>,
): NormalizeResult {
  const title = cleanText(raw.title, 200);
  const url = safeUrl(raw.url);
  if (!title) return { ok: false, reason: "missing title" };
  if (!url) return { ok: false, reason: `rejected link: ${String(raw.url).slice(0, 80)}` };

  const description = cleanText(raw.description, 600);
  const store = cleanText(raw.store, 80);
  const brand = cleanText(raw.brand, 80) || undefined;
  // Images are only hotlinked, and only over https (the site itself is https).
  const image = safeUrl(raw.imageUrl);
  const imageUrl = image?.startsWith("https:") ? image : undefined;

  const originalPrice = parsePrice(raw.originalPrice);
  const salePrice = parsePrice(raw.salePrice);
  const discountPercent =
    percentOff(originalPrice, salePrice) ??
    (raw.discountPercent && raw.discountPercent >= 1 && raw.discountPercent <= 100
      ? Math.round(raw.discountPercent)
      : undefined);

  const text = `${title} ${description} ${brand ?? ""}`;
  const types = new Set<DealTypeId>(raw.dealType ?? []);
  if (isFreeDeal(text, salePrice)) types.add("free");
  if (isStudentDeal(text)) types.add("student");
  // Every deal is either online or in store; fall back on where it's offered.
  if (!types.has("online") && !types.has("in-store")) {
    types.add(raw.location === "ships-to-ontario" ? "online" : "in-store");
  }

  const startDate = validDay(raw.startDate);
  const endDate = validDay(raw.endDate);
  const id = dealId(sourceId, url, title);

  const result = DealSchema.safeParse({
    id,
    title,
    description,
    store,
    brand,
    originalPrice,
    salePrice,
    discountPercent,
    dealType: [...types],
    category: raw.category ?? categorize(text, store),
    location: raw.location,
    url,
    imageUrl,
    startDate: startDate && endDate && startDate > endDate ? undefined : startDate,
    endDate,
    source: sourceId,
    scrapedAt: firstSeen.get(id) ?? now,
  });

  if (!result.success) {
    const issue = result.error.issues[0];
    return { ok: false, reason: `${issue?.path.join(".") || "deal"}: ${issue?.message}` };
  }
  return { ok: true, deal: result.data };
}
