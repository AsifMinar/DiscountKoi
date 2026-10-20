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
}: {
  title: string;
  children: ReactNode;
  updatedAt: string;
  isSample: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  resultsId?: string;
}) {
  return (
    <section className="flex flex-col items-center gap-5 text-center">
      <h1 className="max-w-2xl text-[2.125rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      <p className="max-w-xl text-base text-pretty text-ink-muted sm:text-lg">{children}</p>
      <SearchBar label={searchLabel} placeholder={searchPlaceholder} resultsId={resultsId} />
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
    <div className="mx-auto flex max-w-[88rem] flex-col gap-10 pt-10 sm:gap-14 sm:pt-16">
      {children}
    </div>
  );
}
