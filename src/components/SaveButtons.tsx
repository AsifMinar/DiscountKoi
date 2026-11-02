"use client";

import { CheckIcon, HeartIcon, PlusIcon } from "@/components/icons";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { savedDeals, shoppingList } from "@/lib/local-lists";
import { productKey } from "@shared/products";

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

/** Whether a product is on the shopping list (names match like the Products page groups). */
export function useOnList(name: string) {
  const key = productKey(name);
  const list = shoppingList.useList();
  const entry = list.find((item) => productKey(item) === key);
  return { onList: entry !== undefined, toggle: () => shoppingList.toggle(entry ?? name) };
}

/** "Add to list" / "On your list" for a product. */
export function ListButton({ name, className }: { name: string; className?: string }) {
  const { onList, toggle } = useOnList(name);
  return (
    <Button
      variant={onList ? "ghost" : "secondary"}
      aria-pressed={onList}
      onClick={toggle}
      className={cn(onList && "bg-neutral-soft", className)}
    >
      {onList ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
      {onList ? "On your list" : "Add to list"}
      <span className="sr-only">: {name}</span>
    </Button>
  );
}
