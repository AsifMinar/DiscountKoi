"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { openCommandPalette } from "@/components/CommandPalette";
import {
  GiftIcon,
  HeartIcon,
  InfoIcon,
  SearchIcon,
  StoreIcon,
  StudentIcon,
  TagIcon,
} from "@/components/icons";
import { KoiMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { savedDeals } from "@/lib/local-lists";

const stripSlash = (path: string) => path.replace(/\/+$/, "") || "/";

const ITEMS: { href: string; label: string; icon: ReactNode; match: string[] }[] = [
  { href: "/", label: "Deals", icon: <TagIcon className="size-5" />, match: ["/"] },
  {
    href: "/stores/",
    label: "Stores",
    icon: <StoreIcon className="size-5" />,
    match: ["/stores", "/store"],
  },
  {
    href: "/student/",
    label: "Student",
    icon: <StudentIcon className="size-5" />,
    match: ["/student"],
  },
  { href: "/free/", label: "Free", icon: <GiftIcon className="size-5" />, match: ["/free"] },
  { href: "/saved/", label: "Saved", icon: <HeartIcon className="size-5" />, match: ["/saved"] },
  { href: "/about/", label: "About", icon: <InfoIcon className="size-5" />, match: ["/about"] },
];

const isActive = (match: string[], path: string) =>
  match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(`${m}/`)));

/**
 * Desktop navigation: a slim floating rail down the left edge, like an app. The logo on
 * top, sections in the middle, search and the theme switch at the bottom.
 */
export function SideRail() {
  const path = stripSlash(usePathname() ?? "/");
  const saved = savedDeals.useList().length;

  return (
    <header className="sticky top-0 hidden h-dvh py-3 pl-3 lg:block">
      <nav
        aria-label="Main"
        className="flex h-full w-[4.75rem] flex-col items-center gap-1 rounded-3xl glass-strong py-3 frost"
      >
        <Link
          href="/"
          aria-label="Discount Koi home"
          className="mb-3 flex size-12 items-center justify-center rounded-2xl transition-transform hover:scale-105"
        >
          <KoiMark className="size-9" />
        </Link>

        <ul className="flex flex-1 flex-col items-center gap-1">
          {ITEMS.map((item) => {
            const active = isActive(item.match, path);
            const count = item.href === "/saved/" ? saved : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex w-16 flex-col items-center gap-1 rounded-2xl py-2 text-[0.6875rem] font-medium transition-colors duration-150",
                    active
                      ? "bg-accent-soft text-accent-text"
                      : "text-ink-muted hover:bg-neutral-soft hover:text-ink",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 -left-1.5 h-6 w-1 -translate-y-1/2 rounded-full bg-aurora"
                    />
                  )}
                  <span className="relative">
                    {item.icon}
                    {count > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-aurora px-1 text-center text-[0.5625rem] leading-4 font-semibold text-accent-fg tabular-nums"
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  {item.label}
                  {count > 0 && <span className="sr-only"> ({count})</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Search everything"
          aria-keyshortcuts="Control+K Meta+K"
          title="Search everything (Ctrl K)"
          className="flex w-16 flex-col items-center gap-1 rounded-2xl py-2 text-[0.6875rem] font-medium text-ink-muted transition-colors hover:bg-neutral-soft hover:text-ink"
        >
          <SearchIcon className="size-5" />
          <kbd className="font-mono text-[0.625rem]">⌘K</kbd>
        </button>
        <ThemeToggle />
      </nav>
    </header>
  );
}
