import type { ReactNode } from "react";
import { SearchBar } from "@/components/SearchBar";
import { formatUpdated } from "@/lib/format";

/** Page heading, subtitle, search bar and the "Last updated" line (Sudbury time). */
export function PageHero({
  title,
  children,
  updatedAt,
  isSample,
  searchLabel,
  searchPlaceholder,
  resultsId,
  noSearch,
  before,
  actions,
}: {
  title: string;
  children: ReactNode;
  updatedAt: string;
  /** Products page only: the list includes sample listings. */
  isSample?: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  resultsId?: string;
  /** Pages without a deal list to search (e.g. All stores). */
  noSearch?: boolean;
  /** Shown above the title, e.g. a store's badge. */
  before?: ReactNode;
  /** Buttons under the subtitle, e.g. a store's flyer link. */
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-col items-center gap-4 text-center">
      {before}
      <h1 className="max-w-2xl text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-[2.75rem]">
        {title}
      </h1>
      <p className="max-w-xl text-base text-pretty text-ink-muted">{children}</p>
      {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
      {!noSearch && (
        <SearchBar label={searchLabel} placeholder={searchPlaceholder} resultsId={resultsId} />
      )}
      <p className="text-xs text-ink-muted">
        Last updated: <time dateTime={updatedAt}>{formatUpdated(updatedAt)}</time> (Sudbury time)
        {isSample && " · Includes sample listings (marked Sample)"}
      </p>
    </section>
  );
}

/** Shared page width and spacing. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[88rem] flex-col gap-10 pt-8 sm:gap-12 sm:pt-12">
      {children}
    </div>
  );
}
