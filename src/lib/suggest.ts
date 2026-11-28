import type { Deal } from "@shared/deal";
import { DEFAULT_FILTERS, filterDeals, fold, type Filters } from "@/lib/filters";

/* Ways out of a search with no results: a spelling fix, or dropping the filters. */

const vocabularies = new WeakMap<Deal[], string[]>();

/** Every word (3+ letters) in the deals' titles, stores and brands. */
function vocabulary(deals: Deal[]): string[] {
  let words = vocabularies.get(deals);
  if (!words) {
    const set = new Set<string>();
    for (const d of deals) {
      for (const w of fold(`${d.title} ${d.store} ${d.brand ?? ""}`).split(/[^\p{L}\p{N}]+/u)) {
        if (w.length >= 3) set.add(w);
      }
    }
    words = [...set];
    vocabularies.set(deals, words);
  }
  return words;
}

/** Edit distance (with swapped letters counting as one edit), stopping early past `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) rows.push([i]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/**
 * "Did you mean…": swaps each unknown search word for the closest real word, and only
 * suggests the result if it actually finds deals with the current filters.
 */
export function spellingSuggestion(
  deals: Deal[],
  filters: Filters,
  today: string,
): { query: string; count: number } | null {
  const words = fold(filters.q).split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const vocab = vocabulary(deals);
  let changed = false;
  const fixed = words.map((word) => {
    if (word.length < 3 || vocab.some((v) => v.includes(word))) return word;
    const max = word.length <= 4 ? 1 : 2;
    let best: string | null = null;
    let bestDistance = max + 1;
    for (const v of vocab) {
      const d = editDistance(word, v, max);
      if (d < bestDistance) {
        best = v;
        bestDistance = d;
      }
    }
    if (!best) return word;
    changed = true;
    return best;
  });
  if (!changed) return null;
  const query = fixed.join(" ");
  const count = filterDeals(deals, { ...filters, q: query }, today).length;
  return count ? { query, count } : null;
}

/** How many deals the same search finds with every other filter removed. */
export function countWithoutFilters(deals: Deal[], filters: Filters, today: string): number {
  return filterDeals(deals, { ...DEFAULT_FILTERS, q: filters.q, sort: filters.sort }, today).length;
}
