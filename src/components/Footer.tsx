import Link from "next/link";
import { KoiMark } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="mt-24 px-page pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-4 border-t border-line pt-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <KoiMark className="size-5 shrink-0" />
          <span>
            Discount Koi · Deals come from public sources. Always confirm on the store&apos;s site.
          </span>
        </p>
        <nav aria-label="Footer">
          <ul className="flex gap-1">
            <li>
              <Link
                href="/about/"
                className="inline-flex h-11 items-center rounded-full px-3 hover:text-ink"
              >
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
