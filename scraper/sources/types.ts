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
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  endDate?: string;
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
  /** Short, permanent id saved on every deal, e.g. "rfd-hot-deals". Don't change it later. */
  id: string;
  /** Human-friendly name for logs and the summary. */
  name: string;
  /** Set to false to switch a source off without deleting it. */
  enabled: boolean;
  /**
   * Fetch and return this source's current deals. Throw if anything goes wrong: the
   * pipeline will log it and keep this source's deals from the previous run.
   */
  fetchDeals(context: SourceContext): Promise<RawDeal[]>;
};
