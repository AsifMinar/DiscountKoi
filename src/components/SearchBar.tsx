"use client";

import { useEffect, useId, useRef, useState } from "react";
import { openCommandPalette } from "@/components/CommandPalette";
import { AlertIcon, SearchIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useFilters } from "@/lib/url-state";

const MAX_LENGTH = 100;

/** What's wrong with a search, in plain words, or null when it's fine. */
export function searchProblem(q: string): string | null {
  const text = q.trim();
  if (!text) return null;
  if (q.length >= MAX_LENGTH)
    return `Searches can be up to ${MAX_LENGTH} characters. Try fewer words.`;
  if (!/[\p{L}\p{N}]/u.test(text))
    return "Use letters or numbers. Symbols alone won't match any deal.";
  return null;
}

/** Big glass search field. Filters as you type; the text lives in the URL as ?q=. */
export function SearchBar({
  label = "Search deals, stores or brands",
  placeholder = label,
  resultsId = "deals",
}: {
  /** Read by screen readers. */
  label?: string;
  placeholder?: string;
  /** Section to scroll to when Enter is pressed. */
  resultsId?: string;
}) {
  const [filters, update] = useFilters();
  const [touched, setTouched] = useState(false);
  const messageId = useId();
  const problem = searchProblem(filters.q);
  const showProblem = Boolean(problem && (touched || filters.q.length >= MAX_LENGTH));
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the search box from anywhere on the page (unless you're already typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], dialog[open]")) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: "center" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
        document.getElementById(resultsId)?.scrollIntoView({ block: "start" });
      }}
    >
      <label
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-2xl glass-strong pr-1.5 pl-5 frost focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
          showProblem && "ring-1 ring-tint-rose-text/50",
        )}
      >
        <SearchIcon className="size-5 shrink-0 text-ink-muted" />
        <span className="sr-only">{label}</span>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={MAX_LENGTH}
          aria-invalid={showProblem || undefined}
          aria-describedby={showProblem ? messageId : undefined}
          placeholder={placeholder}
          value={filters.q}
          onChange={(e) => {
            update({ q: e.target.value });
            // Check as they type once a word is there; fully on leaving the field.
            if (/\s/.test(e.target.value)) setTouched(true);
          }}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            // Escape clears the search, then a second Escape leaves the box.
            if (e.key !== "Escape") return;
            if (filters.q) {
              e.preventDefault();
              update({ q: "" });
            } else e.currentTarget.blur();
          }}
          aria-keyshortcuts="/"
          className="h-full w-full min-w-0 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {/* Keyboard hint for mouse users; hidden on touch screens and once typing. */}
        {!filters.q && (
          <kbd
            aria-hidden="true"
            className="mr-3 hidden h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-line px-1.5 font-mono text-xs text-ink-muted pointer-fine:inline-flex [label:focus-within_&]:hidden"
          >
            /
          </kbd>
        )}
        {filters.q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => update({ q: "" })}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-neutral-soft hover:text-ink"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
        {/* Desktop: the ⌘K palette jumps straight to a store, category or page. */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden h-11 shrink-0 items-center gap-2 rounded-xl border-l border-line pr-3 pl-4 text-sm text-ink-muted transition-colors hover:text-ink lg:inline-flex"
        >
          Jump to…
          <kbd className="rounded-md border border-line px-1.5 font-mono text-xs">⌘K</kbd>
        </button>
      </label>
      {showProblem && (
        <p
          id={messageId}
          className="mt-2 flex items-start justify-center gap-1.5 text-left text-sm text-tint-rose-text"
        >
          <AlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {problem}
        </p>
      )}
    </form>
  );
}
