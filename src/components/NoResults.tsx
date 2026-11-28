"use client";

import { useMemo } from "react";
import type { Deal } from "@shared/deal";
import { CATEGORIES, type CategoryId } from "@shared/taxonomy";
import { EmptyState } from "@/components/EmptyState";
import { CategoryIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { hasActiveFilters, type FacetCounts, type Filters } from "@/lib/filters";
import { plural } from "@/lib/format";
import { countWithoutFilters, spellingSuggestion } from "@/lib/suggest";
import { categoryTint } from "@/lib/tints";

/**
 * Zero results, without a dead end: a spelling fix if one finds deals, the same search
 * without filters, popular categories to browse, and a reset.
 */
export function NoResults({
  deals,
  filters,
  update,
  today,
  counts,
  onClearAll,
}: {
  deals: Deal[];
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  today: string;
  counts: FacetCounts;
  onClearAll: () => void;
}) {
  const q = filters.q.trim();
  const otherFilters = hasActiveFilters({ ...filters, q: "" });
  const spelling = useMemo(
    () => (q ? spellingSuggestion(deals, filters, today) : null),
    [q, deals, filters, today],
  );
  const looser = useMemo(
    () => (q && otherFilters ? countWithoutFilters(deals, filters, today) : 0),
    [q, otherFilters, deals, filters, today],
  );
  const popular = useMemo(
    () =>
      (Object.entries(counts.cats) as [CategoryId, number][])
        .filter(([id, n]) => id !== "food-help" && n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => CATEGORIES.find((c) => c.id === id)!),
    [counts.cats],
  );

  const title = q ? `No deals match “${q}”` : "No deals match your filters";
  const hint = q
    ? otherFilters
      ? "Your filters may be too narrow, or the word isn't in any deal yet."
      : "Try a store name (like “Metro”) or a simpler word (like “pizza” instead of “pizzas”)."
    : "Try removing a filter. Each chip above can be removed on its own.";

  return (
    <EmptyState
      title={title}
      icon={<SearchIcon className="size-7" />}
      action={
        spelling ? (
          <Button onClick={() => update({ q: spelling.query })}>
            Search “{spelling.query}” · {plural(spelling.count, "deal")}
          </Button>
        ) : looser > 0 ? (
          <Button onClick={() => update({ ...clearedFilters(filters) })}>
            See {plural(looser, "result")} without filters
          </Button>
        ) : (
          <Button onClick={onClearAll}>Clear search and filters</Button>
        )
      }
      secondary={
        (spelling || looser > 0) && (
          <Button variant="ghost" onClick={onClearAll}>
            Clear all
          </Button>
        )
      }
      extra={
        popular.length > 0 && (
          <div className="flex flex-col items-center gap-3 border-t border-line pt-5">
            <p className="eyebrow">Or browse popular categories</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {popular.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => update({ ...clearedFilters(filters), q: "", cats: [c.id] })}
                    className="inline-flex h-11 items-center gap-2 rounded-full glass pr-4 pl-1.5 text-sm font-medium transition-shadow hover:shadow-[var(--glass-shadow-hover)]"
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full",
                        categoryTint(c.id),
                      )}
                    >
                      <CategoryIcon category={c.id} className="size-4" />
                    </span>
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      }
    >
      <p>
        {spelling ? (
          <>
            Did you mean <strong className="font-semibold text-ink">“{spelling.query}”</strong>
            ?{" "}
          </>
        ) : null}
        {hint}
      </p>
    </EmptyState>
  );
}

/** Every filter off, keeping the search and sort. */
function clearedFilters(f: Filters): Partial<Filters> {
  return {
    types: [],
    cats: [],
    loc: null,
    store: null,
    channel: null,
    off: null,
    under: null,
    sort: f.sort,
  };
}
