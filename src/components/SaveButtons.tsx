"use client";

import { HeartIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { savedDeals, storageBlocked } from "@/lib/local-lists";
import { toast } from "@/lib/toast";

/** Saves or un-saves a deal and confirms it, with a next step (or Undo). */
export function toggleSaved(dealId: string) {
  const before = savedDeals.snapshot();
  const wasSaved = before.includes(dealId);
  savedDeals.toggle(dealId);
  if (wasSaved) {
    toast("Removed from saved", {
      tone: "info",
      action: { label: "Undo", onClick: () => savedDeals.restore(before) },
    });
  } else if (storageBlocked()) {
    toast("Saved for this visit only: your browser is blocking site storage", {
      tone: "warning",
      action: { label: "Fix", href: "/saved/#storage" },
    });
  } else {
    toast("Saved to this device", { action: { label: "View saved", href: "/saved/" } });
  }
}

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
      onClick={() => toggleSaved(dealId)}
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
