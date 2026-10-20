"use client";

import type { Deal } from "@shared/deal";
import { unitPriceIn, type ProductGroup } from "@shared/products";
import { soldByUnit, unitLabel } from "@shared/units";
import { ProductBadges } from "@/components/DealParts";
import { Avatar } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { isFree } from "@/lib/filters";
import { weekLabel } from "@shared/dates";
import { endsLabel, formatDay, formatPrice, formatUnitPrice } from "@/lib/format";
import { dealHref, onDealClick } from "@/lib/url-state";

/** "$3.99/lb", "$5.49" or "Free". */
function priceText(deal: Deal): string | null {
  if (isFree(deal)) return "Free";
  if (deal.salePrice === undefined) return null;
  const per = soldByUnit(deal) && deal.unit ? unitLabel(deal.unit) : "";
  return `${formatPrice(deal.salePrice, deal.currency)}${per}`;
}

/** The unit price in the group's unit when possible, so every row is comparable. */
function unitText(deal: Deal, groupUnit: ProductGroup["unit"]): string | null {
  const converted = unitPriceIn(deal, groupUnit);
  if (converted !== undefined && groupUnit) {
    // Weighed items already read "$3.99/lb"; repeat it only when converted to another unit.
    if (soldByUnit(deal) && deal.unit === groupUnit) return null;
    return formatUnitPrice(converted, groupUnit, deal.currency);
  }
  if (deal.unit && deal.unitPrice !== undefined && !soldByUnit(deal)) {
    return formatUnitPrice(deal.unitPrice, deal.unit, deal.currency);
  }
  return null;
}

/** "Ends in 3 days" for running deals; the dates ("Oct 22–28") for ones that haven't started. */
function whenText(deal: Deal, today: string): string | null {
  if (deal.startDate && deal.startDate > today) {
    return deal.endDate
      ? weekLabel(deal.startDate, deal.endDate)
      : `From ${formatDay(deal.startDate)}`;
  }
  return deal.endDate ? endsLabel(deal.endDate, today) : null;
}

type ProductGroupCardProps = { group: ProductGroup; today: string; search: string };

/** One product, every store's price side by side, cheapest first. Each row opens the popup. */
export function ProductGroupCard({ group, today, search }: ProductGroupCardProps) {
  const compared = group.deals.length > 1;
  return (
    <GlassCard as="article" className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <header className="px-2 pt-1">
        <h3 className="text-base leading-snug font-semibold text-pretty">{group.name}</h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          {group.stores === 1 ? "1 store" : `${group.stores} stores`}
          {compared && " · cheapest first"}
        </p>
      </header>

      <ol className="flex flex-col gap-1">
        {group.deals.map((deal, i) => {
          const price = priceText(deal);
          const unit = unitText(deal, group.unit);
          const details = [deal.size, whenText(deal, today)].filter(Boolean).join(" · ");
          return (
            <li key={deal.id}>
              <a
                href={dealHref(search, deal.id)}
                onClick={onDealClick(deal.id)}
                className={cn(
                  "flex min-h-14 items-start gap-3 rounded-2xl p-2 transition-colors duration-150 ease-out hover:bg-neutral-soft",
                  compared && i === 0 && "bg-neutral-soft",
                )}
              >
                <Avatar name={deal.store} className="mt-0.5" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-sm font-medium">{deal.store}</p>
                  {details && <p className="text-xs text-ink-muted">{details}</p>}
                  <div className="flex flex-wrap gap-1.5 empty:hidden">
                    <ProductBadges deal={deal} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                  {price && (
                    <p className="text-base font-semibold tracking-tight tabular-nums">{price}</p>
                  )}
                  {unit && <p className="text-xs text-ink-muted tabular-nums">{unit}</p>}
                  {deal.originalPrice !== undefined &&
                    deal.salePrice !== undefined &&
                    deal.originalPrice > deal.salePrice && (
                      <s className="text-xs text-ink-muted tabular-nums">
                        <span className="sr-only">was </span>
                        {formatPrice(deal.originalPrice, deal.currency)}
                      </s>
                    )}
                </div>
              </a>
            </li>
          );
        })}
      </ol>
    </GlassCard>
  );
}
