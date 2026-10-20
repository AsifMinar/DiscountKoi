"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import type { Deal } from "@shared/deal";
import type { DealTypeId } from "@shared/taxonomy";
import { DealCard, DealCardSkeleton } from "@/components/DealCard";
import { DealModal } from "@/components/DealModal";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  SORTS,
  filterDeals,
  filtersToSearch,
  hasActiveFilters,
  isDefaultView,
  sortDeals,
  splitDefaultView,
  type SortId,
  type StoreOption,
} from "@/lib/filters";
import { useFilters, useSearchString, useToday } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

const GRID = "grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

const plural = (n: number) => `${n.toLocaleString("en-CA")} ${n === 1 ? "deal" : "deals"}`;

function SectionHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {count && (
          <p aria-live="polite" className="mt-0.5 text-sm text-ink-muted">
            {count}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function DealList({ deals, today, search }: { deals: Deal[]; today: string; search: string }) {
  return (
    <ul role="list" className={GRID}>
      {deals.map((deal) => (
        <li key={deal.id}>
          <DealCard deal={deal} today={today} search={search} />
        </li>
      ))}
    </ul>
  );
}

export type DealExplorerProps = {
  /** First screen of deals, baked into the HTML at build time. */
  initialDeals: Deal[];
  /** Total deal count at build time (shown until the full list loads). */
  total: number;
  stores: StoreOption[];
  /** Sudbury date of the build, used for "Ends in X days" in the static HTML. */
  buildDay: string;
  /** Only show deals of this type (the Student and Free pages). Its chip is hidden. */
  lockedType?: DealTypeId;
};

/** Filters + deal grid. Filter state lives in the URL; filtering runs in the browser. */
export function DealExplorer({
  initialDeals,
  total,
  stores,
  buildDay,
  lockedType,
}: DealExplorerProps) {
  const [filters, update] = useFilters();
  const search = useSearchString();
  const today = useToday(buildDay);
  const { deals: allDeals, failed } = useAllDeals();
  const pageDeals = useMemo(
    () =>
      allDeals && lockedType ? allDeals.filter((d) => d.dealType.includes(lockedType)) : allDeals,
    [allDeals, lockedType],
  );

  // Typing stays snappy: the list re-filters a beat behind the keystrokes.
  const active = useDeferredValue(filters);
  const defaultView = isDefaultView(active);
  const source = pageDeals ?? initialDeals;
  // The baked-in deals are enough for the untouched page; anything else needs the full list.
  const ready = pageDeals !== null || defaultView;

  const results = useMemo(
    () => sortDeals(filterDeals(source, active, today), active.sort),
    [source, active, today],
  );
  const { highlight, sudburyTotal, rest } = useMemo(() => splitDefaultView(results), [results]);

  // "Show more" count, reset whenever the filters change.
  const signature = filtersToSearch(active);
  const [paging, setPaging] = useState({ signature, count: PAGE_SIZE });
  const visible = paging.signature === signature ? paging.count : PAGE_SIZE;

  const list = defaultView ? rest : results;
  // Before the full list arrives, the untouched home page knows its size from the build.
  const listTotal = defaultView && !pageDeals ? total - highlight.length : list.length;

  const sortSelect = (
    <Select
      label="Sort deals"
      value={filters.sort}
      onChange={(e) => update({ sort: e.target.value as SortId })}
      options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
    />
  );

  const clearAll = () => update(DEFAULT_FILTERS);

  return (
    <div className="flex flex-col gap-12">
      <FilterBar filters={filters} update={update} stores={stores} hiddenType={lockedType} />

      {defaultView && highlight.length > 0 && (
        <section aria-labelledby="sudbury-heading" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="sudbury-heading" className="text-xl font-semibold tracking-tight">
                Sudbury deals
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">Right here in Greater Sudbury</p>
            </div>
            {sudburyTotal > highlight.length && (
              <Button variant="secondary" onClick={() => update({ loc: "sudbury" })}>
                See all {sudburyTotal} Sudbury deals
              </Button>
            )}
          </div>
          <DealList deals={highlight} today={today} search={search} />
        </section>
      )}

      <section
        id="deals"
        aria-label="Deals"
        hidden={defaultView && highlight.length > 0 && listTotal === 0}
        className="flex scroll-mt-28 flex-col gap-5"
      >
        <SectionHeader
          title={defaultView ? (highlight.length ? "More deals" : "All deals") : "Results"}
          count={ready ? plural(listTotal) : "Loading deals…"}
        >
          {sortSelect}
        </SectionHeader>

        {!ready && failed && (
          <EmptyState
            title="Couldn't load all deals"
            action={<Button onClick={() => window.location.reload()}>Try again</Button>}
          >
            Check your connection and try again.
          </EmptyState>
        )}

        {!ready && !failed && (
          <ul role="list" className={GRID} aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <DealCardSkeleton />
              </li>
            ))}
          </ul>
        )}

        {ready && list.length === 0 && hasActiveFilters(active) && (
          <EmptyState
            title="No deals match your filters"
            action={<Button onClick={clearAll}>Clear filters</Button>}
          >
            Try removing a filter or searching for something else.
          </EmptyState>
        )}

        {ready && list.length === 0 && !hasActiveFilters(active) && highlight.length === 0 && (
          <EmptyState title="No deals here right now">
            New deals arrive every morning at 6 AM. Check back tomorrow.
          </EmptyState>
        )}

        {ready && list.length > 0 && (
          // Re-keyed on every filter change so new results fade in softly.
          <div key={signature} className="flex animate-fade-in flex-col gap-8">
            <DealList deals={list.slice(0, visible)} today={today} search={search} />
            {listTotal > visible && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={!pageDeals}
                  onClick={() => setPaging({ signature, count: visible + PAGE_SIZE })}
                >
                  Show more
                </Button>
                <p className="text-xs text-ink-muted">
                  Showing {visible} of {listTotal}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <DealModal allDeals={allDeals} initialDeals={initialDeals} failed={failed} today={today} />
    </div>
  );
}
