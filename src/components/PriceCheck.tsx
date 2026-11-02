"use client";

import { useEffect, useState } from "react";
import type { Deal } from "@shared/deal";
import {
  ontarioPriceFor,
  pastValues,
  priceVerdict,
  vsOntario,
  type PriceInfo,
  type Verdict,
} from "@shared/price-info";
import { productKey } from "@shared/products";
import { perBase } from "@shared/units";
import { torontoDate } from "@shared/dates";
import { cn } from "@/lib/cn";
import { formatDay, formatPrice, formatUnitPrice } from "@/lib/format";

const INFO_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/price-info.json`;

// One download per page load, shared by every popup.
let request: Promise<PriceInfo> | null = null;
function loadPriceInfo() {
  request ??= fetch(INFO_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`price-info.json responded ${res.status}`);
      return res.json() as Promise<PriceInfo>;
    })
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}

const TONES: Record<Verdict["tone"], string> = {
  great: "bg-tint-green text-tint-green-text",
  good: "bg-teal-soft text-teal-text",
  neutral: "bg-neutral-soft text-ink",
  high: "bg-accent-soft text-accent-text",
};

const monthFormat = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthLabel = (period: string) => monthFormat.format(new Date(`${period}-01T00:00:00Z`));

/**
 * "Is this a good price?" for a product listing: a verdict from past prices (or the
 * Ontario average), the Ontario average itself, and this store's recent prices.
 */
export function PriceCheck({ deal }: { deal: Deal }) {
  const [info, setInfo] = useState<PriceInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadPriceInfo().then(
      (data) => active && setInfo(data),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, []);

  if (!deal.productName || deal.sample) return null;
  if (failed) return null;
  if (!info) {
    return <div aria-hidden="true" className="h-24 rounded-2xl bg-neutral-soft" />;
  }

  const date = deal.startDate ?? torontoDate(new Date(deal.scrapedAt));
  const current =
    deal.unit && deal.unitPrice !== undefined ? perBase(deal.unit, deal.unitPrice).value : null;
  const ontario = ontarioPriceFor(deal, info.ontario);
  const gap = ontario ? vsOntario(deal, ontario) : undefined;
  const verdict =
    current === null ? undefined : priceVerdict(current, pastValues(deal, info.history, date), gap);

  const key = productKey(deal.productName);
  const store = productKey(deal.store);
  const atThisStore = info.history
    .filter((h) => productKey(h.product) === key && productKey(h.store) === store && h.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (!verdict && !ontario && !atThisStore.length) {
    return (
      <p className="rounded-2xl border border-line p-4 text-sm text-pretty text-ink-muted">
        <strong className="font-semibold text-ink">Price check:</strong> not enough price history
        yet. It builds up week by week.
      </p>
    );
  }

  return (
    <section
      aria-label="Price check"
      className="flex flex-col gap-3 rounded-2xl border border-line p-4"
    >
      {verdict && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-sm leading-none font-semibold",
              TONES[verdict.tone],
            )}
          >
            {verdict.label}
          </span>
          <span className="text-sm text-ink-muted">{verdict.reason}</span>
        </div>
      )}

      {ontario && (
        <p className="text-sm text-pretty">
          <span className="text-ink-muted">Ontario average ({monthLabel(ontario.period)}): </span>
          <span className="font-medium">
            {ontario.name}, {formatPrice(ontario.price)}
          </span>{" "}
          {/* "per kilogram" items already are a unit price. */}
          {Math.abs(ontario.unitPrice - ontario.price) >= 0.005 && (
            <span className="text-ink-muted">
              ({formatUnitPrice(ontario.unitPrice, ontario.unit)})
            </span>
          )}
          {/* The verdict already says how far from the average it is. */}
          {!verdict && gap !== undefined && Math.abs(gap) >= 0.01 && (
            <span className="block text-ink-muted">
              This price is {Math.round(Math.abs(gap) * 100)}% {gap < 0 ? "below" : "above"} it.
            </span>
          )}
        </p>
      )}

      {atThisStore.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Earlier at {deal.store}
          </p>
          <table className="w-full text-sm">
            <caption className="sr-only">Earlier prices at {deal.store}</caption>
            <tbody>
              {atThisStore.map((h) => (
                <tr key={h.date} className="border-t border-line first:border-t-0">
                  <th scope="row" className="py-1.5 text-left font-normal text-ink-muted">
                    {formatDay(h.date)}
                  </th>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatPrice(h.price)}
                    {h.size && <span className="text-ink-muted"> · {h.size}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ontario && (
        <p className="text-xs text-pretty text-ink-muted">
          Ontario averages: Statistics Canada, Table 18-10-0245-01 (Statistics Canada Open Licence).
        </p>
      )}
    </section>
  );
}
