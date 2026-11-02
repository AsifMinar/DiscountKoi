"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Deal } from "@shared/deal";
import { DealCardSkeleton, DealGrid, GRID, WIDE_GRID } from "@/components/DealCard";
import { DealModal } from "@/components/DealModal";
import { EmptyState } from "@/components/EmptyState";
import {
  ActiveFilters,
  ChannelSwitch,
  FilterSheet,
  FilterSidebar,
  clearFilters,
} from "@/components/FilterPanel";
import {
  CategoryRail,
  DealRow,
  FlyerStrip,
  PromoCards,
  StoreGrid,
} from "@/components/HomeSections";
import { SlidersIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import {
  PAGE_SIZE,
  SORTS,
  activeFilterCount,
  facetCounts,
  filterDeals,
  filtersToSearch,
  hasActiveFilters,
  homeSections,
  inScope,
  isDefaultView,
  lockedType,
  sortDeals,
  type FacetCounts,
  type PageScope,
  type SortId,
  type StoreOption,
} from "@/lib/filters";
import { plural } from "@/lib/format";
import { isFlyer, type StoreSummary } from "@/lib/stores";
import { useFilters, useSearchString, useToday } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

/** A store with only a few deals doesn't need filters. */
const FEW_DEALS = 6;

export type DealExplorerProps = {
  /** First screen of deals, baked into the HTML at build time. */
  initialDeals: Deal[];
  /** Total deal count at build time (shown until the full list loads). */
  total: number;
  stores: StoreOption[];
  /** Deals per type and category at build time: which filters to show, and their first counts. */
  counts: FacetCounts;
  /** Sudbury date of the build, used for "Ends in X days" in the static HTML. */
  buildDay: string;
  /** Which deals this page lists (home, Student, Free or one store). */
  scope: PageScope;
  /** Home page only: the "Shop by store" tiles and the Student / Free card counts. */
  home?: { stores: StoreSummary[]; studentCount: number; freeCount: number };
};

/**
 * Filters + deal grid, with the home page's shop sections above it on the untouched
 * page. Filter state lives in the URL; filtering runs in the browser.
 */
export function DealExplorer({
  initialDeals,
  total,
  stores,
  counts,
  buildDay,
  scope,
  home,
}: DealExplorerProps) {
  const [filters, update] = useFilters();
  const search = useSearchString();
  const today = useToday(buildDay);
  const { deals: allDeals, failed } = useAllDeals();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pageDeals = useMemo(
    () => allDeals && allDeals.filter((d) => !d.sample && inScope(d, scope)),
    [allDeals, scope],
  );

  // Typing stays snappy: the list re-filters a beat behind the keystrokes.
  const active = useDeferredValue(filters);
  const defaultView = isDefaultView(active);
  const source = pageDeals ?? initialDeals;
  // The baked-in deals are enough for the untouched page; anything else needs the full list.
  const ready = pageDeals !== null || defaultView;
  const isHome = scope.page === "home";

  const results = useMemo(
    () => sortDeals(filterDeals(source, active, today), active.sort),
    [source, active, today],
  );
  const sections = useMemo(
    () => (isHome ? homeSections(source, today) : null),
    [isHome, source, today],
  );
  // Chip counts follow the other filters once every deal is here.
  const liveCounts = useMemo(
    () => (pageDeals ? facetCounts(pageDeals, active, today) : counts),
    [pageDeals, active, today, counts],
  );
  // Food help isn't in the first-screen HTML, so the build's count stands in until it loads.
  const foodHelpCount = pageDeals
    ? pageDeals.filter((d) => d.category === "food-help").length
    : (counts.cats["food-help"] ?? 0);

  // "Show more" count, reset whenever the filters change.
  const signature = filtersToSearch(active);
  const [paging, setPaging] = useState({ signature, count: PAGE_SIZE });
  const visible = paging.signature === signature ? paging.count : PAGE_SIZE;

  // On the untouched home page the flyers have their own strip above.
  const flyersApart = isHome && defaultView;
  const list = flyersApart ? results.filter((d) => !isFlyer(d)) : results;
  // Before the full list arrives, the untouched page knows its size from the build.
  const listTotal =
    defaultView && !pageDeals
      ? total - (flyersApart ? (sections?.flyers.length ?? 0) : 0)
      : list.length;

  const showMore = (sort: SortId) => {
    update({ sort });
    document.getElementById("deals")?.scrollIntoView({ block: "start" });
  };

  const filterProps = {
    filters,
    update,
    stores,
    available: counts,
    counts: liveCounts,
    hiddenType: lockedType(scope),
    hideStores: scope.page === "store",
  };
  const panelCount = activeFilterCount(filters);
  const withFilters = scope.page !== "store" || total > FEW_DEALS;
  const grid = withFilters ? GRID : WIDE_GRID;
  const clearAll = () => update(clearFilters({ ...filters, q: "" }));

  return (
    <div className="flex flex-col gap-12">
      {isHome && (
        <CategoryRail
          available={counts.cats}
          selected={filters.cats}
          onPick={(cat) => update({ cats: filters.cats.includes(cat) ? [] : [cat] })}
        />
      )}

      {isHome && defaultView && sections && (
        <>
          {sections.flyers.length > 0 && <FlyerStrip flyers={sections.flyers} />}
          {sections.top.length > 0 && (
            <DealRow
              id="top-heading"
              title="Top deals"
              subtitle="The biggest discounts right now"
              deals={sections.top}
              today={today}
              search={search}
              onSeeAll={() => showMore("discount")}
            />
          )}
          {sections.ending.length > 0 && (
            <DealRow
              id="ending-heading"
              title="Ending soon"
              subtitle="Last chance this week"
              deals={sections.ending}
              today={today}
              search={search}
              onSeeAll={() => showMore("ending")}
            />
          )}
          {home && <StoreGrid stores={home.stores} />}
          {home && <PromoCards studentCount={home.studentCount} freeCount={home.freeCount} />}
        </>
      )}

      {scope.page === "free" && defaultView && foodHelpCount > 0 && (
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
            Show only food help
          </Button>
        </GlassCard>
      )}

      <section
        id="deals"
        aria-label="Deals"
        className={cn(
          "scroll-mt-28",
          withFilters && "lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8",
        )}
      >
        {withFilters && <FilterSidebar {...filterProps} />}

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {defaultView ? "All deals" : "Results"}
              </h2>
              <p aria-live="polite" className="mt-0.5 text-sm text-ink-muted">
                {ready ? plural(listTotal, "deal") : "Loading deals…"}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <ChannelSwitch
                value={filters.channel}
                onChange={(channel) => update({ channel })}
                className="max-sm:w-full"
              />
              <Select
                label="Sort deals"
                className="max-sm:flex-1"
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as SortId })}
                options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
              />
              {withFilters && (
                <Button
                  variant="secondary"
                  className="lg:hidden"
                  onClick={() => setSheetOpen(true)}
                >
                  <SlidersIcon className="size-4" />
                  Filters
                  {panelCount > 0 && (
                    <span className="rounded-full bg-ink px-1.5 text-xs leading-5 text-page tabular-nums">
                      {panelCount}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>

          <ActiveFilters filters={filters} update={update} />

          {!ready && failed && (
            <EmptyState
              title="Couldn't load all deals"
              action={<Button onClick={() => window.location.reload()}>Try again</Button>}
            >
              Check your connection and try again.
            </EmptyState>
          )}

          {!ready && !failed && (
            <ul role="list" className={grid} aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
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

          {ready && list.length === 0 && !hasActiveFilters(active) && (
            <EmptyState title="No deals here right now">
              {scope.page === "store"
                ? "This store has no other deals listed today. New deals arrive every morning."
                : "New deals arrive every morning. Check back tomorrow."}
            </EmptyState>
          )}

          {ready && list.length > 0 && (
            // Re-keyed on every filter change so new results fade in softly.
            <div key={signature} className="flex animate-fade-in flex-col gap-8">
              <DealGrid deals={list.slice(0, visible)} today={today} search={search} grid={grid} />
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
        </div>
      </section>

      {withFilters && (
        <FilterSheet
          {...filterProps}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          resultCount={list.length}
        />
      )}
      <DealModal allDeals={allDeals} initialDeals={initialDeals} failed={failed} today={today} />
    </div>
  );
}
