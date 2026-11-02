"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Deal } from "@shared/deal";
import { weekLabel } from "@shared/dates";
import { CATEGORIES, type CategoryId } from "@shared/taxonomy";
import { DealCard } from "@/components/DealCard";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CategoryIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GiftIcon,
  StudentIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { FacetCounts } from "@/lib/filters";
import { plural } from "@/lib/format";
import { storeHref, type StoreSummary } from "@/lib/stores";
import { categoryTint } from "@/lib/tints";

/* The home page's shop-style sections, shown above the main deal grid. */

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
        <h2 id={id} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
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

/** Category icons in one row: a tap shows only that category. */
export function CategoryRail({
  available,
  selected,
  onPick,
}: {
  available: FacetCounts["cats"];
  selected: CategoryId[];
  onPick: (category: CategoryId) => void;
}) {
  const cats = CATEGORIES.filter((c) => c.id !== "food-help" && available[c.id]);
  if (cats.length < 2) return null;
  return (
    <nav aria-label="Shop by category">
      <ul className={cn(SCROLL_ROW, "snap-none lg:flex-wrap lg:justify-center")}>
        {cats.map((c) => {
          const active = selected.includes(c.id);
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onPick(c.id)}
                className="group flex w-24 flex-col items-center gap-2 rounded-2xl p-1.5 text-center text-xs leading-tight font-medium text-pretty"
              >
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full transition-[box-shadow,translate] duration-150 ease-out group-hover:shadow-[var(--glass-shadow-hover)] motion-safe:group-hover:-translate-y-0.5",
                    categoryTint(c.id),
                    active && "ring-2 ring-ink ring-offset-2 ring-offset-page",
                  )}
                >
                  <CategoryIcon category={c.id} className="size-6" />
                </span>
                {c.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
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
          <li key={flyer.id} className="w-52 shrink-0 snap-start">
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
                  className="block truncate text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
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

/** "Top deals" / "Ending soon": a sideways row of deal cards with a "See all" button. */
export function DealRow({
  id,
  title,
  subtitle,
  deals,
  today,
  search,
  onSeeAll,
}: {
  id: string;
  title: string;
  subtitle: string;
  deals: Deal[];
  today: string;
  search: string;
  onSeeAll: () => void;
}) {
  const { ref, sync, buttons } = useScroller();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionTitle id={id} title={title} subtitle={subtitle}>
        <Button variant="ghost" onClick={onSeeAll}>
          See all
          <ArrowRightIcon className="size-4" />
        </Button>
        {buttons(title.toLowerCase())}
      </SectionTitle>
      <ul ref={ref} onScroll={sync} role="list" className={SCROLL_ROW}>
        {deals.map((deal) => (
          <li key={deal.id} className="w-[min(16rem,72vw)] shrink-0 snap-start">
            <DealCard deal={deal} today={today} search={search} />
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

/** "Shop by store": the stores with the most deals, each opening its store page. */
export function StoreGrid({ stores, max = 12 }: { stores: StoreSummary[]; max?: number }) {
  const shown = stores.slice(0, max);
  if (!shown.length) return null;
  return (
    <section aria-labelledby="stores-heading" className="flex flex-col gap-3">
      <SectionTitle id="stores-heading" title="Shop by store">
        {stores.length > shown.length && (
          <Link href="/stores/" className={buttonClasses({ variant: "ghost" })}>
            All {stores.length} stores
            <ArrowRightIcon className="size-4" />
          </Link>
        )}
      </SectionTitle>
      <StoreTiles stores={shown} />
    </section>
  );
}

/** Store tiles in a grid (home page and the All stores page). */
export function StoreTiles({ stores }: { stores: StoreSummary[] }) {
  return (
    <ul role="list" className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
      {stores.map((store) => (
        <li key={store.slug}>
          <Link
            href={storeHref(store.name)}
            className="flex h-full min-h-16 items-center gap-2.5 rounded-3xl glass p-2.5 transition-[translate,box-shadow] duration-200 ease-out hover:shadow-[var(--glass-shadow-hover)] motion-safe:hover:-translate-y-0.5 sm:gap-3 sm:p-3"
          >
            <Avatar name={store.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{store.name}</span>
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

/** Two big cards that lead to the Student and Free pages. */
export function PromoCards({
  studentCount,
  freeCount,
}: {
  studentCount: number;
  freeCount: number;
}) {
  const cards = [
    {
      href: "/student/",
      icon: <StudentIcon className="size-6" />,
      tint: categoryTint("entertainment"),
      title: "Student discounts",
      text: `${plural(studentCount, "deal")} and programs for Laurentian, Cambrian and Collège Boréal students`,
      show: studentCount > 0,
    },
    {
      href: "/free/",
      icon: <GiftIcon className="size-6" />,
      tint: categoryTint("food-help"),
      title: "Free stuff & food help",
      text: `${plural(freeCount, "freebie")}, events, food banks and meal programs`,
      show: freeCount > 0,
    },
  ].filter((c) => c.show);
  if (!cards.length) return null;
  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {cards.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className="flex h-full items-center gap-4 rounded-3xl glass p-5 transition-[translate,box-shadow] duration-200 ease-out hover:shadow-[var(--glass-shadow-hover)] motion-safe:hover:-translate-y-0.5 sm:p-6"
          >
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl",
                c.tint,
              )}
            >
              {c.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold tracking-tight">{c.title}</span>
              <span className="block text-sm text-pretty text-ink-muted">{c.text}</span>
            </span>
            <ArrowRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
