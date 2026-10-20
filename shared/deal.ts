import { z } from "zod";
import { CATEGORY_IDS, DEAL_TYPE_IDS, LOCATION_IDS } from "./taxonomy";

/** YYYY-MM-DD, read as a calendar day in Sudbury time. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** Only plain web links. Blocks javascript:, data: and anything else. */
const webUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === "https:" || protocol === "http:";
    } catch {
      return false;
    }
  }, "must be an http(s) URL");

const price = z.number().nonnegative().max(1_000_000);

/**
 * One deal. Every deal is checked against this before it's saved to deals.json;
 * anything that doesn't match is dropped and logged by the scraper.
 */
export const DealSchema = z.object({
  /** Stable hash of source + url + title, used to spot duplicates. */
  id: z.string().min(6).max(64),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(600).default(""),
  store: z.string().trim().min(1).max(80),
  brand: z.string().trim().min(1).max(80).optional(),
  originalPrice: price.optional(),
  salePrice: price.optional(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  dealType: z.array(z.enum(DEAL_TYPE_IDS)).min(1),
  category: z.enum(CATEGORY_IDS),
  location: z.enum(LOCATION_IDS),
  url: webUrl,
  /** Hotlinked thumbnail only. Images are never downloaded or re-hosted. */
  imageUrl: webUrl.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  /** Which scraper found it, e.g. "flyers" or "rfd-hot-deals". */
  source: z.string().min(1).max(40),
  /** When Discount Koi first found this deal (kept across daily runs, so "Newest" means new). */
  scrapedAt: z.iso.datetime({ offset: true }),
});

export const DealsFileSchema = z.object({
  /** When the scraper last finished. Shown as "Last updated" on the site. */
  updatedAt: z.iso.datetime({ offset: true }),
  deals: z.array(z.unknown()),
});

export type Deal = z.infer<typeof DealSchema>;
export type DealsFile = { updatedAt: string; deals: Deal[] };
