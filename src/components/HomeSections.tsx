"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Deal } from "@shared/deal";
import { weekLabel } from "@shared/dates";
import { CATEGORIES, type CategoryId } from "@shared/taxonomy";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CategoryIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { FacetCounts } from "@/lib/filters";
import { plural } from "@/lib/format";
import { storeHref, type StoreSummary } from "@/lib/stores";
import { categoryTint } from "@/lib/tints";
import { dealHref, onDealClick } from "@/lib/url-state";

/* The home page's pieces around the deal feed: category chips, flyers, top stores. */

// Rows run edge to edge on phones and scroll sideways; the padding keeps card shadows visible.
const SCROLL_ROW =
  "scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:-mx-2 lg:scroll-px-2 lg:px-2";

function SectionTitle({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-accent" />
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 pl-3.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-1">{children}</div>}
    </div>
  );
}

/** A sideways-scrolling list with previous/next buttons for mouse users. */
function useScroller() {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);
  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);
  const by = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: smooth ? "smooth" : "auto" });
  };
  const buttons = (label: string) =>
    edges.start && edges.end ? null : (
      <span className="flex gap-1 max-sm:hidden">
        <button
          type="button"
          aria-label={`Scroll ${label} back`}
          disabled={edges.start}
          onClick={() => by(-1)}
          className={buttonClasses({ variant: "secondary", size: "icon" })}
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={`Scroll ${label} forward`}
          disabled={edges.end}
          onClick={() => by(1)}
          className={buttonClasses({ variant: "secondary", size: "icon" })}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </span>
    );
  return { ref, sync, buttons };
}

/** "This week's flyers": one small tile per store that opens its official flyer in a new tab. */
export function FlyerStrip({ flyers }: { flyers: Deal[] }) {
  const { ref, sync, buttons } = useScroller();
  return (
    <section aria-labelledby="flyers-heading" className="flex flex-col gap-3">
      <SectionTitle
        id="flyers-heading"
        title="This week’s flyers"
        subtitle="Open a flyer, then pick your Sudbury store for local prices"
      >
        {buttons("flyers")}
      </SectionTitle>
      <ul ref={ref} onScroll={sync} role="list" className={SCROLL_ROW}>
        {flyers.map((flyer) => (
          <li key={flyer.id} className="w-56 shrink-0 snap-start">
            <GlassCard
              interactive
              className="relative flex h-full items-center gap-3 p-3 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
            >
              <Avatar name={flyer.store} />
              <div className="min-w-0 flex-1">
                <a
                  href={flyer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-sm leading-snug font-medium outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
                >
                  {flyer.store}
                  <span className="sr-only"> flyer (opens in a new tab)</span>
                </a>
                {flyer.startDate && flyer.endDate && (
                  <p className="text-xs text-ink-muted">
                    {weekLabel(flyer.startDate, flyer.endDate)}
                  </p>
                )}
              </div>
              <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
            </GlassCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** How a store tile describes what's there. */
function storeLine(store: StoreSummary) {
  if (store.count) return plural(store.count, "deal") + (store.flyer ? " · flyer" : "");
  return store.flyer ? "Weekly flyer" : "No deals today";
}

/** Store tiles in a grid (home page and the All stores page). */
export function StoreTiles({ stores }: { stores: StoreSummary[] }) {
  return (
    <ul role="list" className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
      {stores.map((store) => (
        <li key={store.slug}>
          <Link
            href={storeHref(store.name)}
            className="hud relative flex h-full min-h-16 items-center gap-2.5 rounded-3xl glass p-2.5 transition-colors duration-150 ease-out hover:border-ink/25 sm:gap-3 sm:p-3"
          >
            <Avatar name={store.name} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm leading-snug font-medium">{store.name}</span>
              <span className="block text-xs text-ink-muted">{storeLine(store)}</span>
            </span>
            <ArrowRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-ink-muted max-sm:hidden"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Category chips above the feed: "All" plus one per category, with live counts. */
export function CategoryChips({
  available,
  counts,
  selected,
  onPick,
}: {
  available: FacetCounts["cats"];
  counts: FacetCounts["cats"];
  selected: CategoryId[];
  onPick: (category: CategoryId | null) => void;
}) {
  const cats = CATEGORIES.filter((c) => c.id !== "food-help" && available[c.id]);
  if (cats.length < 2) return null;
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl pr-4 pl-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
      active ? "bg-ink text-page" : "glass text-ink hover:border-ink/25",
    );
  return (
    <nav aria-label="Shop by category">
      <ul className={cn(SCROLL_ROW, "snap-none gap-2 sm:gap-2")}>
        <li className="shrink-0">
          <button
            type="button"
            aria-pressed={!selected.length}
            onClick={() => onPick(null)}
            className={cn(chip(!selected.length), "pl-4")}
          >
            All
          </button>
        </li>
        {cats.map((c) => {
          const active = selected.includes(c.id);
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onPick(c.id)}
                className={chip(active)}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    categoryTint(c.id),
                  )}
                >
                  <CategoryIcon category={c.id} className="size-4" />
                </span>
                {c.label}
                <span className="text-xs tabular-nums opacity-60">{counts[c.id] ?? 0}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Side panel block: a titled glass card. */
export function PanelCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-3xl glass p-4">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 id={id} className="eyebrow">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Side panel: this week's flyers as a compact list. */
export function FlyerList({ flyers }: { flyers: Deal[] }) {
  return (
    <PanelCard title="This week’s flyers">
      <ul className="-mx-2 flex flex-col">
        {flyers.map((flyer) => (
          <li key={flyer.id}>
            <a
              href={flyer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-neutral-soft"
            >
              <Avatar name={flyer.store} className="size-8 text-xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{flyer.store}</span>
                {flyer.startDate && flyer.endDate && (
                  <span className="block text-xs text-ink-muted">
                    {weekLabel(flyer.startDate, flyer.endDate)}
                  </span>
                )}
              </span>
              <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span className="sr-only"> flyer (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}

/** Side panel: the stores with the most deals, with a bar showing how many each has. */
export function TopStores({ stores, max = 6 }: { stores: StoreSummary[]; max?: number }) {
  const shown = stores.filter((s) => s.count > 0).slice(0, max);
  if (shown.length < 2) return null;
  const most = Math.max(...shown.map((s) => s.count));
  return (
    <PanelCard
      title="Top stores"
      action={
        <Link
          href="/stores/"
          className="-my-1.5 inline-flex h-11 items-center gap-1 rounded-full px-3 text-xs font-medium text-accent-text hover:bg-accent-soft"
        >
          All {stores.length}
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
        </Link>
      }
    >
      <ul className="-mx-2 flex flex-col">
        {shown.map((store) => (
          <li key={store.slug}>
            <Link
              href={storeHref(store.name)}
              className="flex min-h-12 items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-neutral-soft"
            >
              <Avatar name={store.name} className="size-8 text-xs" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{store.name}</span>
                  <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                    {plural(store.count, "deal")}
                  </span>
                </span>
                <span aria-hidden="true" className="block h-1 rounded-full bg-accent-soft">
                  <span
                    className="block h-full origin-left animate-grow-x rounded-full bg-accent"
                    style={{ width: `${(store.count / most) * 100}%` }}
                  />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}

/**
 * "LIVE" ticker of the biggest discounts, scrolling slowly across the top of the feed.
 * It pauses on hover or keyboard focus, every item opens its deal, and with reduced
 * motion it stays still and scrolls by hand instead.
 */
export function DealTicker({ deals, search }: { deals: Deal[]; search: string }) {
  const items = deals.filter((d) => d.discountPercent).slice(0, 12);
  if (items.length < 3) return null;
  const row = (copy: boolean) =>
    items.map((d) => (
      <li key={`${copy ? "b" : "a"}-${d.id}`} aria-hidden={copy || undefined} className="shrink-0">
        <a
          href={dealHref(search, d.id)}
          onClick={onDealClick(d.id)}
          tabIndex={copy ? -1 : undefined}
          className="flex h-11 items-center gap-2.5 border-r border-line px-4 text-sm transition-colors hover:bg-neutral-soft"
        >
          <span className="font-pixel text-base text-accent-text">−{d.discountPercent}%</span>
          <span className="max-w-60 truncate font-medium">{d.title}</span>
          <span className="text-xs text-ink-muted">{d.store}</span>
        </a>
      </li>
    ));
  return (
    <section
      aria-label="Biggest discounts right now"
      className="flex overflow-hidden rounded-xl border border-line bg-[var(--glass)]"
    >
      <p className="flex shrink-0 items-center gap-2 bg-accent px-3 font-mono text-xs font-semibold tracking-widest text-accent-fg uppercase">
        <span aria-hidden="true" className="size-1.5 animate-blink rounded-full bg-accent-fg" />
        Live
      </p>
      <div className="group min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
        <ul className="flex w-max animate-ticker group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {row(false)}
          {row(true)}
        </ul>
      </div>
    </section>
  );
}
