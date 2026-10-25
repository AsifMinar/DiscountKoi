"use client";

import { CATEGORIES, DEAL_TYPES, LOCATIONS, type DealTypeId } from "@shared/taxonomy";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select } from "@/components/ui/Select";
import {
  hasActiveFilters,
  DEFAULT_FILTERS,
  type FacetCounts,
  type Filters,
  type StoreOption,
} from "@/lib/filters";

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// On phones each chip row scrolls sideways; the soft fade on the right hints there's more.
const CHIP_ROW =
  "scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 pr-8 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]";

type FilterBarProps = {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  stores: StoreOption[];
  /** Build-time counts: a chip only appears if its type or category has deals on this page. */
  available: FacetCounts;
  /** Live counts for the current filters, shown on each chip. */
  counts: FacetCounts;
  /** A type the page already locks in (e.g. Student on the Student page), so its chip is hidden. */
  hiddenType?: DealTypeId;
};

/**
 * Deal type chips and location/store dropdowns on one row, category chips below.
 * Each chip shows how many deals it would add; ones that would show nothing are disabled.
 */
export function FilterBar({
  filters,
  update,
  stores,
  available,
  counts,
  hiddenType,
}: FilterBarProps) {
  const types = DEAL_TYPES.filter(
    (t) => t.id !== hiddenType && (available.types[t.id] || filters.types.includes(t.id)),
  );
  const cats = CATEGORIES.filter((c) => available.cats[c.id] || filters.cats.includes(c.id));

  return (
    <GlassCard frosted className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Deal type" className={CHIP_ROW}>
          {types.map((t) => {
            const selected = filters.types.includes(t.id);
            const count = counts.types[t.id] ?? 0;
            return (
              <Chip
                key={t.id}
                selected={selected}
                count={count}
                disabled={!selected && count === 0}
                onClick={() => update({ types: toggle(filters.types, t.id) })}
              >
                {t.label}
              </Chip>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            label="Location"
            value={filters.loc ?? ""}
            onChange={(e) => update({ loc: (e.target.value || null) as Filters["loc"] })}
            options={[
              { value: "", label: "Anywhere" },
              ...LOCATIONS.map((l) => ({ value: l.id, label: l.label })),
            ]}
          />
          <Select
            label="Store or brand"
            className="max-w-full sm:max-w-[16rem]"
            value={filters.store ?? ""}
            onChange={(e) => update({ store: e.target.value || null })}
            options={[
              { value: "", label: "All stores" },
              // Keep a store from a shared link selectable even if it has no deals today.
              ...(filters.store && !stores.some((s) => s.name === filters.store)
                ? [{ value: filters.store, label: filters.store }]
                : []),
              ...stores.map((s) => ({ value: s.name, label: `${s.name} (${s.count})` })),
            ]}
          />
          {hasActiveFilters(filters) && (
            <Button
              variant="ghost"
              className="max-lg:ml-auto"
              onClick={() => update({ ...DEFAULT_FILTERS, sort: filters.sort })}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {cats.length > 1 && (
        <div role="group" aria-label="Category" className={`${CHIP_ROW} border-t border-line pt-3`}>
          {cats.map((c) => {
            const selected = filters.cats.includes(c.id);
            const count = counts.cats[c.id] ?? 0;
            return (
              <Chip
                key={c.id}
                selected={selected}
                count={count}
                disabled={!selected && count === 0}
                onClick={() => update({ cats: toggle(filters.cats, c.id) })}
              >
                {c.label}
              </Chip>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
