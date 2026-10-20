import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Written to /robots.txt at build time (served at /DiscountKoi/robots.txt on GitHub Pages).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}sitemap.xml`,
  };
}
