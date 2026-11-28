import type { Deal } from "@shared/deal";
import type { LocationId } from "@shared/taxonomy";
import { daysBetween } from "@shared/dates";
import { isExpired, isFree, isNewToday } from "@/lib/filters";
import { isFlyer } from "@/lib/stores";

/** The "Ending soon" chart's day buckets, in order. */
export const ENDING_BUCKETS = [
  { id: "today", label: "Today", short: "Today", max: 0 },
  { id: "tomorrow", label: "Tomorrow", short: "Tmrw", max: 1 },
  { id: "2-3", label: "In 2–3 days", short: "2–3d", max: 3 },
  { id: "4-7", label: "In 4–7 days", short: "4–7d", max: 7 },
] as const;

export const LOCATION_ORDER: LocationId[] = ["sudbury", "ontario", "ships-to-ontario"];

export type DealStats = {
  /** Live deals, not counting the weekly flyer links. */
  live: number;
  newToday: number;
  stores: number;
  /** Average % off across deals that state one (free ones excluded), rounded. */
  avgDiscount: number | null;
  maxDiscount: number | null;
  /** How many deals the average is based on. */
  discounted: number;
  free: number;
  ending: { id: (typeof ENDING_BUCKETS)[number]["id"]; count: number }[];
  /** Ending within 7 days, all buckets together. */
  endingTotal: number;
  byLocation: { id: LocationId; count: number }[];
};

/** Headline numbers for the home page's "Deal pulse" panel. */
export function dealStats(deals: Deal[], today: string): DealStats {
  const live = deals.filter((d) => !isFlyer(d) && !isExpired(d, today));
  const discounts = live
    .filter((d) => d.discountPercent !== undefined && !isFree(d))
    .map((d) => d.discountPercent!);

  const ending = ENDING_BUCKETS.map((b) => ({ id: b.id, count: 0 }));
  for (const d of live) {
    if (!d.endDate || d.ongoing) continue;
    const days = daysBetween(today, d.endDate);
    const at = ENDING_BUCKETS.findIndex((b) => days <= b.max);
    if (days >= 0 && at !== -1) ending[at].count++;
  }

  return {
    live: live.length,
    newToday: live.filter((d) => isNewToday(d, today)).length,
    stores: new Set(live.map((d) => d.store)).size,
    avgDiscount: discounts.length
      ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length)
      : null,
    maxDiscount: discounts.length ? Math.max(...discounts) : null,
    discounted: discounts.length,
    free: live.filter(isFree).length,
    ending,
    endingTotal: ending.reduce((a, b) => a + b.count, 0),
    byLocation: LOCATION_ORDER.map((id) => ({
      id,
      count: live.filter((d) => d.location === id).length,
    })),
  };
}

/**
 * How much of a deal's run is left, 0–1, for the countdown ring. Uses the deal's own
 * start date when there is one, otherwise a one-week window.
 */
export function timeLeft(deal: Deal, today: string): number | null {
  if (!deal.endDate || deal.ongoing) return null;
  const left = daysBetween(today, deal.endDate);
  if (left < 0 || left > 30) return null;
  const span = deal.startDate ? daysBetween(deal.startDate, deal.endDate) + 1 : 7;
  // "Ends today" still shows a sliver, so the ring never reads as already over.
  return Math.min(1, Math.max(0.04, (left + 1) / Math.max(span, left + 1)));
}
