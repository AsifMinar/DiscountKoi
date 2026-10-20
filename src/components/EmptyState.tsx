import type { ReactNode } from "react";
import { KoiMark } from "@/components/Logo";
import { GlassCard } from "@/components/ui/GlassCard";

/** Friendly "nothing here" panel with an optional action. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <GlassCard className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <KoiMark className="size-10 opacity-80" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-sm text-sm text-pretty text-ink-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </GlassCard>
  );
}
