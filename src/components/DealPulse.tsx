"use client";

import { useId } from "react";
import { LOCATIONS, type LocationId } from "@shared/taxonomy";
import { ArrowRightIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { ENDING_BUCKETS, type DealStats } from "@/lib/stats";
import { useCountUp } from "@/lib/use-count-up";

/* The home page's "Deal pulse": today's numbers at a glance, each one a shortcut. */

const SERIES: Record<LocationId, string> = {
  sudbury: "bg-series-1",
  ontario: "bg-series-2",
  "ships-to-ontario": "bg-series-3",
};
const locationLabel = (id: LocationId) => LOCATIONS.find((l) => l.id === id)!.label;

const TILE = "flex flex-col gap-3 rounded-3xl glass p-4 sm:p-5";
const TILE_BUTTON = cn(
  TILE,
  "hud relative group text-left transition-colors duration-150 ease-out hover:border-ink/25",
);

/**
 * A big live number in the dot-matrix font. It counts up when it first appears; screen
 * readers get the final value only.
 */
function Figure({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const { ref, value: shown } = useCountUp<HTMLSpanElement>(value);
  return (
    <span ref={ref} className={cn("block font-pixel leading-none tabular-nums", className)}>
      <span aria-hidden="true">
        {shown.toLocaleString("en-CA")}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toLocaleString("en-CA")}
        {suffix}
      </span>
    </span>
  );
}

function TileFoot({ children }: { children: string }) {
  return (
    <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-accent-text">
      {children}
      <ArrowRightIcon
        aria-hidden="true"
        className="size-3.5 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
      />
    </span>
  );
}

export function DealPulse({
  stats,
  onLocation,
  onSort,
  stacked = false,
}: {
  stats: DealStats;
  /** Two columns at every width (the narrow side panel). */
  stacked?: boolean;
  onLocation: (loc: LocationId) => void;
  onSort: (sort: "discount" | "ending") => void;
}) {
  const parts = stats.byLocation.filter((p) => p.count > 0);
  const maxBucket = Math.max(1, ...stats.ending.map((b) => b.count));
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="flex items-center gap-2 eyebrow">
        <span aria-hidden="true" className="h-px w-6 bg-accent" />
        Deal pulse · today
      </h2>

      <div className={cn("grid grid-cols-2 gap-3", !stacked && "sm:gap-4 lg:grid-cols-4")}>
        {/* Live deals: the one big number, and where they are. */}
        <div className={cn(TILE, "col-span-2")}>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
              <p className="eyebrow">Live deals</p>
              <Figure
                value={stats.live}
                className={cn("mt-1", stacked ? "text-5xl" : "text-[3.75rem]")}
              />
            </div>
            <p className="pb-1 text-sm text-ink-muted">
              from {plural(stats.stores, "store")}
              {stats.newToday > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-teal-text">{stats.newToday} new today</span>
                </>
              )}
            </p>
          </div>

          {parts.length > 1 && (
            <>
              <div
                role="img"
                aria-label={`Where the deals are: ${parts
                  .map((p) => `${locationLabel(p.id)} ${p.count}`)
                  .join(", ")}`}
                className="flex h-2 gap-0.5 overflow-hidden rounded-full"
              >
                {parts.map((p) => (
                  <span
                    key={p.id}
                    className={cn("h-full origin-left animate-grow-x rounded-full", SERIES[p.id])}
                    style={{ flexGrow: p.count, flexBasis: 0 }}
                  />
                ))}
              </div>
              <ul className="-mx-2 flex flex-wrap gap-x-1">
                {parts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onLocation(p.id)}
                      aria-label={`Show ${plural(p.count, "deal")} in ${locationLabel(p.id)}`}
                      className="inline-flex h-11 items-center gap-2 rounded-full px-2 text-sm text-ink-muted transition-colors hover:bg-neutral-soft hover:text-ink"
                    >
                      <span
                        aria-hidden="true"
                        className={cn("size-2.5 rounded-full", SERIES[p.id])}
                      />
                      {locationLabel(p.id)}
                      <span className="font-medium text-ink tabular-nums">{p.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Average discount, as a meter out of 100%. */}
        {stats.avgDiscount !== null ? (
          <button type="button" onClick={() => onSort("discount")} className={TILE_BUTTON}>
            <span className="eyebrow">Avg. discount</span>
            <Figure value={stats.avgDiscount} suffix="%" className="text-4xl" />
            <span
              role="img"
              aria-label={`Average ${stats.avgDiscount}% off`}
              className="block h-2 w-full overflow-hidden rounded-full bg-accent-soft"
            >
              <span
                className="block h-full origin-left animate-grow-x rounded-full bg-accent"
                style={{ width: `${stats.avgDiscount}%` }}
              />
            </span>
            <span className="text-xs text-ink-muted">
              Up to {stats.maxDiscount}% off · {plural(stats.discounted, "deal")}
            </span>
            <TileFoot>Biggest first</TileFoot>
          </button>
        ) : (
          <div className={TILE}>
            <span className="eyebrow">Free right now</span>
            <Figure value={stats.free} className="text-4xl" />
          </div>
        )}

        {/* Ending this week, as a small column chart by day. */}
        <button type="button" onClick={() => onSort("ending")} className={TILE_BUTTON}>
          <span className="eyebrow">Ending ≤ 7 days</span>
          <Figure value={stats.endingTotal} className="text-4xl" />
          <span
            role="img"
            aria-label={stats.ending
              .map((b, i) => `${ENDING_BUCKETS[i].label}: ${b.count}`)
              .join(", ")}
            className="flex flex-col gap-1"
          >
            <span className="flex h-12 items-end gap-1.5 border-b border-line">
              {stats.ending.map((b, i) => (
                <span
                  key={b.id}
                  title={`${ENDING_BUCKETS[i].label}: ${b.count}`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-0.5"
                >
                  <span className="text-[0.625rem] leading-none text-ink-muted tabular-nums">
                    {b.count || ""}
                  </span>
                  {b.count > 0 && (
                    <span
                      className={cn(
                        "w-full origin-bottom animate-grow-y rounded-t-[4px]",
                        // Today stands out in orange; the rest of the week is context.
                        i === 0 ? "bg-accent" : "bg-ink/25",
                      )}
                      style={{
                        height: `${Math.max(8, (b.count / maxBucket) * 70)}%`,
                        animationDelay: `${i * 90}ms`,
                      }}
                    />
                  )}
                </span>
              ))}
            </span>
            <span className="flex gap-1.5">
              {ENDING_BUCKETS.map((b) => (
                <span
                  key={b.id}
                  className="flex-1 text-center text-[0.625rem] leading-none text-ink-muted"
                >
                  {b.short}
                </span>
              ))}
            </span>
          </span>
          <TileFoot>Soonest first</TileFoot>
        </button>
      </div>
    </section>
  );
}
