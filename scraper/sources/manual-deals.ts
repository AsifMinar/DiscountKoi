import { readFileSync } from "node:fs";
import { ManualDealSchema } from "../submissions";
import type { RawDeal, Source } from "./types";

/*
 * Approved "Submit a deal" submissions from data/manual-deals.json (added by
 * `npm run approve-deal`). Every entry is checked again here. No web requests.
 */

export const MANUAL_DEALS_FILE = "data/manual-deals.json";

export function manualDealsToDeals(file: unknown): { deals: RawDeal[]; problems: string[] } {
  const entries = (file as { deals?: unknown })?.deals;
  if (!Array.isArray(entries)) return { deals: [], problems: ['the file has no "deals" list'] };
  const deals: RawDeal[] = [];
  const problems: string[] = [];
  entries.forEach((entry, i) => {
    const parsed = ManualDealSchema.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      problems.push(`deal #${i + 1}: ${issue.path.join(".") || "entry"}: ${issue.message}`);
      return;
    }
    const d = parsed.data;
    deals.push({
      title: d.title,
      url: d.url,
      store: d.store,
      location: d.location,
      dealType: d.dealType,
      category: d.category,
      originalPrice: d.originalPrice,
      salePrice: d.salePrice,
      productName: d.productName,
      size: d.size,
      unit: d.unit,
      endDate: d.endDate,
      // When it was approved, so it counts as new that day and ages out on time.
      publishedAt: `${d.approvedAt}T12:00:00Z`,
      variant: `issue-${d.issue}`,
    });
  });
  return { deals, problems };
}

export const manualDeals: Source = {
  id: "manual-deals",
  name: "Approved submissions",
  enabled: true,
  local: true,
  async fetchDeals({ log }) {
    const { deals, problems } = manualDealsToDeals(
      JSON.parse(readFileSync(MANUAL_DEALS_FILE, "utf8")),
    );
    problems.forEach((p) => log(`skipped ${p}`));
    return deals;
  },
};
