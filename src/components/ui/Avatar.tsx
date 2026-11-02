import { cn } from "@/lib/cn";
import { storeTint } from "@/lib/tints";

// Little words that shouldn't become an initial ("The Salvation Army" → "SA").
const SKIP = new Set(["the", "of", "and", "a", "an", "de", "du", "la", "le", "les"]);

/** "NF" for No Frills, "I" for itch.io. */
function initialsOf(name: string) {
  const words = name
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w) && !SKIP.has(w.toLowerCase()));
  const initials = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return initials || name.trim().charAt(0).toUpperCase() || "?";
}

/** Round store "logo": the store's initials on its own soft colour. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-tight",
        storeTint(name),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
