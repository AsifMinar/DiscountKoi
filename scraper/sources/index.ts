import type { Source } from "./types";

/**
 * Every source the scraper runs, in priority order (if two sources find the same
 * deal, the one listed first wins). To add a source: create a file in this folder
 * that exports a `Source`, import it here, and add it to the list.
 */
export const SOURCES: Source[] = [];
