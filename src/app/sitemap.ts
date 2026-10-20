import type { MetadataRoute } from "next";
import { loadDeals } from "@/lib/deals.server";
import { SITE_URL } from "@/lib/site";

// Written to /sitemap.xml at build time.
export const dynamic = "force-static";

const PAGES = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "products/", changeFrequency: "daily", priority: 0.8 },
  { path: "student/", changeFrequency: "daily", priority: 0.8 },
  { path: "free/", changeFrequency: "daily", priority: 0.8 },
  { path: "about/", changeFrequency: "monthly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const { updatedAt } = loadDeals();
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: p.path === "about/" ? undefined : updatedAt,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
