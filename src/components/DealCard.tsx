"use client";

import type { MouseEvent } from "react";
import type { Deal } from "@shared/deal";
import { DealBadges, DealPrice, DealThumbnail, DiscountBadge } from "@/components/DealParts";
import { Avatar } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { daysBetween, endsLabel } from "@/lib/format";
import { openDeal } from "@/lib/url-state";

/** Link that opens this deal's detail popup (the ?deal= param), keeping current filters. */
function dealHref(search: string, id: string) {
  const params = new URLSearchParams(search);
  params.set("deal", id);
  return `?${params.toString()}`;
}

type DealCardProps = { deal: Deal; today: string; search: string };

/** One deal. The whole card is clickable (via the title link stretched over it). */
export function DealCard({ deal, today, search }: DealCardProps) {
  const ends = deal.endDate ? endsLabel(deal.endDate, today) : null;
  const endsSoon = deal.endDate ? daysBetween(today, deal.endDate) <= 1 : false;

  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let Ctrl/Cmd/middle-click open a new tab as usual.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openDeal(deal.id);
  };

  return (
    <GlassCard
      as="article"
      interactive
      className="relative flex h-full flex-col gap-4 p-4 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:p-5"
    >
      <div className="flex items-center gap-3">
        <Avatar name={deal.store} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{deal.store}</p>
          {deal.brand && <p className="truncate text-xs text-ink-muted">{deal.brand}</p>}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <h3 className="line-clamp-3 flex-1 text-[0.9375rem] leading-snug font-medium">
          <a
            href={dealHref(search, deal.id)}
            onClick={open}
            className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
          >
            {deal.title}
          </a>
        </h3>
        {deal.imageUrl && <DealThumbnail src={deal.imageUrl} />}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <DealPrice deal={deal} />
          <DiscountBadge deal={deal} className="ml-auto" />
        </div>
        <DealBadges deal={deal} />
        {ends && (
          <p className={cn("text-xs", endsSoon ? "text-accent-text" : "text-ink-muted")}>{ends}</p>
        )}
      </div>
    </GlassCard>
  );
}

/** Placeholder card shown while the full deal list is still loading. */
export function DealCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-56 flex-col gap-4 rounded-3xl glass p-5">
      <div className="flex items-center gap-3">
        <span className="size-10 rounded-full bg-neutral-soft" />
        <span className="h-3 w-24 rounded-full bg-neutral-soft" />
      </div>
      <span className="h-3 w-4/5 rounded-full bg-neutral-soft" />
      <span className="h-3 w-3/5 rounded-full bg-neutral-soft" />
      <span className="mt-auto h-6 w-20 rounded-full bg-neutral-soft" />
    </div>
  );
}
