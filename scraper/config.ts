/**
 * Scraper settings, all in one place. Change the numbers freely.
 */

// In GitHub Actions this becomes e.g. https://github.com/you/discount-koi, so site owners
// can see who is visiting and how to get in touch.
const contact = process.env.GITHUB_REPOSITORY
  ? `+https://github.com/${process.env.GITHUB_REPOSITORY}`
  : "local test run";

export const CONFIG = {
  /** Deals without an end date are removed this many days after we first found them. */
  maxAgeDaysNoEndDate: 14,

  /** Free stuff (giveaways, samples) without an end date is removed sooner. */
  maxAgeDaysFreebies: 7,

  /** Pause before each request to the same website, picked at random in this range. */
  delayMs: { min: 2000, max: 3000 },

  /** Give up on a single request after this long. */
  requestTimeoutMs: 30_000,

  /** How the scraper introduces itself to websites. */
  userAgent: `DiscountKoiBot/1.0 (${contact})`,

  /**
   * Scheduled runs only go ahead between these hours, Sudbury time (6:00–7:59 AM),
   * and only once per day. Manual runs ignore this.
   */
  runWindow: { fromHour: 6, toHour: 8 },

  /** Where the finished deal list is written. */
  dealsFile: "data/deals.json",
} as const;
