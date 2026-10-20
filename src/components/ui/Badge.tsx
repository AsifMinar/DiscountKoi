import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "teal" | "outline";

// Colour is used sparingly: accent = discounts & free, teal = Sudbury, everything else neutral.
const TONES: Record<BadgeTone, string> = {
  neutral: "bg-neutral-soft text-ink-muted",
  accent: "bg-accent-soft text-accent-text",
  teal: "bg-teal-soft text-teal-text",
  outline: "border border-line text-ink-muted",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

/** Small pill label for location, deal type and discount. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-none font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
