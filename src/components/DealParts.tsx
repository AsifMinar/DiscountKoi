"use client";

import Image from "next/image";
import { useState } from "react";
import type { Deal } from "@shared/deal";
import { DEAL_TYPES, locationBadge } from "@shared/taxonomy";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { isFree } from "@/lib/filters";
import { formatPrice } from "@/lib/format";

/* Small pieces shared by the deal card and the deal detail popup. */

/** Sale price (or "Free" / "30% off") with the original price crossed out. */
export function DealPrice({ deal, size = "md" }: { deal: Deal; size?: "md" | "lg" }) {
  const free = isFree(deal);
  const main = free
    ? "Free"
    : deal.salePrice !== undefined
      ? formatPrice(deal.salePrice)
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
          size === "lg" ? "text-4xl" : "text-2xl",
          free && "text-accent-text",
        )}
      >
        {main}
      </span>
      {showWas && (
        <s className={cn("text-ink-muted", size === "lg" ? "text-base" : "text-sm")}>
          <span className="sr-only">was </span>
          {formatPrice(deal.originalPrice!)}
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

/** Location badge first, then one badge per deal type. */
export function DealBadges({ deal }: { deal: Deal }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={LOCATION_TONE[deal.location]}>{locationBadge(deal.location)}</Badge>
      {DEAL_TYPES.filter((t) => deal.dealType.includes(t.id)).map((t) => (
        <Badge key={t.id} tone={t.id === "free" ? "accent" : "neutral"}>
          {t.badge}
        </Badge>
      ))}
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
