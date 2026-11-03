import type { CategoryId, DealTypeId, LocationId } from "@shared/taxonomy";
import type { PoliteFetcher } from "../lib/http";

/**
 * What a source hands back. Only the first four fields are required; the pipeline
 * cleans the text, works out the id, discount %, deal types and category, and
 * validates everything before it reaches the website.
 */
export type RawDeal = {
  title: string;
  /** Link to the original deal (must be http/https). */
  url: string;
  store: string;
  location: LocationId;

  description?: string;
  brand?: string;
  originalPrice?: number;
  salePrice?: number;
  discountPercent?: number;
  /** Set what you know (e.g. ["online"]). "free" and "student" are also detected from the text. */
  dealType?: DealTypeId[];
  /** Leave empty to let categorize.ts pick one from keywords. */
  category?: CategoryId;
  /** Thumbnail URL to hotlink (never downloaded). Must be https. */
  imageUrl?: string;
  /** Credit line for the photo, if its licence needs one. */
  imageCredit?: string;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  endDate?: string;
  /** Prices are CAD unless this says "USD". */
  currency?: "CAD" | "USD";
  /** Credit line the source's terms or licence require. */
  attribution?: string;
  /** Permanent program (food bank, meal program): not removed by the no-end-date expiry. */
  ongoing?: boolean;
  /**
   * When the source published it (ISO date-time), e.g. an RSS item's pubDate. Used as
   * "first seen" for new items so old feed posts don't show up as new and age out on time.
   */
  publishedAt?: string;
};

export type SourceContext = {
  /** Polite HTTP client: obeys robots.txt, waits 2–3 s between requests, identifies itself. */
  http: PoliteFetcher;
  log: (message: string) => void;
  /** The time this run started (one shared clock for every source). */
  now: Date;
};

/**
 * Every source module exports one of these. To add a source, create a file in
 * scraper/sources/ that exports a Source, then add it to the list in sources/index.ts.
 */
export type Source = {
  /** Short, permanent id saved on every deal, e.g. "itch-io-sales". Don't change it later. */
  id: string;
  /** Human-friendly name for logs and the summary. */
  name: string;
  /** Set to false to switch a source off without deleting it. */
  enabled: boolean;
  /**
   * Set to true if this source only reads files in this repo (no web requests), so
   * `npm run scrape:local` and the deploy build can run it any time.
   */
  local?: boolean;
  /**
   * Fetch and return this source's current deals. Throw if anything goes wrong: the
   * pipeline will log it and keep this source's deals from the previous run.
   */
  fetchDeals(context: SourceContext): Promise<RawDeal[]>;
};
