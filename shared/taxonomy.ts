/**
 * The fixed lists the whole project shares: categories, deal types and locations.
 * `id` is what's stored in deals.json and used in URLs; `label` is what people see.
 * To rename something on the site, change only its label.
 */

export const CATEGORIES = [
  { id: "food-restaurants", label: "Food & Restaurants" },
  { id: "grocery", label: "Grocery" },
  { id: "electronics", label: "Gadgets & Electronics" },
  { id: "fashion", label: "Clothes & Fashion" },
  { id: "home", label: "Home & Furniture" },
  { id: "health-beauty", label: "Health & Beauty" },
  { id: "sports-outdoors", label: "Sports & Outdoors" },
  { id: "kids-baby", label: "Kids & Baby" },
  { id: "pets", label: "Pets" },
  { id: "automotive", label: "Automotive" },
  { id: "entertainment", label: "Entertainment & Events" },
  { id: "services", label: "Services" },
  { id: "other", label: "Other" },
] as const;

export const DEAL_TYPES = [
  { id: "student", label: "Student Discount", badge: "Student" },
  { id: "online", label: "Online Deal", badge: "Online" },
  { id: "in-store", label: "In-Store Deal", badge: "In-Store" },
  { id: "free", label: "Free", badge: "Free" },
] as const;

/** Listed in priority order: Sudbury always comes first. */
export const LOCATIONS = [
  { id: "sudbury", label: "Sudbury", badge: "Sudbury" },
  { id: "ontario", label: "Ontario", badge: "Ontario" },
  { id: "ships-to-ontario", label: "Ships to Ontario", badge: "Ships to ON" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type DealTypeId = (typeof DEAL_TYPES)[number]["id"];
export type LocationId = (typeof LOCATIONS)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
export const DEAL_TYPE_IDS = DEAL_TYPES.map((t) => t.id) as [DealTypeId, ...DealTypeId[]];
export const LOCATION_IDS = LOCATIONS.map((l) => l.id) as [LocationId, ...LocationId[]];

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!.label;
export const dealTypeBadge = (id: DealTypeId) => DEAL_TYPES.find((t) => t.id === id)!.badge;
export const locationBadge = (id: LocationId) => LOCATIONS.find((l) => l.id === id)!.badge;
export const locationRank = (id: LocationId) => LOCATION_IDS.indexOf(id);
