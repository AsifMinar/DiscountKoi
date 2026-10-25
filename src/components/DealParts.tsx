"use client";

import Image from "next/image";
import { useState } from "react";
import type { Deal } from "@shared/deal";
import { isPriceDrop } from "@shared/products";
import { DEAL_TYPES, locationBadge } from "@shared/taxonomy";
import { soldByUnit, unitLabel } from "@shared/units";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { isFree } from "@/lib/filters";
import { formatPrice, formatUnitPrice } from "@/lib/format";

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

/** Sale price (or "Free" / "30% off") with the original price crossed out; "$3.99/lb" for weighed items. */
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
  const per = !free && soldByUnit(deal) && deal.unit ? unitLabel(deal.unit) : null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={cn(
          "font-semibold tracking-tight",
          size === "lg" ? "text-4xl" : "text-2xl",
          free && "text-accent-text",
        )}
      >
        {main}
        {per && (
          <span className={cn("font-medium text-ink-muted", size === "lg" ? "text-lg" : "text-sm")}>
            {per}
          </span>
        )}
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

/** "−36%" pill. Hidden for free deals, where "Free" already says it. */
export function DiscountBadge({ deal, className }: { deal: Deal; className?: string }) {
  if (!deal.discountPercent || isFree(deal)) return null;
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
 * "4 L · $1.37/L": package size and unit price, so different sizes compare fairly.
 * Nothing for weighed items, whose price already reads "$3.99/lb".
 */
export function UnitPrice({ deal, className }: { deal: Deal; className?: string }) {
  const unitPrice =
    deal.unit && deal.unitPrice !== undefined && !soldByUnit(deal)
      ? formatUnitPrice(deal.unitPrice, deal.unit, deal.currency)
      : null;
  if (!deal.size && !unitPrice) return null;
  return (
    <p className={cn("text-xs text-ink-muted", className)}>
      {[deal.size, unitPrice].filter(Boolean).join(" · ")}
    </p>
  );
}

/** Badges that only product listings get. */
export function ProductBadges({ deal }: { deal: Deal }) {
  return (
    <>
      {deal.lowestInSudbury && <Badge tone="teal">Lowest price in Sudbury this week</Badge>}
      {isPriceDrop(deal) && <Badge tone="accent">Price drop</Badge>}
      {deal.sample && <Badge tone="outline">Sample</Badge>}
      {deal.affiliate && <Badge tone="outline">Affiliate link</Badge>}
    </>
  );
}

/**
 * Location badge first, then one badge per deal type, then any product badges.
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
      <ProductBadges deal={deal} />
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
        "shrink-0 rounded-2xl bg-neutral-soft object-cover",
        size === 64 ? "size-16" : "size-28",
      )}
    />
  );
}
