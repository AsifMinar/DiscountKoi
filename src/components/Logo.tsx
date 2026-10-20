import Link from "next/link";
import { cn } from "@/lib/cn";

/** Minimal koi: lens-shaped body, fan tail, two pale spots, one eye. */
export function KoiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <path
        className="fill-accent"
        opacity="0.55"
        d="M11.5 16 4 9.6c1.4 2.1 2 4.2 2 6.4s-.6 4.3-2 6.4L11.5 16Z"
      />
      <path
        className="fill-accent"
        d="M29 16c-2.4-4.6-6.4-7-11-7-3.2 0-6 1.4-8 4.2a5 5 0 0 0 0 5.6c2 2.8 4.8 4.2 8 4.2 4.6 0 8.6-2.4 11-7Z"
      />
      <ellipse cx="18" cy="12.9" rx="3.2" ry="1.5" fill="#fff4ea" opacity="0.9" />
      <circle cx="13.4" cy="17.6" r="1.3" fill="#fff4ea" opacity="0.9" />
      <circle cx="24.6" cy="14.7" r="1.1" fill="#1c1917" />
    </svg>
  );
}

/** Wordmark + mark, linking home. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Discount Koi home"
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full pr-2 text-[1.0625rem] font-semibold tracking-tight",
        className,
      )}
    >
      <KoiMark className="size-8" />
      <span>
        Discount <span className="text-accent-text">Koi</span>
      </span>
    </Link>
  );
}
