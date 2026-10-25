/**
 * Scraper settings, all in one place. Change the numbers freely.
 */

// Site owners see this in their logs and can find the project (and its owner) from it.
const repo = process.env.GITHUB_REPOSITORY ?? "AsifMinar/DiscountKoi";

export const CONFIG = {
  /** Deals without an end date are removed this many days after we first found them. */
  maxAgeDaysNoEndDate: 14,

  /** Free stuff (giveaways, samples) without an end date is removed sooner. */
  maxAgeDaysFreebies: 7,

  /** How the scraper introduces itself to websites. Never changed or disguised. */
  userAgent: `DiscountKoiBot/1.0 (+https://github.com/${repo})`,

  /**
   * Pause between requests to the same website, picked at random in this range. If the
   * site's robots.txt asks for a longer Crawl-delay, that wins.
   */
  delayMs: { min: 2000, max: 3000 },

  /** How many different websites may be fetched at the same moment (each one stays sequential). */
  maxConcurrency: 2,

  /** Give up on a single request after this long. */
  requestTimeoutMs: 30_000,

  /** Retries after a network error or a 5xx answer, waiting longer each time (2 s, 4 s, …). */
  maxRetries: 2,
  backoffBaseMs: 2000,

  /**
   * A 429/503 with Retry-After is honoured if the wait is at most this long; anything longer
   * means "not today" and the source is skipped. The scraper never works around a rate limit.
   */
  maxRetryAfterMs: 60_000,

  /** Pages bigger than this are refused (protects the daily run from huge downloads). */
  maxBodyBytes: 5 * 1024 * 1024,

  /**
   * Remembers ETag / Last-Modified per page so unchanged pages come back as a tiny
   * "304 Not Modified". Kept between daily runs by the workflow's cache. Not committed.
   */
  httpCacheFile: ".cache/http-cache.json",
  httpCacheMaxAgeDays: 30,

  /**
   * Scheduled runs only go ahead between these hours, Sudbury time (6 AM to midnight),
   * and only once per day. The window is wide because GitHub often starts scheduled
   * runs hours late; a late run is better than none. Manual runs ignore this.
   */
  runWindow: { fromHour: 6, toHour: 24 },

  /** Where the finished deal list is written. */
  dealsFile: "data/deals.json",
} as const;
