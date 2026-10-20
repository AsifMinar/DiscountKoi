import type { Metadata } from "next";
import { BASE_PATH, SHARE_IMAGE, SITE_NAME } from "@/lib/site";

export const DEFAULT_TITLE = "Discount Koi · Sudbury deals, discounts & freebies";
export const DEFAULT_DESCRIPTION =
  "Every deal, discount and freebie for Sudbury, Ontario: weekly flyers, store-by-store price comparisons, student discounts and free stuff. Updated every morning at 6 AM.";

/**
 * Title, description, canonical link and link-preview tags (Open Graph, Twitter) for a page.
 * `path` is relative to the site's home, e.g. "products/" ("" for the home page).
 * Every page shares the same preview image (public/og-image.png).
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title?: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  // Absolute from the domain root; metadataBase (in layout.tsx) adds https://asifminar.github.io.
  const url = `${BASE_PATH}/${path}`;
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_CA",
      title: fullTitle,
      description,
      url,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [SHARE_IMAGE],
    },
  };
}
