import type { ReactNode } from "react";

/** Section title with a live result count, and room for a control (e.g. sort) on the right. */
export function SectionHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-aurora" />
          {title}
        </h2>
        {count && (
          <p aria-live="polite" className="mt-0.5 pl-3.5 text-sm text-ink-muted">
            {count}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
