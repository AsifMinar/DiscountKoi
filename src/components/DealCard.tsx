"use client";

import { memo } from "react";
import type { Deal } from "@shared/deal";
import {
  DealPrice,
  DealTile,
  DealTitleText,
  DiscountBadge,
  StatusTag,
  whereLabel,
} from "@/components/DealParts";
import { SaveButton } from "@/components/SaveButtons";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { isFree } from "@/lib/filters";
import { daysBetween, endsLabel } from "@/lib/format";
import { dealHref, onDealClick } from "@/lib/url-state";

type DealCardProps = { deal: Deal; today: string; search: string };

/**
 * One deal as a compact card: a small picture with the store, title and where beside it,
 * then the price and save button underneath. The whole card is clickable (via the title
 * link stretched over it).
 */
export const DealCard = memo(function DealCard({ deal, today, search }: DealCardProps) {
  // Ongoing programs say so in the popup; on the card it would only repeat on every one.
  // "Ends today" is already next to the store name.
  const ends = deal.endDate && deal.endDate !== today ? endsLabel(deal.endDate, today) : null;
  const endsSoon = deal.endDate ? daysBetween(today, deal.endDate) <= 1 : false;
  const where = whereLabel(deal);
  const priced = isFree(deal) || deal.salePrice !== undefined || deal.discountPercent !== undefined;
  const student = deal.dealType.includes("student");

  return (
    <GlassCard
      as="article"
      interactive
      className="relative flex h-full flex-col gap-3 p-3.5 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:p-4"
    >
      <div className="flex gap-3.5">
        <DealTile deal={deal} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-xs font-medium text-ink-muted">{deal.store}</p>
            <StatusTag deal={deal} today={today} />
          </div>
          <h3 className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug font-medium text-pretty">
            <a
              href={dealHref(search, deal.id)}
              onClick={onDealClick(deal.id)}
              className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
            >
              <DealTitleText title={deal.title} />
            </a>
          </h3>
          {where && <p className="mt-0.5 text-xs text-ink-muted">{where}</p>}
        </div>
      </div>

      {/* Price and save button run the full width of the card, under the picture. */}
      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          {priced && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <DealPrice deal={deal} />
              <DiscountBadge deal={deal} />
            </div>
          )}
          {(student || ends) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {student && <Badge>Student</Badge>}
              {ends && (
                <p className={cn("text-xs", endsSoon ? "text-accent-text" : "text-ink-muted")}>
                  {ends}
                </p>
              )}
            </div>
          )}
        </div>
        {/* Above the card's stretched link, so it can be tapped on its own. */}
        <SaveButton
          dealId={deal.id}
          title={deal.title}
          className="relative z-10 -mr-1 -mb-1 shrink-0"
        />
      </div>
    </GlassCard>
  );
}, sameCard);

/**
 * A card only redraws when its deal, the date or the URL changes. The full deal list
 * arrives as new objects for the same deals, so comparing ids saves redrawing every card.
 */
function sameCard(a: DealCardProps, b: DealCardProps) {
  return a.deal.id === b.deal.id && a.today === b.today && a.search === b.search;
}

/** Off-screen cards are only laid out when scrolled near (with a size guess until then). */
export const LAZY_CARD = "[contain-intrinsic-size:auto_9rem] [content-visibility:auto]";

// Narrower grid next to the filter sidebar on big screens.
export const GRID = "grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3";
export const WIDE_GRID =
  "grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

/** Deal cards in a responsive grid. */
export function DealGrid({
  deals,
  today,
  search,
  grid = WIDE_GRID,
}: {
  deals: Deal[];
  today: string;
  search: string;
  grid?: string;
}) {
  return (
    <ul role="list" className={grid}>
      {deals.map((deal) => (
        <li key={deal.id} className={LAZY_CARD}>
          <DealCard deal={deal} today={today} search={search} />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder card shown while the full deal list is still loading. */
export function DealCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-36 gap-3.5 rounded-3xl glass p-3.5 sm:p-4">
      <span className="size-14 shrink-0 rounded-2xl bg-neutral-soft sm:size-16" />
      <div className="flex flex-1 flex-col gap-3 pt-1">
        <span className="h-3 w-24 rounded-full bg-neutral-soft" />
        <span className="h-3 w-4/5 rounded-full bg-neutral-soft" />
        <span className="mt-auto h-6 w-20 rounded-full bg-neutral-soft" />
      </div>
    </div>
  );
}
