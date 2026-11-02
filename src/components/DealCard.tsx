"use client";

import type { Deal } from "@shared/deal";
import {
  CardBadges,
  DealPicture,
  DealPrice,
  DealTitleText,
  UnitPrice,
  whereLabel,
} from "@/components/DealParts";
import { Avatar } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { daysBetween, endsLabel } from "@/lib/format";
import { dealHref, onDealClick } from "@/lib/url-state";

type DealCardProps = { deal: Deal; today: string; search: string };

/**
 * One deal, shop style: picture on top, then store, title, price and badges.
 * The whole card is clickable (via the title link stretched over it).
 */
export function DealCard({ deal, today, search }: DealCardProps) {
  // Ongoing programs say so in the popup; on the card it would only repeat on every one.
  // "Ends today" is already on the picture.
  const ends = deal.endDate && deal.endDate !== today ? endsLabel(deal.endDate, today) : null;
  const endsSoon = deal.endDate ? daysBetween(today, deal.endDate) <= 1 : false;
  const where = whereLabel(deal);

  return (
    <GlassCard
      as="article"
      interactive
      className="relative flex h-full flex-col overflow-hidden has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
    >
      <DealPicture deal={deal} today={today} />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={deal.store} className="size-6 text-[0.625rem]" />
          <p className="truncate text-xs font-medium text-ink-muted">{deal.store}</p>
        </div>

        <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-medium text-pretty">
          <a
            href={dealHref(search, deal.id)}
            onClick={onDealClick(deal.id)}
            className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
          >
            <DealTitleText title={deal.title} />
          </a>
        </h3>
        {where && <p className="text-xs text-ink-muted">{where}</p>}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <div className="flex flex-col gap-0.5">
            <DealPrice deal={deal} />
            <UnitPrice deal={deal} />
          </div>
          <CardBadges deal={deal} />
          {ends && (
            <p className={cn("text-xs", endsSoon ? "text-accent-text" : "text-ink-muted")}>
              {ends}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

/** Placeholder card shown while the full deal list is still loading. */
export function DealCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-72 flex-col overflow-hidden rounded-3xl glass">
      <span className="h-28 bg-neutral-soft sm:h-32" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="h-3 w-24 rounded-full bg-neutral-soft" />
        <span className="h-3 w-4/5 rounded-full bg-neutral-soft" />
        <span className="mt-auto h-6 w-20 rounded-full bg-neutral-soft" />
      </div>
    </div>
  );
}
