import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-sm hover:bg-accent-hover",
  secondary: "glass text-ink hover:bg-glass-strong",
  ghost: "text-ink hover:bg-neutral-soft",
};

// Every size is at least 44px tall so it's an easy touch target.
const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "size-11",
};

type StyleProps = { variant?: Variant; size?: Size; className?: string };

/** Class string for a pill button. Use it on anything that should look like a button. */
export function buttonClasses({ variant = "primary", size = "md", className }: StyleProps = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none",
    "transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & StyleProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

/** target and rel for every off-site link (rel="sponsored" too for affiliate links). */
export function externalLinkProps(sponsored = false) {
  return {
    target: "_blank",
    rel: sponsored ? "sponsored noopener noreferrer" : "noopener noreferrer",
  } as const;
}

type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  StyleProps & {
    href: string;
    /** Opens in a new tab with rel="noopener noreferrer". Use it for every off-site link. */
    external?: boolean;
    /** Affiliate or paid link: adds rel="sponsored". */
    sponsored?: boolean;
  };

/** A link styled as a button. Internal links use next/link; external ones open safely in a new tab. */
export function ButtonLink({
  href,
  external,
  sponsored,
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, className });
  if (external) {
    return <a href={href} className={classes} {...props} {...externalLinkProps(sponsored)} />;
  }
  return <Link href={href} className={classes} {...props} />;
}
