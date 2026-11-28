"use client";

import { memo } from "react";
import type { Deal } from "@shared/deal";
import {
  CountdownRing,
  DealPrice,
  DealTile,
  DealTitleText,
  DiscountBadge,
  SavingsMeter,
  StatusTag,
  whereLabel,
} from "@/components/DealParts";
import { SaveButton } from "@/components/SaveButtons";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { isFree } from "@/lib/filters";
import { daysBetween, endsLabel } from "@/lib/format";
import { timeLeft } from "@/lib/stats";
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
  const left = ends ? timeLeft(deal, today) : null;

  return (
    <GlassCard
      as="article"
      interactive
      className="@container relative h-full p-3.5 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:p-4"
    >
      {/* Narrow (phones, grids): a compact card. Wide (the desktop feed): one row. */}
      <div className="flex h-full flex-col gap-3 @xl:flex-row @xl:items-center @xl:gap-6">
        <div className="flex gap-3.5 @xl:min-w-0 @xl:flex-1">
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

        {/* Price and save button: under the picture on a card, at the right end of a row. */}
        <div className="mt-auto flex items-end justify-between gap-2 @xl:mt-0 @xl:w-72 @xl:shrink-0 @xl:items-center @xl:border-l @xl:border-line @xl:pl-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {priced && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <DealPrice deal={deal} />
                <DiscountBadge deal={deal} />
              </div>
            )}
            <SavingsMeter deal={deal} className="max-w-40" />
            {(student || ends) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {student && <Badge>Student</Badge>}
                {ends && (
                  <p
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs",
                      endsSoon ? "font-medium text-accent-text" : "text-ink-muted",
                    )}
                  >
                    {left !== null && <CountdownRing left={left} className="text-accent" />}
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
            className="relative z-10 -mr-1 -mb-1 shrink-0 @xl:mb-0"
          />
        </div>
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

/** The deal feed: one column, so each deal shows as a wide row once there's room. */
export const FEED = "grid grid-cols-1 gap-2.5";

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
      {deals.map((deal, i) => (
        <li
          key={deal.id}
          // The first screen of results rises in one after another; the rest just appear.
          className={cn(LAZY_CARD, i < 12 && "animate-rise")}
          style={i < 12 ? { animationDelay: `${i * 35}ms` } : undefined}
        >
          <DealCard deal={deal} today={today} search={search} />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder shown while the full deal list is still loading. Same shape as a card or row. */
export function DealCardSkeleton() {
  return (
    <div aria-hidden="true" className="@container rounded-3xl glass p-3.5 sm:p-4">
      <div className="flex h-[7.25rem] flex-col gap-3 @xl:h-16 @xl:flex-row @xl:items-center @xl:gap-6">
        <div className="flex gap-3.5 @xl:flex-1">
          <span className="size-14 shrink-0 skeleton rounded-2xl sm:size-16" />
          <div className="flex flex-1 flex-col gap-2.5 pt-1">
            <span className="h-2.5 w-20 skeleton rounded-full" />
            <span className="h-3 w-4/5 skeleton rounded-full" />
            <span className="h-2.5 w-28 skeleton rounded-full" />
          </div>
        </div>
        <div className="mt-auto flex items-end justify-between @xl:mt-0 @xl:w-72 @xl:items-center @xl:pl-5">
          <span className="h-6 w-24 skeleton rounded-full" />
          <span className="size-10 skeleton rounded-full" />
        </div>
      </div>
    </div>
  );
}
