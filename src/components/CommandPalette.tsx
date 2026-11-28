"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type { Deal } from "@shared/deal";
import { CATEGORIES } from "@shared/taxonomy";
import {
  ArrowRightIcon,
  CategoryIcon,
  GiftIcon,
  HeartIcon,
  InfoIcon,
  SearchIcon,
  StoreIcon,
  StudentIcon,
  TagIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { fold, inScope } from "@/lib/filters";
import { isFlyer as isFlyerDeal, storeHref } from "@/lib/stores";
import { navigateSearch, openDeal } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

/*
 * ⌘K / Ctrl+K: one box to jump anywhere: a page, a category, a store, or a deal.
 * Anything on the page can open it with openCommandPalette().
 */

const OPEN_EVENT = "discountkoi:palette";
export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_EVENT));

const PAGES = [
  { label: "Deals", href: "/", icon: <TagIcon className="size-4" /> },
  { label: "All stores", href: "/stores/", icon: <StoreIcon className="size-4" /> },
  { label: "Student discounts", href: "/student/", icon: <StudentIcon className="size-4" /> },
  { label: "Free stuff", href: "/free/", icon: <GiftIcon className="size-4" /> },
  { label: "Food help", href: "/free/?show=food-help", icon: <GiftIcon className="size-4" /> },
  { label: "Saved deals", href: "/saved/", icon: <HeartIcon className="size-4" /> },
  { label: "About", href: "/about/", icon: <InfoIcon className="size-4" /> },
];

/** Pages whose search box filters the list in place. */
const SEARCHABLE = ["/", "/student", "/free"];

type Item = {
  id: string;
  group: "Search" | "Deals" | "Stores" | "Categories" | "Pages";
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
};

const matches = (text: string, words: string[]) => {
  const hay = fold(text);
  return words.every((w) => hay.includes(w));
};

export function CommandPalette() {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const pathname = (usePathname() ?? "/").replace(/\/+$/, "") || "/";
  const listId = useId();
  // The deal list only downloads once the palette is opened.
  const { deals } = useAllDeals(open);

  // Ctrl+K / ⌘K anywhere, plus the rail's search button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };

  /** Same page: update the URL in place. Another page: navigate there. */
  const go = (href: string) => {
    close();
    const [path, search = ""] = href.split("?");
    const target = path.replace(/\/+$/, "") || "/";
    if (target === pathname) navigateSearch(search, "push");
    else router.push(href);
  };

  const items = useMemo<Item[]>(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const q = query.trim();
    const list: Item[] = [];

    if (q) {
      const here = SEARCHABLE.includes(pathname) || pathname.startsWith("/store/");
      list.push({
        id: "search",
        group: "Search",
        label: `Search deals for “${q}”`,
        hint: here ? "This page" : "All deals",
        icon: <SearchIcon className="size-4" />,
        run: () => {
          if (here) {
            const params = new URLSearchParams(window.location.search);
            params.set("q", q);
            params.delete("deal");
            close();
            navigateSearch(params.toString(), "replace");
          } else go(`/?q=${encodeURIComponent(q)}`);
        },
      });
    }

    const homeDeals: Deal[] = (deals ?? []).filter(
      (d) => inScope(d, { page: "home" }) && !isFlyerDeal(d),
    );
    if (words.length) {
      for (const d of homeDeals
        .filter((d) => matches(`${d.title} ${d.store}`, words))
        .slice(0, 5)) {
        list.push({
          id: `deal-${d.id}`,
          group: "Deals",
          label: d.title,
          hint: d.store,
          icon: <Avatar name={d.store} className="size-7 text-[0.625rem]" />,
          run: () => {
            if (pathname === "/") {
              close();
              openDeal(d.id);
            } else go(`/?deal=${encodeURIComponent(d.id)}`);
          },
        });
      }
    }

    const stores = [...new Set((deals ?? []).map((d) => d.store))];
    for (const name of stores
      .filter((s) => !words.length || matches(s, words))
      .slice(0, words.length ? 4 : 0)) {
      list.push({
        id: `store-${name}`,
        group: "Stores",
        label: name,
        icon: <Avatar name={name} className="size-7 text-[0.625rem]" />,
        run: () => go(storeHref(name)),
      });
    }

    for (const c of CATEGORIES.filter(
      (c) => c.id !== "food-help" && (!words.length || matches(c.label, words)),
    ).slice(0, words.length ? 4 : 6)) {
      list.push({
        id: `cat-${c.id}`,
        group: "Categories",
        label: c.label,
        icon: <CategoryIcon category={c.id} className="size-4" />,
        run: () => go(`/?cat=${c.id}`),
      });
    }

    for (const p of PAGES.filter((p) => !words.length || matches(p.label, words))) {
      list.push({
        id: `page-${p.href}`,
        group: "Pages",
        label: p.label,
        icon: p.icon,
        run: () => go(p.href),
      });
    }
    return list;
    // `go` and `close` only use state setters and the current path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, deals, pathname]);

  const current = Math.min(active, Math.max(0, items.length - 1));
  const optionId = (i: number) => `${listId}-${i}`;

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        (current + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[current]?.run();
    }
  };

  let lastGroup = "";
  return (
    <dialog
      ref={ref}
      aria-label="Search everything"
      onClose={close}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="mx-auto mt-[12vh] w-[min(40rem,calc(100%-2rem))] max-w-none animate-rise overflow-hidden rounded-3xl glass-strong p-0 text-ink frost backdrop:bg-[var(--scrim)] backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex max-h-[70dvh] flex-col">
          <div className="flex items-center gap-3 border-b border-line px-5">
            <SearchIcon aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={items.length ? optionId(current) : undefined}
              aria-label="Search pages, stores, categories and deals"
              placeholder="Jump to a store, category, page or deal…"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-16 w-full min-w-0 bg-transparent text-base placeholder:text-ink-muted focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 font-mono text-xs text-ink-muted sm:block">
              Esc
            </kbd>
          </div>

          <ul
            id={listId}
            role="listbox"
            aria-label="Results"
            className="flex-1 overflow-y-auto p-2"
          >
            {items.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-ink-muted">
                Nothing matches “{query}”. Try a store name or a category.
              </li>
            )}
            {items.map((item, i) => {
              const heading = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <li key={item.id} role="presentation">
                  {heading && (
                    <p aria-hidden="true" className="px-3 pt-3 pb-1.5 eyebrow">
                      {heading}
                    </p>
                  )}
                  <div
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === current}
                    onPointerMove={() => setActive(i)}
                    onClick={item.run}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 text-sm",
                      i === current ? "bg-accent-soft text-ink" : "text-ink",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-soft text-ink-muted"
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.hint && (
                      <span className="shrink-0 truncate text-xs text-ink-muted">{item.hint}</span>
                    )}
                    {i === current && (
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-accent-text"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="flex gap-4 border-t border-line px-5 py-2.5 text-xs text-ink-muted max-sm:hidden">
            <span>
              <kbd className="font-mono">↑↓</kbd> move
            </span>
            <span>
              <kbd className="font-mono">Enter</kbd> open
            </span>
            <span>
              <kbd className="font-mono">Ctrl K</kbd> toggle
            </span>
          </p>
        </div>
      )}
    </dialog>
  );
}
