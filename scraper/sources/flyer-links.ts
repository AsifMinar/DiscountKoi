import { readFileSync } from "node:fs";
import { z } from "zod";
import { torontoDate, weekLabel } from "@shared/dates";
import { CATEGORY_IDS, LOCATION_IDS } from "@shared/taxonomy";
import { possessive } from "../lib/text";
import type { RawDeal, Source } from "./types";

/*
 * Weekly flyer cards. For each store in data/flyer-stores.json this makes one card
 * per flyer week ("No Frills weekly flyer · Oct 22–28") that links to the store's
 * official flyer. It copies nothing from the flyer and makes no web requests.
 *
 * Because the dates are in the title, each week's card gets a new id: it shows up as
 * new on flyer day and the old one expires on its own.
 */

export const FLYER_STORES_FILE = "data/flyer-stores.json";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const FlyerStoresSchema = z.object({
  stores: z.array(
    z.object({
      store: z.string().min(1),
      url: z.url({ protocol: /^https?$/ }),
      startsOn: z.enum(WEEKDAYS),
      label: z.string().min(1).default("weekly flyer"),
      category: z.enum(CATEGORY_IDS).default("other"),
      location: z.enum(LOCATION_IDS).default("sudbury"),
    }),
  ),
});

const addDays = (isoDay: string, days: number) =>
  new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** The flyer week (YYYY-MM-DD start and end) that contains `today`. */
export function flyerWeek(today: string, startsOn: (typeof WEEKDAYS)[number]) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const back = (weekday - WEEKDAYS.indexOf(startsOn) + 7) % 7;
  const start = addDays(today, -back);
  return { start, end: addDays(start, 6) };
}

export { weekLabel } from "@shared/dates";

/** Builds this week's cards. Exported separately so tests can pass their own list and date. */
export function buildFlyerCards(file: unknown, now: Date): RawDeal[] {
  const { stores } = FlyerStoresSchema.parse(file);
  const today = torontoDate(now);
  return stores.map((s) => {
    const { start, end } = flyerWeek(today, s.startsOn);
    return {
      title: `${s.store} ${s.label} · ${weekLabel(start, end)}`,
      description: `This week's ${s.store} ${s.label}. Open it on ${possessive(s.store)} site and choose your Greater Sudbury store to see local prices.`,
      url: s.url,
      store: s.store,
      location: s.location,
      category: s.category,
      dealType: ["in-store"],
      startDate: start,
      endDate: end,
    };
  });
}

export const flyerLinks: Source = {
  id: "flyer-links",
  name: "Weekly flyer links",
  enabled: true,
  local: true,
  async fetchDeals({ now }) {
    return buildFlyerCards(JSON.parse(readFileSync(FLYER_STORES_FILE, "utf8")), now);
  },
};
