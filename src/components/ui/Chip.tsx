import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  selected: boolean;
  children: ReactNode;
  /** Small number shown after the label, e.g. how many deals match. */
  count?: number;
};

/** A pill-shaped toggle used for filters. Screen readers hear it as a pressed/unpressed button. */
export function Chip({ selected, count, children, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap",
        "transition-colors duration-150 ease-out",
        selected
          ? "border border-transparent bg-ink text-page"
          : "glass text-ink hover:bg-glass-strong",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn("text-xs tabular-nums", selected ? "opacity-80" : "text-ink-muted")}>
          {count}
        </span>
      )}
    </button>
  );
}
