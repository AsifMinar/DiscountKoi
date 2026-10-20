"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses, externalLinkProps } from "@/components/ui/Button";
import { ArrowUpRightIcon, CloseIcon, MenuIcon, PlusIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { SUBMIT_DEAL_URL } from "@/lib/site";

export const NAV_LINKS = [
  { href: "/", label: "Deals" },
  { href: "/products/", label: "Products" },
  { href: "/student/", label: "Student" },
  { href: "/free/", label: "Free" },
  { href: "/about/", label: "About" },
] as const;

const stripSlash = (path: string) => path.replace(/\/+$/, "") || "/";

/** Floating glass navbar. On phones the links fold into a small dropdown menu. */
export function Navbar() {
  const pathname = stripSlash(usePathname() ?? "/");
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const headerRef = useRef<HTMLElement>(null);

  // Close the menu whenever the route changes (adjusting state during render, per React docs).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // Close on Escape or a tap outside the navbar.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const linkClass = (href: string, extra?: string) => {
    const active = stripSlash(href) === pathname;
    return cn(
      "inline-flex h-11 items-center rounded-full px-4 text-sm font-medium transition-colors duration-150 ease-out",
      active ? "bg-neutral-soft text-ink" : "text-ink-muted hover:text-ink",
      extra,
    );
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 pt-[max(0.75rem,env(safe-area-inset-top))] px-page"
    >
      <div className="relative mx-auto max-w-[88rem]">
        <nav
          aria-label="Main"
          className="flex h-16 items-center justify-between gap-2 rounded-full glass-strong pr-2.5 pl-4 frost"
        >
          <Logo />

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={linkClass(href)}
                  aria-current={stripSlash(href) === pathname ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            {/* Phones get it in the menu; tablets an icon, where the links leave no room for words. */}
            <div className="hidden md:block">
              <a
                href={SUBMIT_DEAL_URL}
                {...externalLinkProps()}
                aria-label="Submit a deal (opens GitHub in a new tab)"
                className={buttonClasses({
                  variant: "secondary",
                  className: "w-11 px-0 lg:w-auto lg:px-5",
                })}
              >
                <PlusIcon className="size-5 shrink-0 lg:hidden" />
                <span className="max-lg:sr-only">Submit a deal</span>
              </a>
            </div>
            <ThemeToggle />
            <button
              type="button"
              className={buttonClasses({ variant: "ghost", size: "icon", className: "md:hidden" })}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full mt-2 animate-fade-in rounded-3xl glass-strong p-2 frost md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={linkClass(href, "w-full text-base")}
                    aria-current={stripSlash(href) === pathname ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-line pt-1">
                <a
                  href={SUBMIT_DEAL_URL}
                  {...externalLinkProps()}
                  className={linkClass(SUBMIT_DEAL_URL, "w-full gap-2 text-base")}
                  onClick={() => setMenuOpen(false)}
                >
                  Submit a deal
                  <ArrowUpRightIcon className="size-4" />
                  <span className="sr-only">(opens GitHub in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
