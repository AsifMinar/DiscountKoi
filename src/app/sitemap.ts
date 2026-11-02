import type { MetadataRoute } from "next";
import { loadDeals, storesData } from "@/lib/deals.server";
import { SITE_URL } from "@/lib/site";

// Written to /sitemap.xml at build time.
export const dynamic = "force-static";

const PAGES = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "products/", changeFrequency: "daily", priority: 0.8 },
  { path: "stores/", changeFrequency: "daily", priority: 0.6 },
  { path: "student/", changeFrequency: "daily", priority: 0.8 },
  { path: "free/", changeFrequency: "daily", priority: 0.8 },
  { path: "about/", changeFrequency: "monthly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const { updatedAt } = loadDeals();
  const stores = storesData().stores.map((s) => ({
    path: `store/${s.slug}/`,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
  return [...PAGES, ...stores].map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: p.path === "about/" ? undefined : updatedAt,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
