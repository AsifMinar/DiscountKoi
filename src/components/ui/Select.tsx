import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  /** Read by screen readers; not shown. */
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
};

/**
 * Pill-shaped dropdown built on the native <select>, so keyboard, screen readers
 * and phone pickers all work for free. In browsers that support customizable
 * selects, the open list is styled as a rounded glass panel too (see globals.css).
 */
export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <label className={cn("relative inline-flex min-w-0 shrink-0", className)}>
      <span className="sr-only">{label}</span>
      <select
        className="ui-select h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-full glass pr-10 pl-4 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-glass-strong"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted" />
    </label>
  );
}
