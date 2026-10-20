import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type GlassCardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "section" | "aside" | "li";
  /** Adds the gentle hover lift for clickable cards. */
  interactive?: boolean;
  /** Blur what's behind the card. Off by default to keep phones smooth. */
  frosted?: boolean;
};

/** The base frosted-glass surface used by cards, panels and modals. */
export function GlassCard({
  as: Tag = "div",
  interactive = false,
  frosted = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <Tag
      className={cn(
        "rounded-3xl glass",
        frosted && "frost",
        interactive &&
          "transition-[translate,box-shadow] duration-200 ease-out hover:shadow-[var(--glass-shadow-hover)] motion-safe:hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}
