import type { ReactNode } from "react";
import { SearchBar } from "@/components/SearchBar";
import { formatUpdated } from "@/lib/format";

/** "● Updated Fri, Nov 27, 6:04 a.m." with a live dot. */
export function UpdatedPill({ updatedAt }: { updatedAt: string }) {
  return (
    <p className="inline-flex shrink-0 items-center gap-2 self-start rounded-full glass px-3 py-1.5 eyebrow tracking-normal normal-case sm:self-auto">
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-teal-text opacity-60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-teal-text" />
      </span>
      <span>
        Updated <time dateTime={updatedAt}>{formatUpdated(updatedAt)}</time>
        <span className="sr-only"> (Sudbury time)</span>
      </span>
    </p>
  );
}

/**
 * Page header in the command-center layout: the title and a short line on the left, when
 * it was updated on the right, and a full-width search bar that stays at the top of the
 * screen on desktop while the list scrolls.
 */
export function PageHero({
  title,
  children,
  updatedAt,
  searchLabel,
  searchPlaceholder,
  resultsId,
  noSearch,
  before,
  actions,
  eyebrow = "Discount Koi · Greater Sudbury",
}: {
  title: ReactNode;
  children: ReactNode;
  updatedAt: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  resultsId?: string;
  /** Pages without a deal list to search (e.g. All stores). */
  noSearch?: boolean;
  /** Shown before the title, e.g. a store's badge. */
  before?: ReactNode;
  /** Buttons under the subtitle, e.g. a store's flyer link. */
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {before}
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex items-center gap-2 eyebrow">
              <span aria-hidden="true" className="h-px w-6 bg-accent" />
              {eyebrow}
            </p>
            <h1 className="max-w-3xl text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-[2.5rem]">
              {title}
            </h1>
            <p className="max-w-2xl text-base text-pretty text-ink-muted">{children}</p>
            {actions && <div className="mt-2 flex flex-wrap gap-3">{actions}</div>}
          </div>
        </div>
        <UpdatedPill updatedAt={updatedAt} />
      </header>
      {!noSearch && (
        // On desktop the search follows you down the page; phones keep it in place.
        <div className="z-30 -mx-1 px-1 py-1 lg:sticky lg:top-3">
          <SearchBar label={searchLabel} placeholder={searchPlaceholder} resultsId={resultsId} />
        </div>
      )}
    </>
  );
}

/** Shared page width and spacing. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[96rem] flex-col gap-6 pt-6 sm:gap-8 lg:pt-8">
      {children}
    </div>
  );
}
