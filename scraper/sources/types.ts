import type { CategoryId, DealTypeId, LocationId } from "@shared/taxonomy";
import type { Unit } from "@shared/units";
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

  /* Product listings. Set productName to make it one; the unit price is worked out from
     size (or from unit alone for "$3.99/lb" items) unless you give unitPrice yourself. */
  productName?: string;
  /** Package size as printed: "4 L", "1.36 kg", "12 eggs". */
  size?: string;
  unit?: Unit;
  unitPrice?: number;
  /** Price last time it was listed, if the source knows it (otherwise price history fills it). */
  previousPrice?: number;
  /** Affiliate link: labelled on the site and marked rel="sponsored". */
  affiliate?: boolean;
  /** Example entry, labelled "Sample" on the site and never recorded in price history. */
  sample?: boolean;
  /**
   * Extra text folded into the deal's id, for sources whose title and link repeat
   * (e.g. the same product picked again from next week's flyer is a new listing).
   */
  variant?: string;
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
   * Set to true if this source calls `http.rendered()` (headless Chromium). The daily
   * workflow only installs the browser when an enabled source needs it.
   */
  needsBrowser?: boolean;
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
