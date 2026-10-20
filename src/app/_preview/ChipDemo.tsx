"use client";

// TEMPORARY (Phase 1 design preview). Removed when the real home page lands in Phase 2.
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";

const TYPES = ["Student Discount", "Online Deal", "In-Store Deal", "Free"];
const CATEGORIES = [
  "Food & Restaurants",
  "Grocery",
  "Gadgets & Electronics",
  "Clothes & Fashion",
  "Home & Furniture",
  "Health & Beauty",
  "Sports & Outdoors",
];

export function ChipDemo() {
  const [selected, setSelected] = useState<string[]>(["Online Deal"]);
  const toggle = (label: string) =>
    setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 scrollbar-none flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {TYPES.map((t) => (
          <Chip key={t} selected={selected.includes(t)} onClick={() => toggle(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <div className="-mx-4 scrollbar-none flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {CATEGORIES.map((c, i) => (
          <Chip
            key={c}
            selected={selected.includes(c)}
            count={(i + 3) * 7}
            onClick={() => toggle(c)}
          >
            {c}
          </Chip>
        ))}
      </div>
    </div>
  );
}
