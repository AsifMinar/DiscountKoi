import type { ReactNode } from "react";
import { SearchBar } from "@/components/SearchBar";
import { formatUpdated } from "@/lib/format";

/** Page heading, subtitle, search bar and the "Last updated" line (Sudbury time). */
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
}: {
  title: ReactNode;
  children: ReactNode;
  updatedAt: string;
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
      <p className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 eyebrow tracking-normal normal-case">
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inset-0 rounded-full bg-teal-text opacity-60 motion-safe:animate-ping" />
          <span className="relative size-2 rounded-full bg-teal-text" />
        </span>
        <span>
          Updated <time dateTime={updatedAt}>{formatUpdated(updatedAt)}</time>
          <span className="max-xs:hidden"> · Sudbury time</span>
        </span>
      </p>
      <h1 className="max-w-3xl text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-[3.5rem]">
        {title}
      </h1>
      <p className="max-w-xl text-base text-pretty text-ink-muted">{children}</p>
      {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
      {!noSearch && (
        <SearchBar label={searchLabel} placeholder={searchPlaceholder} resultsId={resultsId} />
      )}
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
