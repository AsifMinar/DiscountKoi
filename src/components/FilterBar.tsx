"use client";

import { CATEGORIES, DEAL_TYPES, LOCATIONS } from "@shared/taxonomy";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select } from "@/components/ui/Select";
import { hasActiveFilters, DEFAULT_FILTERS, type Filters, type StoreOption } from "@/lib/filters";

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// On phones each chip row scrolls sideways; the soft fade on the right hints there's more.
const CHIP_ROW =
  "scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 pr-8 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]";

type FilterBarProps = {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  stores: StoreOption[];
};

/** Deal type chips, category chips, and location/store dropdowns in one glass panel. */
export function FilterBar({ filters, update, stores }: FilterBarProps) {
  return (
    <GlassCard frosted className="flex flex-col gap-3 p-3 sm:p-4">
      <div role="group" aria-label="Deal type" className={CHIP_ROW}>
        {DEAL_TYPES.map((t) => (
          <Chip
            key={t.id}
            selected={filters.types.includes(t.id)}
            onClick={() => update({ types: toggle(filters.types, t.id) })}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      <div role="group" aria-label="Category" className={CHIP_ROW}>
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            selected={filters.cats.includes(c.id)}
            onClick={() => update({ cats: toggle(filters.cats, c.id) })}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="Location"
          value={filters.loc ?? ""}
          onChange={(e) => update({ loc: (e.target.value || null) as Filters["loc"] })}
          options={[
            { value: "", label: "Anywhere" },
            ...LOCATIONS.map((l) => ({ value: l.id, label: l.badge })),
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
            className="ml-auto"
            onClick={() => update({ ...DEFAULT_FILTERS, sort: filters.sort })}
          >
            Clear all
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
