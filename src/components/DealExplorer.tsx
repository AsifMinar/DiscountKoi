"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Deal } from "@shared/deal";
import type { DealTypeId } from "@shared/taxonomy";
import { DealCard, DealCardSkeleton } from "@/components/DealCard";
import { DealModal } from "@/components/DealModal";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { FlyerLinks } from "@/components/FlyerLinks";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select } from "@/components/ui/Select";
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  SORTS,
  facetCounts,
  filterDeals,
  filtersToSearch,
  hasActiveFilters,
  isDefaultView,
  sortDeals,
  splitDefaultView,
  type FacetCounts,
  type SortId,
  type StoreOption,
} from "@/lib/filters";
import { plural } from "@/lib/format";
import { useFilters, useSearchString, useToday } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

const GRID = "grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

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
  /** Deals per type and category at build time: which chips to show, and their first counts. */
  counts: FacetCounts;
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
  counts,
  buildDay,
  lockedType,
}: DealExplorerProps) {
  const [filters, update] = useFilters();
  const search = useSearchString();
  const today = useToday(buildDay);
  const { deals: allDeals, failed } = useAllDeals();
  const pageDeals = useMemo(
    () =>
      allDeals &&
      allDeals.filter((d) => !d.sample && (!lockedType || d.dealType.includes(lockedType))),
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
  // The home page groups flyers and food help; the Student and Free pages list everything.
  const grouped = !lockedType;
  const { flyers, foodHelp, highlight, sudburyTotal, rest } = useMemo(
    () => splitDefaultView(results, grouped),
    [results, grouped],
  );
  // Food help isn't in the first-screen HTML, so the build's count stands in until it loads.
  const foodHelpCount = !grouped
    ? 0
    : pageDeals
      ? foodHelp.length
      : (counts.cats["food-help"] ?? 0);
  // Chip counts follow the other filters once every deal is here.
  const liveCounts = useMemo(
    () => (pageDeals ? facetCounts(pageDeals, active, today) : counts),
    [pageDeals, active, today, counts],
  );

  // "Show more" count, reset whenever the filters change.
  const signature = filtersToSearch(active);
  const [paging, setPaging] = useState({ signature, count: PAGE_SIZE });
  const visible = paging.signature === signature ? paging.count : PAGE_SIZE;

  const list = defaultView ? rest : results;
  // Before the full list arrives, the untouched home page knows its size from the build.
  const listTotal =
    defaultView && !pageDeals
      ? total - flyers.length - highlight.length - foodHelpCount
      : list.length;
  // Anything shown above the main list on the untouched page.
  const sectionsAbove = defaultView && flyers.length + highlight.length + foodHelpCount > 0;

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
      <FilterBar
        filters={filters}
        update={update}
        stores={stores}
        available={counts}
        counts={liveCounts}
        hiddenType={lockedType}
      />

      {defaultView && flyers.length > 0 && <FlyerLinks flyers={flyers} />}

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

      {defaultView && foodHelpCount > 0 && (
        <GlassCard
          as="section"
          aria-labelledby="food-help-heading"
          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div>
            <h2 id="food-help-heading" className="text-xl font-semibold tracking-tight">
              Food help in Sudbury
            </h2>
            <p className="mt-0.5 text-sm text-pretty text-ink-muted">
              {foodHelpCount} food banks, meal programs and Good Food Box locations
            </p>
          </div>
          <Button variant="secondary" onClick={() => update({ cats: ["food-help"] })}>
            See all {foodHelpCount}
          </Button>
        </GlassCard>
      )}

      <section
        id="deals"
        aria-label="Deals"
        hidden={sectionsAbove && listTotal === 0}
        className="flex scroll-mt-28 flex-col gap-5"
      >
        <SectionHeader
          title={defaultView ? (sectionsAbove ? "More deals" : "All deals") : "Results"}
          count={ready ? plural(listTotal, "deal") : "Loading deals…"}
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

        {ready && list.length === 0 && !hasActiveFilters(active) && !sectionsAbove && (
          <EmptyState title="No deals here right now">
            New deals arrive every morning. Check back tomorrow.
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
