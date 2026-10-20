"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Deal } from "@shared/deal";
import { categoryLabel, type LocationId } from "@shared/taxonomy";
import {
  DealBadges,
  DealPrice,
  DealThumbnail,
  DealTitleText,
  DiscountBadge,
  UnitPrice,
} from "@/components/DealParts";
import { ArrowUpRightIcon, CloseIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { daysBetween, endsLabel, formatDay, formatPrice, torontoDate } from "@/lib/format";
import { closeDeal, dealIdFrom, forgetOpenedDeal, useSearchString } from "@/lib/url-state";

const WHERE: Record<LocationId, string> = {
  sudbury: "In Greater Sudbury",
  ontario: "Across Ontario",
  "ships-to-ontario": "Online, ships to Ontario",
};

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function DealDetails({ deal, today }: { deal: Deal; today: string }) {
  const ended = Boolean(deal.endDate && deal.endDate < today);
  const hasPrice = deal.salePrice !== undefined || deal.discountPercent !== undefined;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 id="deal-title" className="text-2xl leading-tight font-semibold tracking-tight">
            <DealTitleText title={deal.title} />
          </h2>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <DealPrice deal={deal} size="lg" />
              <DiscountBadge deal={deal} />
            </div>
            <UnitPrice deal={deal} className="text-sm" />
          </div>
        </div>
        {deal.imageUrl && <DealThumbnail src={deal.imageUrl} size={112} />}
      </div>

      <DealBadges deal={deal} />

      {deal.sample && (
        <p className="rounded-2xl border border-line p-4 text-sm text-pretty text-ink-muted">
          <strong className="font-semibold text-ink">Sample listing.</strong> It shows how product
          prices will look on Discount Koi. It isn&apos;t a real price, so check the store&apos;s
          flyer.
        </p>
      )}

      {deal.description && (
        <p className="text-base text-pretty text-ink-muted">{deal.description}</p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl bg-neutral-soft p-4">
        <Detail label="Category">{categoryLabel(deal.category)}</Detail>
        <Detail label="Where">{WHERE[deal.location]}</Detail>
        {deal.startDate && <Detail label="Starts">{formatDay(deal.startDate)}</Detail>}
        <Detail label="Expires">
          {deal.endDate ? (
            <>
              {formatDay(deal.endDate)}
              {/* "Ends in 4 days" adds something; "Ends Nov. 30, 2026" would just repeat the date. */}
              {daysBetween(today, deal.endDate) <= 30 && (
                <span
                  className={cn("block font-normal", ended ? "text-accent-text" : "text-ink-muted")}
                >
                  {endsLabel(deal.endDate, today)}
                </span>
              )}
            </>
          ) : deal.ongoing ? (
            "Ongoing program"
          ) : (
            "No end date listed"
          )}
        </Detail>
        <Detail label="Listed">{formatDay(torontoDate(new Date(deal.scrapedAt)))}</Detail>
        {deal.previousPrice !== undefined && (
          <Detail label="Last time at this store">
            {formatPrice(deal.previousPrice, deal.currency)}
          </Detail>
        )}
      </dl>

      <div className="flex flex-col gap-3">
        <ButtonLink
          href={deal.url}
          external
          sponsored={deal.affiliate}
          size="lg"
          className="w-full sm:w-auto sm:self-start"
        >
          {/* Priced deals get "Get this deal"; flyers, events, programs and picks say where they go. */}
          {hasPrice && (deal.affiliate || !deal.productName)
            ? "Get this deal"
            : `Open on ${hostOf(deal.url)}`}
          <ArrowUpRightIcon className="size-4" />
        </ButtonLink>
        <p className="text-xs text-pretty text-ink-muted">
          Opens {hostOf(deal.url)} in a new tab. Details come from public sources and can change, so
          please confirm them on the original site.
          {deal.affiliate && (
            <span className="mt-1 block">
              Affiliate link: Discount Koi may earn a small commission if you buy through it, at no
              extra cost to you.
            </span>
          )}
          {deal.attribution && <span className="mt-1 block">Source: {deal.attribution}</span>}
        </p>
      </div>
    </div>
  );
}

type DealModalProps = {
  /** Full list once loaded (null while loading). */
  allDeals: Deal[] | null;
  /** Deals baked into the page, used until the full list arrives. */
  initialDeals: Deal[];
  failed: boolean;
  today: string;
};

/**
 * Deal detail popup, driven by ?deal=<id> in the URL so a deal can be shared as a link.
 * Built on the native <dialog>: focus stays inside, Escape closes it, and focus goes back
 * to the card afterwards.
 */
export function DealModal({ allDeals, initialDeals, failed, today }: DealModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dealId = dealIdFrom(useSearchString());
  const deal = dealId ? ((allDeals ?? initialDeals).find((d) => d.id === dealId) ?? null) : null;
  const status = !dealId ? "closed" : deal ? "found" : allDeals || failed ? "missing" : "loading";

  // Keep the dialog's open state in sync with the URL.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dealId && !dialog.open) {
      dialog.showModal();
      // Focus the popup itself rather than the close button, so no focus ring appears
      // until the visitor presses Tab. Screen readers still announce the deal title.
      dialog.focus();
    }
    if (!dealId) {
      if (dialog.open) dialog.close();
      forgetOpenedDeal();
    }
  }, [dealId]);

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-labelledby={status === "found" ? "deal-title" : "deal-status"}
      // Escape (or any other native close) while the URL still says open: update the URL.
      onClose={() => dealIdFrom(window.location.search) && closeDeal()}
      // A click on the dimmed backdrop lands on the <dialog> itself.
      onClick={(e) => e.target === e.currentTarget && closeDeal()}
      className="m-auto max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-[min(36rem,calc(100%-2rem))] max-w-none animate-fade-in overflow-y-auto overscroll-contain rounded-3xl glass-strong p-0 text-ink frost backdrop:animate-fade-in backdrop:bg-[var(--scrim)] focus-visible:outline-none"
    >
      {dealId && (
        <div className="flex flex-col gap-6 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            {deal && <Avatar name={deal.store} />}
            <div className="min-w-0 flex-1">
              {deal && (
                <>
                  <p className="truncate text-sm font-medium">{deal.store}</p>
                  {deal.brand && <p className="truncate text-xs text-ink-muted">{deal.brand}</p>}
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={closeDeal}
              className={buttonClasses({ variant: "ghost", size: "icon", className: "-mr-2" })}
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          {status === "found" && deal && <DealDetails deal={deal} today={today} />}

          {status === "loading" && (
            <div aria-hidden="true" className="flex flex-col gap-4">
              <span id="deal-status" className="sr-only">
                Loading deal
              </span>
              <span className="h-6 w-4/5 rounded-full bg-neutral-soft" />
              <span className="h-9 w-32 rounded-full bg-neutral-soft" />
              <span className="h-24 rounded-2xl bg-neutral-soft" />
            </div>
          )}

          {status === "missing" && (
            <div className="flex flex-col items-start gap-3 pb-2">
              <h2 id="deal-status" className="text-xl font-semibold">
                This deal isn&apos;t available anymore
              </h2>
              <p className="text-sm text-ink-muted">
                It may have ended or been removed by the store. There are plenty of others though.
              </p>
              <Button variant="secondary" onClick={closeDeal}>
                Browse deals
              </Button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
