"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Deal } from "@shared/deal";
import { DealCardSkeleton, DealGrid, GRID, WIDE_GRID } from "@/components/DealCard";
import { DealModal } from "@/components/DealModal";
import { DealPulse } from "@/components/DealPulse";
import { EmptyState } from "@/components/EmptyState";
import { CachedNotice, LoadErrorPanel, LoadingStatus } from "@/components/LoadStates";
import { NoResults } from "@/components/NoResults";
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
import { Button, ButtonLink } from "@/components/ui/Button";
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
import { dealStats, type DealStats } from "@/lib/stats";
import { isFlyer, type StoreSummary } from "@/lib/stores";
import { toast } from "@/lib/toast";
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
  home?: { stores: StoreSummary[]; studentCount: number; freeCount: number; stats: DealStats };
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
  const dealsState = useAllDeals();
  const { deals: allDeals, failed, retry } = dealsState;
  const [sheetOpen, setSheetOpen] = useState(false);
  const pageDeals = useMemo(
    () => allDeals && allDeals.filter((d) => inScope(d, scope)),
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

  // Build-time numbers until the full list arrives, then live ones (they differ after midnight).
  const stats = useMemo(
    () => (home ? (pageDeals ? dealStats(pageDeals, today) : home.stats) : null),
    [home, pageDeals, today],
  );

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
  const clearAll = () => {
    const before = filters;
    update(clearFilters({ ...filters, q: "" }));
    toast("Search and filters cleared", {
      tone: "info",
      action: { label: "Undo", onClick: () => update(before) },
    });
  };

  return (
    <div className="flex flex-col gap-12">
      {isHome && defaultView && stats && stats.live >= 3 && (
        <DealPulse
          stats={stats}
          onSort={showMore}
          onLocation={(loc) => {
            update({ loc });
            document.getElementById("deals")?.scrollIntoView({ block: "start" });
          }}
        />
      )}

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
              <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-aurora" />
                {defaultView ? "All deals" : "Results"}
              </h2>
              <p aria-live="polite" className="mt-0.5 pl-3.5 text-sm text-ink-muted tabular-nums">
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

          <CachedNotice state={dealsState} onRetry={retry} />

          {!ready && failed && (
            <LoadErrorPanel
              state={dealsState}
              onRetry={retry}
              secondary={
                hasActiveFilters(active) && (
                  <Button variant="ghost" onClick={clearAll}>
                    Show today&apos;s top deals
                  </Button>
                )
              }
            />
          )}

          {!ready && !failed && (
            <>
              <LoadingStatus state={dealsState} />
              <ul role="list" className={grid} aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <li key={i}>
                    <DealCardSkeleton />
                  </li>
                ))}
              </ul>
            </>
          )}

          {ready && list.length === 0 && hasActiveFilters(active) && (
            <NoResults
              deals={source}
              filters={active}
              update={update}
              today={today}
              counts={counts}
              onClearAll={clearAll}
            />
          )}

          {ready && list.length === 0 && !hasActiveFilters(active) && (
            <EmptyState
              title={
                scope.page === "store" ? "No deals from this store today" : "No deals here yet"
              }
              action={
                scope.page === "store" ? (
                  <ButtonLink href="/stores/">See other stores</ButtonLink>
                ) : scope.page === "home" ? (
                  <ButtonLink href="/free/">Find free stuff</ButtonLink>
                ) : (
                  <ButtonLink href="/">Browse all deals</ButtonLink>
                )
              }
              secondary={
                scope.page !== "free" &&
                scope.page !== "home" && (
                  <ButtonLink href="/free/" variant="ghost">
                    Find free stuff
                  </ButtonLink>
                )
              }
            >
              New deals arrive every morning around 6 a.m. In the meantime, other stores and the
              free section may have something for you.
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
