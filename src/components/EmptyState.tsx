import type { ReactNode } from "react";
import { KoiMark } from "@/components/Logo";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";

/**
 * "Nothing here", "Something went wrong" and similar panels: an icon, a plain-language
 * explanation, and a clear next step (plus an optional second one).
 */
export function EmptyState({
  title,
  children,
  action,
  secondary,
  icon,
  tone = "empty",
  extra,
  headingLevel = 3,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  /** Defaults to the koi. */
  icon?: ReactNode;
  tone?: "empty" | "error" | "warning";
  /** Anything below the actions, e.g. search suggestions. */
  extra?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <GlassCard
      role={tone === "error" ? "alert" : undefined}
      className="relative flex flex-col items-center gap-3 overflow-hidden px-6 py-12 text-center"
    >
      {/* Soft glow behind the icon. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-1/2 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
          tone === "empty" ? "bg-accent-soft" : "bg-tint-gold",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative flex size-14 items-center justify-center rounded-2xl ring-1",
          tone === "empty"
            ? "bg-accent-soft text-accent-text ring-accent/25"
            : tone === "error"
              ? "bg-tint-rose text-tint-rose-text ring-tint-rose-text/20"
              : "bg-tint-gold text-tint-gold-text ring-tint-gold-text/20",
        )}
      >
        {icon ?? <KoiMark className="size-8" />}
      </span>
      <Heading className="relative text-lg font-semibold text-balance">{title}</Heading>
      {children && (
        <div className="relative max-w-md text-sm text-pretty text-ink-muted">{children}</div>
      )}
      {(action || secondary) && (
        <div className="relative mt-2 flex flex-wrap justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
      {extra && <div className="relative mt-4 w-full max-w-lg">{extra}</div>}
    </GlassCard>
  );
}
