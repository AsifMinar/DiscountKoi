"use client";

import { SearchIcon, CloseIcon } from "@/components/icons";
import { useFilters } from "@/lib/url-state";

/** Big glass search field. Searches deal titles, stores and brands as you type. */
export function SearchBar() {
  const [filters, update] = useFilters();

  return (
    <form
      role="search"
      className="w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
        document.getElementById("deals")?.scrollIntoView({ block: "start" });
      }}
    >
      <label className="flex h-14 w-full items-center gap-3 rounded-full glass-strong pr-2 pl-5 frost focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        <SearchIcon className="size-5 shrink-0 text-ink-muted" />
        <span className="sr-only">Search deals, stores or brands</span>
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={100}
          placeholder="Search deals, stores or brands"
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          className="h-full w-full min-w-0 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => update({ q: "" })}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-neutral-soft hover:text-ink"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
      </label>
    </form>
  );
}
