import { cn } from "@/lib/cn";

const TINTS = [
  "bg-accent-soft text-accent-text",
  "bg-teal-soft text-teal-text",
  "bg-neutral-soft text-ink",
] as const;

/** Picks the same tint for the same store every time. */
function tintFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

/** Round store "logo": the first letter of the store name on a soft tint. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        tintFor(name),
        className,
      )}
    >
      {initial}
    </span>
  );
}
