import type { ReactNode, SVGProps } from "react";
import type { CategoryId } from "@shared/taxonomy";

// Small stroke icons (24×24 grid). Decorative: label the button that holds them instead.
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Icon>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 8h16M4 16h16" />
    </Icon>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </Icon>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function ArrowUpRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </Icon>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="m15 6-6 6 6 6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

export function SlidersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Icon>
  );
}

export function StoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v8h13v-8M10 20v-4.5h4V20" />
    </Icon>
  );
}

export function FlyerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 4h11v16H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1ZM16 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2h-2M8 8h4M8 12h4M8 16h4" />
    </Icon>
  );
}

export function StudentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9ZM6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5" />
    </Icon>
  );
}

export function GiftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v8h14v-8M12 8v12M12 8c-1-3-5-4-5-1.5S10 8 12 8Zm0 0c1-3 5-4 5-1.5S14 8 12 8Z" />
    </Icon>
  );
}

/* ---------- Category icons (the picture on cards without a product photo) ---------- */

const CATEGORY_PATHS: Record<CategoryId, ReactNode> = {
  grocery: (
    <>
      <path d="M4 9h16l-1.5 10.2a2 2 0 0 1-2 1.8h-9a2 2 0 0 1-2-1.8L4 9Z" />
      <path d="m8.5 9 3.5-5 3.5 5M9.5 13v4M14.5 13v4" />
    </>
  ),
  "food-restaurants": <path d="M6 3v6a3 3 0 0 0 6 0V3M9 3v18M17.5 21V3c-2 1.5-3 4-3 7v3h3" />,
  "food-help": (
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
  ),
  electronics: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  fashion: (
    <path d="M8.5 3.5 4 6l1.8 4.2L8 9.2V20.5h8V9.2l2.2 1L20 6l-4.5-2.5c-.6 1.6-1.9 2.5-3.5 2.5s-2.9-.9-3.5-2.5Z" />
  ),
  home: <path d="M4 11.5 12 4.5l8 7M6 9.8v10.2h12V9.8M10 20v-5h4v5" />,
  "health-beauty": (
    <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
  ),
  "sports-outdoors": (
    <>
      <path d="m2.5 19.5 6.5-11 4 6.5 2.5-3.5 6 8H2.5Z" />
      <circle cx="16.5" cy="6" r="1.5" />
    </>
  ),
  "kids-baby": (
    <>
      <ellipse cx="12" cy="9" rx="5" ry="6" />
      <path d="m12 15-1 1.8h2L12 15Zm0 1.8c0 2-2 2-2 4.2" />
    </>
  ),
  pets: (
    <>
      <circle cx="6.8" cy="10.2" r="1.6" />
      <circle cx="10.2" cy="6.5" r="1.6" />
      <circle cx="13.8" cy="6.5" r="1.6" />
      <circle cx="17.2" cy="10.2" r="1.6" />
      <path d="M12 12c-2.5 0-5 3.2-5 5.3 0 1.7 1.5 2.4 2.8 2.1 1-.2 1.5-.6 2.2-.6s1.2.4 2.2.6c1.3.3 2.8-.4 2.8-2.1 0-2.1-2.5-5.3-5-5.3Z" />
    </>
  ),
  automotive: (
    <>
      <path d="M4 15.5V13l2-5.5h12l2 5.5v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M4 13h16M7 16.5V19M17 16.5V19" />
    </>
  ),
  entertainment: (
    <>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4V7.5Z" />
      <path d="M14.5 6.5v11" strokeDasharray="2 2.2" />
    </>
  ),
  services: (
    <path d="M14.8 4.2a4.8 4.8 0 0 0-4.3 6.6l-6.3 6.3a1.9 1.9 0 0 0 2.7 2.7l6.3-6.3a4.8 4.8 0 0 0 6.6-4.3l-2.9 2.1-2.9-.9-.9-2.9 2.1-2.9a4.8 4.8 0 0 0-.4-.4Z" />
  ),
  other: (
    <>
      <path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8-9-9Z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),
};

/** The category's icon, e.g. a basket for Grocery. */
export function CategoryIcon({
  category,
  ...props
}: SVGProps<SVGSVGElement> & { category: CategoryId }) {
  return <Icon {...props}>{CATEGORY_PATHS[category]}</Icon>;
}
