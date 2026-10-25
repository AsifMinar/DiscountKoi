/*
 * Where the site lives and links that appear in several places. If the site ever
 * moves to a custom domain, change SITE_ORIGIN (and PAGES_BASE_PATH in next.config.ts).
 */

export const SITE_NAME = "Discount Koi";
export const SITE_ORIGIN = "https://asifminar.github.io";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Full address of the home page, e.g. https://asifminar.github.io/DiscountKoi/ */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}/`;
/** The 1200×630 link-preview image (made by `npm run make-images`). */
export const SHARE_IMAGE = {
  url: `${BASE_PATH}/og-image.png`,
  width: 1200,
  height: 630,
  alt: "Discount Koi: every deal in Sudbury, in one calm place. Weekly flyers, price comparisons, student discounts and free stuff.",
};
