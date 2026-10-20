import { z } from "zod";
import { CATEGORIES, DEAL_TYPE_IDS, LOCATIONS, CATEGORY_IDS, LOCATION_IDS } from "@shared/taxonomy";
import type { CategoryId, DealTypeId, LocationId } from "@shared/taxonomy";
import { UNITS, type Unit } from "@shared/units";
import { cleanText, parsePrice, safeUrl } from "./lib/text";

/*
 * "Submit a deal" submissions: GitHub issues made from .github/ISSUE_TEMPLATE/submit-deal.yml.
 * Everything in an issue is untrusted, so each field is cleaned and checked here before
 * `npm run approve-deal` adds it to data/manual-deals.json. Nothing goes live without that.
 */

/** The form's field labels, exactly as in submit-deal.yml (GitHub uses them as ### headings). */
export const FORM_LABELS = {
  name: "Deal or product name",
  store: "Store or business",
  link: "Link to the deal",
  originalPrice: "Original price",
  salePrice: "Sale price",
  size: "Size or unit",
  endDate: "End date",
  dealType: "Deal type",
  category: "Category",
  location: "Location",
  confirm: "Confirmation",
} as const;

/** Labels shown in the form's dropdowns → the ids the site uses. */
export const DEAL_TYPE_OPTIONS: Record<string, DealTypeId> = {
  Online: "online",
  "In-store": "in-store",
  Student: "student",
  Free: "free",
};
export const LOCATION_OPTIONS: Record<string, LocationId> = Object.fromEntries(
  LOCATIONS.map((l) => [l.label, l.id]),
);
export const CATEGORY_OPTIONS: Record<string, CategoryId> = Object.fromEntries(
  CATEGORIES.map((c) => [c.label, c.id]),
);

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().nonnegative().max(100_000);

/** One approved submission, as stored in data/manual-deals.json. */
export const ManualDealSchema = z
  .object({
    issue: z.number().int().positive(),
    title: z.string().trim().min(1).max(120),
    store: z.string().trim().min(1).max(80),
    url: z.url({ protocol: /^https?$/ }).max(2048),
    location: z.enum(LOCATION_IDS),
    dealType: z.array(z.enum(DEAL_TYPE_IDS)).min(1),
    category: z.enum(CATEGORY_IDS),
    originalPrice: money.optional(),
    salePrice: money.optional(),
    size: z.string().trim().min(1).max(40).optional(),
    unit: z.enum(UNITS).optional(),
    productName: z.string().trim().min(1).max(120).optional(),
    endDate: isoDay.optional(),
    approvedAt: isoDay,
  })
  .strict();

export type ManualDeal = z.infer<typeof ManualDealSchema>;

/** Anything longer than this isn't a real submission. */
const MAX_BODY = 20_000;
/** A field this long is junk or an attack, not something to quietly shorten. */
const MAX_FIELD = 500;

/**
 * Reads an issue-form body ("### Label\n\nvalue") into label → value. "_No response_"
 * (GitHub's text for a skipped field) becomes "". A label that appears twice means the
 * body was edited by hand, which is refused.
 */
export function parseIssueForm(body: string): {
  fields: Map<string, string>;
  duplicates: string[];
} {
  const fields = new Map<string, string>();
  const duplicates: string[] = [];
  let current: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    if (current === null) return;
    const value = lines.join("\n").trim();
    if (fields.has(current)) duplicates.push(current);
    else fields.set(current, value === "_No response_" ? "" : value);
  };
  for (const line of body.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = /^###\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      current = heading[1];
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();
  return { fields, duplicates };
}

const UNIT_WORDS: Record<string, Unit> = {
  lb: "lb",
  kg: "kg",
  "100g": "100g",
  l: "L",
  litre: "L",
  liter: "L",
  "100ml": "100mL",
  each: "each",
};

/** "per lb", "/kg", "each" → a unit; anything else is a package size like "4 L". */
function sizeOrUnit(text: string): { size?: string; unit?: Unit } {
  const per = /^(?:per\s+|\/\s*)(.+)$/i.exec(text.trim());
  const word = (per ? per[1] : text).toLowerCase().replace(/\s+/g, "");
  const unit = UNIT_WORDS[word];
  if (unit && (per || unit === "each")) return { unit };
  const size = cleanText(text, 40);
  return size ? { size } : {};
}

export type SubmissionResult = { ok: true; deal: ManualDeal } | { ok: false; errors: string[] };

/**
 * Turns a submission into a deal for data/manual-deals.json, or lists every problem.
 * HTML is stripped, links must be plain https/http, prices must be numbers, dates real
 * and not in the past, and dropdown answers must be one of the form's options.
 */
export function submissionToDeal(body: string, issue: number, today: string): SubmissionResult {
  if (body.length > MAX_BODY) return { ok: false, errors: ["the submission is far too long"] };
  const { fields, duplicates } = parseIssueForm(body);
  const errors: string[] = [];
  if (duplicates.length) {
    errors.push(`the form was edited by hand (repeated: ${duplicates.join(", ")})`);
  }

  const raw = (key: keyof typeof FORM_LABELS) => {
    const value = fields.get(FORM_LABELS[key]) ?? "";
    if (value.length > MAX_FIELD) {
      errors.push(`"${FORM_LABELS[key]}" is too long`);
      return "";
    }
    return value;
  };

  const title = cleanText(raw("name"), 120);
  if (!title) errors.push("the deal or product name is missing");
  const store = cleanText(raw("store"), 80);
  if (!store) errors.push("the store or business is missing");

  const linkText = raw("link").trim();
  const url = safeUrl(linkText);
  if (!url || url.length > 2048 || !/^https?:\/\//i.test(linkText)) {
    errors.push("the link must be a normal web address starting with https://");
  }

  const price = (key: "originalPrice" | "salePrice") => {
    const text = raw(key).trim();
    if (!text) return undefined;
    const value = parsePrice(text);
    if (value === undefined || value > 100_000) errors.push(`"${FORM_LABELS[key]}" isn't a price`);
    return value;
  };
  const originalPrice = price("originalPrice");
  const salePrice = price("salePrice");
  if (originalPrice !== undefined && salePrice !== undefined && salePrice > originalPrice) {
    errors.push("the sale price is higher than the original price");
  }

  const { size, unit } = raw("size").trim() ? sizeOrUnit(raw("size")) : {};

  const endText = raw("endDate").trim();
  let endDate: string | undefined;
  if (endText) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endText) || Number.isNaN(Date.parse(`${endText}T00:00:00Z`))) {
      errors.push("the end date must look like 2026-10-28");
    } else if (endText < today) {
      errors.push("the deal has already ended");
    } else {
      endDate = endText;
    }
  }

  const choices = (key: "dealType" | "category" | "location") =>
    raw(key)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const dealType = [...new Set(choices("dealType").map((c) => DEAL_TYPE_OPTIONS[c]))];
  if (!dealType.length || dealType.some((t) => !t)) errors.push("pick a deal type from the list");
  const category = CATEGORY_OPTIONS[choices("category")[0] ?? ""];
  if (!category) errors.push("pick a category from the list");
  const location = LOCATION_OPTIONS[choices("location")[0] ?? ""];
  if (!location) errors.push("pick a location from the list");

  if (!/^\s*-\s*\[x\]/im.test(raw("confirm"))) {
    errors.push("the submitter didn't confirm the information is accurate");
  }

  if (errors.length) return { ok: false, errors };

  const candidate = {
    issue,
    title,
    store,
    url: url!,
    location,
    dealType,
    category,
    ...(originalPrice !== undefined && { originalPrice }),
    ...(salePrice !== undefined && { salePrice }),
    ...(size && { size }),
    ...(unit && { unit }),
    // A priced item with a size or unit is a product listing, so it shows on the Products page.
    ...(salePrice !== undefined && (size || unit) && { productName: title }),
    ...(endDate && { endDate }),
    approvedAt: today,
  };
  const parsed = ManualDealSchema.safeParse(candidate);
  if (!parsed.success) {
    const issueText = parsed.error.issues[0];
    return { ok: false, errors: [`${issueText.path.join(".")}: ${issueText.message}`] };
  }
  return { ok: true, deal: parsed.data };
}

/** Adds an approved deal to the manual-deals file's contents, refusing a second copy of the same issue. */
export function addManualDeal(
  file: { deals?: unknown[] },
  deal: ManualDeal,
): { ok: true; file: { deals: unknown[] } } | { ok: false; error: string } {
  const deals = Array.isArray(file.deals) ? file.deals : [];
  if (deals.some((d) => (d as { issue?: unknown })?.issue === deal.issue)) {
    return { ok: false, error: `issue #${deal.issue} is already in data/manual-deals.json` };
  }
  return { ok: true, file: { ...file, deals: [...deals, deal] } };
}
