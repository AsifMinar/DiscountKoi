import { isIsoDay } from "@shared/dates";
import { DealSchema, type Deal } from "@shared/deal";
import type { DealTypeId } from "@shared/taxonomy";
import { UNITS, resolveUnitPrice } from "@shared/units";
import { categorize } from "./categorize";
import { isFreeDeal, isStudentDeal } from "./detect";
import { cleanText, dealId, parsePrice, percentOff, safeUrl } from "./lib/text";
import type { RawDeal } from "./sources/types";

const validDay = (value?: string) => (value && isIsoDay(value) ? value : undefined);

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
  // A deal needs at least one type; with nothing else known, use where it's offered.
  // (Free events and programs stay just "Free" rather than being called "In-Store".)
  if (types.size === 0) {
    types.add(raw.location === "ships-to-ontario" ? "online" : "in-store");
  }

  const startDate = validDay(raw.startDate);
  const endDate = validDay(raw.endDate);
  const id = dealId(sourceId, url, raw.variant ? `${title}\n${raw.variant}` : title);

  // Product listings: clean name and size, then work out the unit price.
  const productName = cleanText(raw.productName, 120) || undefined;
  const size = productName ? cleanText(raw.size, 40) || undefined : undefined;
  const unit = productName && raw.unit && UNITS.includes(raw.unit) ? raw.unit : undefined;
  const givenUnitPrice =
    typeof raw.unitPrice === "number" && Number.isFinite(raw.unitPrice) && raw.unitPrice >= 0
      ? raw.unitPrice
      : undefined;
  const pricing = productName
    ? resolveUnitPrice({ salePrice, size, unit, unitPrice: givenUnitPrice })
    : undefined;

  // New items count as first seen when the source published them (never in the future).
  const published = raw.publishedAt ? Date.parse(raw.publishedAt) : NaN;
  const firstSeenAt =
    firstSeen.get(id) ??
    (Number.isFinite(published) && published < Date.parse(now)
      ? new Date(published).toISOString()
      : now);

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
    scrapedAt: firstSeenAt,
    currency: raw.currency === "USD" ? "USD" : undefined,
    attribution: cleanText(raw.attribution, 200) || undefined,
    ongoing: raw.ongoing ? true : undefined,
    productName,
    size,
    unit: pricing?.unit,
    unitPrice: pricing?.unitPrice,
    previousPrice: productName ? parsePrice(raw.previousPrice) : undefined,
    affiliate: raw.affiliate ? true : undefined,
    sample: raw.sample ? true : undefined,
  });

  if (!result.success) {
    const issue = result.error.issues[0];
    return { ok: false, reason: `${issue?.path.join(".") || "deal"}: ${issue?.message}` };
  }
  return { ok: true, deal: result.data };
}
