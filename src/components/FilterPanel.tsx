"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CATEGORIES, DEAL_TYPES, LOCATIONS, type DealTypeId } from "@shared/taxonomy";
import { CloseIcon } from "@/components/icons";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import {
  CHANNELS,
  DEFAULT_FILTERS,
  MAX_PRICES,
  MIN_DISCOUNTS,
  activeFilterCount,
  type FacetCounts,
  type Filters,
  type StoreOption,
} from "@/lib/filters";
import { plural } from "@/lib/format";

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Clears every filter but keeps the search text and sort. */
export const clearFilters = (filters: Filters): Filters => ({
  ...DEFAULT_FILTERS,
  q: filters.q,
  sort: filters.sort,
});

// One row per choice, at least 44px tall so it's easy to tap.
const OPTION =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm transition-colors duration-150 ease-out hover:bg-neutral-soft has-[:disabled]:cursor-default has-[:disabled]:opacity-45 has-[:disabled]:hover:bg-transparent";
const INPUT = "size-4 shrink-0 accent-accent";

// A labelled group rather than <fieldset>, whose <legend> would sit inside the divider line.
function Group({ legend, children }: { legend: string; children: ReactNode }) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col gap-0.5 border-t border-line pt-4 first:border-t-0 first:pt-0"
    >
      <p
        id={id}
        className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-ink-muted uppercase"
      >
        {legend}
      </p>
      {children}
    </div>
  );
}

function Count({ n }: { n?: number }) {
  if (n === undefined) return null;
  return <span className="ml-auto text-xs text-ink-muted tabular-nums">{n}</span>;
}

/** A single-choice group ("Anywhere / Sudbury / Ontario"). */
function Choices<T extends string | number>({
  name,
  legend,
  value,
  options,
  anyLabel = "Any",
  onChange,
}: {
  name: string;
  legend: string;
  value: T | null;
  /** The "no filter" choice. */
  anyLabel?: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T | null) => void;
}) {
  return (
    <Group legend={legend}>
      {[{ value: null, label: anyLabel }, ...options].map((o) => (
        <label key={String(o.value)} className={OPTION}>
          <input
            type="radio"
            name={name}
            className={INPUT}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </Group>
  );
}

type FilterPanelProps = {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  stores: StoreOption[];
  /** Build-time counts: an option only appears if it has deals on this page. */
  available: FacetCounts;
  /** Live counts for the current filters, shown on each option. */
  counts: FacetCounts;
  /** A type the page already locks in (e.g. Student on the Student page), so it's hidden. */
  hiddenType?: DealTypeId;
  /** Store pages already show one store. */
  hideStores?: boolean;
};

/**
 * Every filter as a list of checkboxes and radio buttons: the sidebar on big screens,
 * and the inside of the Filters sheet on phones. Changes apply right away.
 */
export function FilterPanel({
  filters,
  update,
  stores,
  available,
  counts,
  hiddenType,
  hideStores,
}: FilterPanelProps) {
  // Two panels can be on the page at once (sidebar and sheet), so radio names must differ.
  const id = useId();
  const types = DEAL_TYPES.filter(
    (t) =>
      t.id !== hiddenType &&
      !CHANNELS.some((c) => c.id === t.id) &&
      (available.types[t.id] || filters.types.includes(t.id)),
  );
  const cats = CATEGORIES.filter((c) => available.cats[c.id] || filters.cats.includes(c.id));

  return (
    <div className="flex flex-col gap-4">
      {types.length > 0 && (
        <Group legend="Deal type">
          {types.map((t) => {
            const selected = filters.types.includes(t.id);
            const count = counts.types[t.id] ?? 0;
            return (
              <label key={t.id} className={OPTION}>
                <input
                  type="checkbox"
                  className={INPUT}
                  checked={selected}
                  disabled={!selected && count === 0}
                  onChange={() => update({ types: toggle(filters.types, t.id) })}
                />
                {t.label}
                <Count n={count} />
              </label>
            );
          })}
        </Group>
      )}

      {cats.length > 1 && (
        <Group legend="Category">
          {cats.map((c) => {
            const selected = filters.cats.includes(c.id);
            const count = counts.cats[c.id] ?? 0;
            return (
              <label key={c.id} className={OPTION}>
                <input
                  type="checkbox"
                  className={INPUT}
                  checked={selected}
                  disabled={!selected && count === 0}
                  onChange={() => update({ cats: toggle(filters.cats, c.id) })}
                />
                {c.label}
                <Count n={count} />
              </label>
            );
          })}
        </Group>
      )}

      <Choices
        name={`${id}-loc`}
        legend="Location"
        anyLabel="Anywhere"
        value={filters.loc}
        options={LOCATIONS.map((l) => ({ value: l.id, label: l.label }))}
        onChange={(loc) => update({ loc })}
      />

      <Choices
        name={`${id}-off`}
        legend="Discount"
        value={filters.off}
        options={MIN_DISCOUNTS.map((n) => ({ value: n, label: `${n}% off or more` }))}
        onChange={(off) => update({ off })}
      />

      <Choices
        name={`${id}-under`}
        legend="Price"
        value={filters.under}
        options={MAX_PRICES.map((n) => ({ value: n, label: `Under $${n}` }))}
        onChange={(under) => update({ under })}
      />

      {!hideStores && stores.length > 1 && (
        <Group legend="Store">
          <Select
            label="Store or brand"
            className="w-full"
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
        </Group>
      )}
    </div>
  );
}

/** The sidebar version: a sticky glass panel with a "Clear all" link. */
export function FilterSidebar(props: FilterPanelProps) {
  const active = activeFilterCount(props.filters) > 0;
  return (
    <aside
      aria-label="Filters"
      className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-3xl glass p-3 lg:block"
    >
      <div className="mb-3 flex h-11 items-center justify-between pl-2">
        <h2 className="text-base font-semibold">Filters</h2>
        {active && (
          <Button variant="ghost" onClick={() => props.update(clearFilters(props.filters))}>
            Clear all
          </Button>
        )}
      </div>
      <FilterPanel {...props} />
    </aside>
  );
}

/**
 * Phones and tablets: the filters slide up in a sheet from the bottom. Built on the
 * native <dialog>, so focus stays inside and Escape closes it.
 */
export function FilterSheet({
  open,
  onClose,
  resultCount,
  ...props
}: FilterPanelProps & { open: boolean; onClose: () => void; resultCount: number }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="filters-heading"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="mx-0 mt-auto mb-0 max-h-[85dvh] w-full max-w-none animate-fade-in flex-col rounded-t-3xl glass-strong p-0 text-ink frost backdrop:animate-fade-in backdrop:bg-[var(--scrim)] open:flex lg:hidden"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id="filters-heading" className="text-lg font-semibold">
          Filters
        </h2>
        <button
          type="button"
          aria-label="Close filters"
          onClick={onClose}
          className={buttonClasses({ variant: "ghost", size: "icon", className: "-mr-2" })}
        >
          <CloseIcon className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <FilterPanel {...props} />
      </div>
      <div className="flex items-center gap-3 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button variant="ghost" onClick={() => props.update(clearFilters(props.filters))}>
          Clear all
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Show {plural(resultCount, "deal")}
        </Button>
      </div>
    </dialog>
  );
}

/** "All · In store · Online": a segmented switch built on radio buttons (arrow keys work). */
export function ChannelSwitch({
  value,
  onChange,
  className,
}: {
  value: Filters["channel"];
  onChange: (value: Filters["channel"]) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Where to buy"
      className={cn("inline-flex h-11 shrink-0 rounded-full glass p-1", className)}
    >
      {[{ id: null, label: "All" }, ...CHANNELS].map((c) => (
        <label
          key={c.label}
          className={cn(
            "inline-flex flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
            value === c.id ? "bg-ink text-page" : "text-ink-muted hover:text-ink",
          )}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === c.id}
            onChange={() => onChange(c.id)}
          />
          {c.label}
        </label>
      ))}
    </div>
  );
}
