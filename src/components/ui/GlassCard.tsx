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
        interactive && "hud relative transition-colors duration-150 ease-out hover:border-ink/25",
        className,
      )}
      {...props}
    />
  );
}
