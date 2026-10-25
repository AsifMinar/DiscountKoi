"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

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
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
