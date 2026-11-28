import type { CategoryId } from "@shared/taxonomy";

/*
 * Soft colour pairs (fill + text) for store badges and category pictures. Every pair
 * passes WCAG AA in light and dark mode (tokens in globals.css).
 */
export const TINTS = {
  accent: "bg-accent-soft text-accent-text",
  teal: "bg-teal-soft text-teal-text",
  blue: "bg-tint-blue text-tint-blue-text",
  green: "bg-tint-green text-tint-green-text",
  plum: "bg-tint-plum text-tint-plum-text",
  gold: "bg-tint-gold text-tint-gold-text",
  rose: "bg-tint-rose text-tint-rose-text",
  neutral: "bg-neutral-soft text-ink",
} as const;
export type TintId = keyof typeof TINTS;

/**
 * Store badges. The flat "Signal" look keeps every tile monochrome, so the orange accent
 * only ever means "act here" or "Sudbury". (Kept as a function so a store could get its
 * own colour later.)
 */
export function storeTint(name: string): string {
  void name;
  return TINTS.neutral;
}

export const CATEGORY_TINT: Record<CategoryId, TintId> = {
  grocery: "green",
  "food-restaurants": "accent",
  "food-help": "rose",
  electronics: "blue",
  fashion: "plum",
  home: "gold",
  "health-beauty": "rose",
  "sports-outdoors": "teal",
  "kids-baby": "gold",
  pets: "accent",
  automotive: "blue",
  entertainment: "plum",
  services: "teal",
  other: "neutral",
};

/** Category pictures: monochrome too (see storeTint). */
export const categoryTint = (category: CategoryId) => (void category, TINTS.neutral);
