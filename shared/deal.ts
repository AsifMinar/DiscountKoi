import { z } from "zod";
import { CATEGORY_IDS, DEAL_TYPE_IDS, LOCATION_IDS } from "./taxonomy";
import { UNITS } from "./units";

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

/** Thumbnails: https only (the site is https, and its security policy only allows https images). */
const httpsUrl = webUrl.refine((value) => value.startsWith("https://"), "must be an https URL");

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
  imageUrl: httpsUrl.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  /** Which scraper found it, e.g. "flyers" or "rfd-hot-deals". */
  source: z.string().min(1).max(40),
  /** When Discount Koi first found this deal (kept across daily runs, so "Newest" means new). */
  scrapedAt: z.iso.datetime({ offset: true }),
  /** Currency of the prices. Missing means Canadian dollars. */
  currency: z.enum(["CAD", "USD"]).optional(),
  /** Credit line a source requires, e.g. "© King's Printer for Ontario". Shown in the deal popup. */
  attribution: z.string().trim().min(1).max(200).optional(),
  /** A permanent program (e.g. a food bank) rather than a time-limited deal: never aged out. */
  ongoing: z.boolean().optional(),

  /* ---- Product listings ("Chicken breast, $3.99/lb, No Frills"). All optional. ---- */

  /** The product on its own, e.g. "Chicken breast". Its presence makes this a product listing. */
  productName: z.string().trim().min(1).max(120).optional(),
  /** Package size or quantity as printed, e.g. "4 L", "1.36 kg", "12 eggs". */
  size: z.string().trim().min(1).max(40).optional(),
  /** What the unit price is per (lb, kg, 100g, L, 100mL, each). */
  unit: z.enum(UNITS).optional(),
  /** Price per `unit`, for fair comparison between package sizes and stores. */
  unitPrice: z.number().nonnegative().max(1_000_000).optional(),
  /** What this product cost at this store last time it was listed (from price history). */
  previousPrice: price.optional(),
  /** Bought through an affiliate link (Discount Koi may earn a commission). Shown on the card. */
  affiliate: z.boolean().optional(),
  /** An example entry that shows how listings look. Not a real price; labelled on the site. */
  sample: z.boolean().optional(),
  /** Set when the site is built: cheapest of 2+ Sudbury stores for this product this week. */
  lowestInSudbury: z.boolean().optional(),
});

export const DealsFileSchema = z.object({
  /** When the scraper last finished. Shown as "Last updated" on the site. */
  updatedAt: z.iso.datetime({ offset: true }),
  deals: z.array(z.unknown()),
});

export type Deal = z.infer<typeof DealSchema>;
export type DealsFile = { updatedAt: string; deals: Deal[] };
