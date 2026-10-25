import { affiliateFeeds } from "./affiliate-feeds";
import { downtownSudbury } from "./downtown-sudbury";
import { flyerLinks } from "./flyer-links";
import { itchSales } from "./itch-sales";
import { ontarioParks } from "./ontario-parks";
import { rfdHotDeals } from "./rfd-hot-deals";
import { studentDiscounts } from "./student-discounts";
import { sudburyCityNews } from "./sudbury-city-news";
import { sudburyFoodPrograms } from "./sudbury-food-programs";
import type { Source } from "./types";
import { weeklyPicks } from "./weekly-picks";

/**
 * Every source the scraper runs, in priority order (if two sources find the same
 * deal, the one listed first wins). To add a source: create a file in this folder
 * that exports a `Source`, import it here, and add it to the list.
 *
 * Every enabled source here was checked: its robots.txt AND its terms allow this use.
 * Switched-off sources (enabled: false) say in their file what they're waiting for.
 */
export const SOURCES: Source[] = [
  flyerLinks,
  weeklyPicks,
  studentDiscounts,
  sudburyCityNews,
  downtownSudbury,
  sudburyFoodPrograms,
  ontarioParks,
  itchSales,
  affiliateFeeds,
  rfdHotDeals,
];
