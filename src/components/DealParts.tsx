"use client";

import Image from "next/image";
import { useState } from "react";
import type { Deal } from "@shared/deal";
import { DEAL_TYPES, locationBadge } from "@shared/taxonomy";
import { CategoryIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { isFree, isNewToday } from "@/lib/filters";
import { categoryTint } from "@/lib/tints";
import { formatPrice } from "@/lib/format";

/* Small pieces shared by the deal card and the deal detail popup. */

/**
 * Deal title, keeping a trailing "· Oct 15–21" together on one line so dates never
 * split as "Oct 15–" / "21".
 */
export function DealTitleText({ title }: { title: string }) {
  const at = title.lastIndexOf(" · ");
  // Only short endings (dates like "Oct 29 – Nov 4") are kept together; long ones may wrap.
  if (at === -1 || title.length - at - 3 > 16) return title;
  return (
    <>
      {title.slice(0, at)}
      {" · "}
      <span className="whitespace-nowrap">{title.slice(at + 3)}</span>
    </>
  );
}

/** Sale price (or "Free" / "30% off") with the original price crossed out. */
export function DealPrice({ deal, size = "md" }: { deal: Deal; size?: "md" | "lg" }) {
  const free = isFree(deal);
  const main = free
    ? "Free"
    : deal.salePrice !== undefined
      ? formatPrice(deal.salePrice, deal.currency)
      : deal.discountPercent
        ? `${deal.discountPercent}% off`
        : null;
  if (!main) return null;

  const showWas = deal.originalPrice !== undefined && deal.originalPrice > (deal.salePrice ?? 0);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={cn(
          "font-semibold tracking-tight",
          size === "lg" ? "text-4xl" : "text-xl",
          free && "text-accent-text",
        )}
      >
        {main}
      </span>
      {showWas && (
        <s className={cn("text-ink-muted", size === "lg" ? "text-base" : "text-sm")}>
          <span className="sr-only">was </span>
          {formatPrice(deal.originalPrice!, deal.currency)}
        </s>
      )}
    </p>
  );
}

/**
 * "−36%" pill. Hidden for free deals, where "Free" already says it, and when the price
 * itself reads "36% off".
 */
export function DiscountBadge({ deal, className }: { deal: Deal; className?: string }) {
  if (!deal.discountPercent || isFree(deal) || deal.salePrice === undefined) return null;
  return (
    <Badge tone="accent" className={className}>
      <span aria-hidden="true">−{deal.discountPercent}%</span>
      <span className="sr-only">{deal.discountPercent}% off</span>
    </Badge>
  );
}

const LOCATION_TONE = {
  sudbury: "teal",
  ontario: "neutral",
  "ships-to-ontario": "outline",
} as const;

/**
 * Location badge first, then one badge per deal type.
 * No "Free" badge when the price already reads "Free".
 */
export function DealBadges({ deal }: { deal: Deal }) {
  const free = isFree(deal);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={LOCATION_TONE[deal.location]}>{locationBadge(deal.location)}</Badge>
      {DEAL_TYPES.filter((t) => deal.dealType.includes(t.id) && !(free && t.id === "free")).map(
        (t) => (
          <Badge key={t.id} tone={t.id === "free" ? "accent" : "neutral"}>
            {t.badge}
          </Badge>
        ),
      )}
    </div>
  );
}

/** Product thumbnail, hotlinked from the store. Quietly disappears if it fails to load. */
export function DealThumbnail({ src, size = 64 }: { src: string; size?: 64 | 112 }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        // Product photos (white background) are shown whole, never cropped.
        "shrink-0 rounded-2xl bg-white object-contain p-1",
        size === 64 ? "size-16" : "size-28",
      )}
    />
  );
}

const CHANNEL_TEXT = { "in-store": "In store", online: "Online" } as const;

/** "In store · Sudbury", "Online · Ships to ON", "In store & online · Ontario". */
export function whereLabel(deal: Deal): string {
  const channels = (["in-store", "online"] as const).filter((t) => deal.dealType.includes(t));
  const how =
    channels.length === 2 ? "In store & online" : channels.length ? CHANNEL_TEXT[channels[0]] : "";
  return [how, locationBadge(deal.location)].filter(Boolean).join(" · ");
}

/**
 * The small square on the left of a card: the deal's photo when there is one, otherwise
 * its category's icon on the category colour.
 */
export function DealTile({ deal }: { deal: Deal }) {
  const [failed, setFailed] = useState(false);
  const photo = deal.imageUrl && !failed ? deal.imageUrl : null;
  return (
    <div
      className={cn(
        "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:size-16",
        photo ? "bg-white" : categoryTint(deal.category),
      )}
    >
      {photo ? (
        <Image
          src={photo}
          alt=""
          width={64}
          height={64}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain p-1.5"
        />
      ) : (
        <CategoryIcon category={deal.category} className="size-7 opacity-90" />
      )}
    </div>
  );
}

/** "New" (first seen today) or "Ends today", shown next to the store name on a card. */
export function StatusTag({ deal, today }: { deal: Deal; today: string }) {
  const status = deal.endDate === today ? "Ends today" : isNewToday(deal, today) ? "New" : null;
  if (!status) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-1 text-[0.6875rem] leading-none font-semibold",
        status === "New" ? "bg-ink text-page" : "bg-accent-soft text-accent-text",
      )}
    >
      {status}
    </span>
  );
}
