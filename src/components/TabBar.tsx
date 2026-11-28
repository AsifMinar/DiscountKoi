"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { GiftIcon, HeartIcon, StoreIcon, TagIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { savedDeals } from "@/lib/local-lists";

const stripSlash = (path: string) => path.replace(/\/+$/, "") || "/";

type Tab = { href: string; label: string; icon: (active: boolean) => ReactNode; match: string[] };

const TABS: Tab[] = [
  { href: "/", label: "Deals", icon: () => <TagIcon className="size-6" />, match: ["/"] },
  {
    href: "/stores/",
    label: "Stores",
    icon: () => <StoreIcon className="size-6" />,
    match: ["/stores", "/store"],
  },
  { href: "/free/", label: "Free", icon: () => <GiftIcon className="size-6" />, match: ["/free"] },
  {
    href: "/saved/",
    label: "Saved",
    icon: (active) => <HeartIcon filled={active} className="size-6" />,
    match: ["/saved"],
  },
];

const isActive = (tab: Tab, path: string) =>
  tab.match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(`${m}/`)));

/**
 * Phone navigation: four thumb-reach tabs fixed to the bottom of the screen. Tapping the
 * tab you're already on scrolls back to the top. Hidden while typing, so it never sits
 * on top of the keyboard.
 */
export function TabBar() {
  const path = stripSlash(usePathname() ?? "/");
  const saved = savedDeals.useList().length;

  const toTop = (e: MouseEvent<HTMLAnchorElement>, active: boolean) => {
    if (!active || window.location.search) return;
    e.preventDefault();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <nav
      aria-label="Sections"
      data-tabbar=""
      className="tab-bar fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-3xl glass-strong p-1.5 shadow-[var(--glass-shadow-hover)] frost">
        {TABS.map((tab) => {
          const active = isActive(tab, path);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                onClick={(e) => toTop(e, active)}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.6875rem] font-medium transition-colors duration-150",
                  active ? "bg-accent-soft text-accent-text" : "text-ink-muted hover:text-ink",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 h-0.5 w-6 rounded-full bg-accent"
                  />
                )}
                <span className="relative">
                  {tab.icon(active)}
                  {tab.href === "/saved/" && saved > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-2.5 min-w-4.5 rounded-full bg-accent px-1 text-center text-[0.625rem] leading-4.5 font-semibold text-accent-fg tabular-nums"
                    >
                      {saved > 99 ? "99+" : saved}
                    </span>
                  )}
                </span>
                {tab.label}
                {tab.href === "/saved/" && saved > 0 && <span className="sr-only"> ({saved})</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
