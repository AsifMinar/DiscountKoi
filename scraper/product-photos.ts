import { readFileSync } from "node:fs";
import type { Deal } from "@shared/deal";
import { daysBetween } from "@shared/dates";

/*
 * Product photos from Open Food Facts, for listings that have a barcode. Each barcode
 * is looked up once on its public product page (world.openfoodfacts.org/product/<code>,
 * which robots.txt allows; their /api is off limits to bots, so it isn't used) and the
 * answer is remembered in data/product-photos.json. Photos are only hotlinked, with the
 * credit their CC BY-SA licence asks for.
 */

export const PRODUCT_PHOTOS_FILE = "data/product-photos.json";
export const PHOTO_CREDIT = "Open Food Facts contributors (CC BY-SA)";
/** At most this many new barcodes are looked up per run; the rest wait for tomorrow. */
export const MAX_LOOKUPS = 20;
/** A barcode with no photo is checked again after this many days (someone may add one). */
const RECHECK_MISSING_DAYS = 30;

export type PhotoEntry = { url: string | null; checked: string };
export type PhotoBook = Record<string, PhotoEntry>;

const ABOUT = [
  "Written by the scraper: product photo per barcode, from Open Food Facts product pages.",
  "url null means the product has no photo there yet (checked again after 30 days).",
  "Safe to delete: photos are looked up again on the next run.",
];

export function readPhotoBook(path = PRODUCT_PHOTOS_FILE): PhotoBook {
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { photos?: unknown };
    const photos = raw.photos;
    if (!photos || typeof photos !== "object") return {};
    const book: PhotoBook = {};
    for (const [code, entry] of Object.entries(photos as Record<string, PhotoEntry>)) {
      if (!/^\d{8,14}$/.test(code) || typeof entry?.checked !== "string") continue;
      const url = typeof entry.url === "string" && isOffPhoto(entry.url) ? entry.url : null;
      book[code] = { url, checked: entry.checked };
    }
    return book;
  } catch {
    return {};
  }
}

export function serializePhotoBook(book: PhotoBook): string {
  const sorted = Object.fromEntries(Object.entries(book).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify({ _about: ABOUT, photos: sorted }, null, 2)}\n`;
}

/** Only photos hosted by Open Food Facts itself, over https. */
const isOffPhoto = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "images.openfoodfacts.org";
  } catch {
    return false;
  }
};

/** The product photo on an Open Food Facts product page (its og:image), skipping their logo. */
export function photoFromProductPage(html: string): string | null {
  for (const [tag] of html.matchAll(/<meta\b[^>]*property=["']og:image["'][^>]*>/gi)) {
    const url = /content=["']([^"']+)["']/i.exec(tag)?.[1];
    if (url && isOffPhoto(url)) return url;
  }
  return null;
}

export const productPageUrl = (barcode: string) =>
  `https://world.openfoodfacts.org/product/${barcode}`;

/**
 * Gives every listing with a barcode its photo. `lookup` fetches unknown barcodes (pass
 * null for runs that make no web requests: those only use what's already known).
 * A lookup that throws (site down, blocked) stops further lookups for this run.
 */
export async function applyProductPhotos(
  deals: Deal[],
  book: PhotoBook,
  today: string,
  lookup: ((barcode: string) => Promise<string | null>) | null,
  log: (message: string) => void = () => {},
): Promise<{ deals: Deal[]; book: PhotoBook }> {
  const next: PhotoBook = { ...book };
  const wanted = [...new Set(deals.flatMap((d) => (d.barcode && !d.sample ? [d.barcode] : [])))];
  const due = wanted.filter((code) => {
    const entry = next[code];
    return (
      !entry || (entry.url === null && daysBetween(entry.checked, today) > RECHECK_MISSING_DAYS)
    );
  });

  if (lookup) {
    for (const code of due.slice(0, MAX_LOOKUPS)) {
      try {
        next[code] = { url: await lookup(code), checked: today };
      } catch (error) {
        log(`photo lookup stopped at ${code}: ${(error as Error).message}`);
        break;
      }
    }
    if (due.length > MAX_LOOKUPS) log(`${due.length - MAX_LOOKUPS} barcodes left for tomorrow`);
  }

  const withPhotos = deals.map((deal) => {
    const url = deal.barcode ? next[deal.barcode]?.url : null;
    if (!url || (deal.imageUrl && deal.imageUrl !== url)) return deal;
    return { ...deal, imageUrl: url, imageCredit: PHOTO_CREDIT };
  });
  return { deals: withPhotos, book: next };
}
