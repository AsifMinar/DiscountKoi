import type { Metadata } from "next";
import { KoiMark } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Friendly 404. The static export writes this out as 404.html, which GitHub Pages serves. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 pt-20 pb-8 text-center sm:pt-28">
      <KoiMark className="size-16" />
      <p className="text-sm font-medium text-accent-text">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        This page swam away
      </h1>
      <p className="text-base text-pretty text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved. The deals are right where
        you left them, though.
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <ButtonLink href="/" size="lg">
          Browse deals
        </ButtonLink>
        <ButtonLink href="/free/" variant="secondary" size="lg">
          Free stuff
        </ButtonLink>
      </div>
    </div>
  );
}
