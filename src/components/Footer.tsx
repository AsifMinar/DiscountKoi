import Link from "next/link";
import { KoiMark } from "@/components/Logo";

const FOOTER_LINK =
  "inline-flex h-11 items-center rounded-full px-3 whitespace-nowrap hover:text-ink";

export function Footer() {
  return (
    <footer className="mt-24 px-page pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-4 border-t border-line pt-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <KoiMark className="size-5 shrink-0" />
          <span>
            Discount Koi · Deals come from public sources. Always confirm on the store&apos;s site.
          </span>
        </p>
        <nav aria-label="Footer" className="sm:shrink-0">
          <ul className="-mx-3 flex flex-wrap gap-x-1 sm:mx-0">
            <li>
              <Link href="/products/" className={FOOTER_LINK}>
                Products
              </Link>
            </li>
            <li>
              <Link href="/about/" className={FOOTER_LINK}>
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
