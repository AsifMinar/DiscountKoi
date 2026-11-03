"use client";

import { HeartIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { savedDeals } from "@/lib/local-lists";

/** ♡ on a deal: saves it to this device's Saved list. */
export function SaveButton({
  dealId,
  title,
  className,
}: {
  dealId: string;
  title: string;
  className?: string;
}) {
  const saved = savedDeals.useList().includes(dealId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      title={saved ? "Saved" : "Save"}
      onClick={() => savedDeals.toggle(dealId)}
      className={cn(
        buttonClasses({ variant: "secondary", size: "icon" }),
        "glass-strong",
        saved ? "text-accent-text" : "text-ink",
        className,
      )}
    >
      <HeartIcon filled={saved} className="size-5" />
    </button>
  );
}
