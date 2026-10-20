import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { loadDeals } from "@/lib/deals.server";
import { formatUpdated } from "@/lib/format";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Discount Koi is, how often it updates, and where its Sudbury and Ontario deals come from.",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassCard as="section" className="flex flex-col gap-3 p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-base text-pretty text-ink-muted">{children}</div>
    </GlassCard>
  );
}

export default function AboutPage() {
  const { updatedAt } = loadDeals();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-10 sm:pt-16">
      <header className="flex flex-col gap-4 pb-4 text-center">
        <h1 className="text-[2.125rem] leading-[1.1] font-semibold tracking-tight sm:text-5xl">
          About Discount Koi
        </h1>
        <p className="text-base text-pretty text-ink-muted sm:text-lg">
          Every discount, deal and freebie posted online for Sudbury, Ontario, gathered into one
          calm, searchable place.
        </p>
      </header>

      <Section title="What it is">
        <p>
          Discount Koi is a free, independent site for people in Greater Sudbury. It brings together
          grocery and retail flyers, store promotions, online deals, student discounts and free
          stuff, so you don&apos;t have to check a dozen websites every week.
        </p>
        <p>
          Sudbury deals always come first, then Ontario-wide promotions, then online deals that ship
          to Ontario. No sign-up needed.
        </p>
      </Section>

      <Section title="How often it updates">
        <p>
          Every morning at <strong className="font-semibold text-ink">6:00 AM Sudbury time</strong>,
          Discount Koi checks its sources for new deals and removes the ones that have ended.
        </p>
        <p>
          Last updated: <time dateTime={updatedAt}>{formatUpdated(updatedAt)}</time> (Sudbury time).
        </p>
      </Section>

      <Section title="Where the deals come from">
        <p>
          Only public sources: store flyers, retailer deal and clearance pages, community deal posts
          on RedFlagDeals, and a hand-picked list of student discounts. Each deal links straight to
          where it was posted.
        </p>
        <p>
          Discount Koi isn&apos;t affiliated with any store. Store and brand names belong to their
          owners.
        </p>
      </Section>

      <section className="flex flex-col gap-3 rounded-3xl border border-accent-soft bg-accent-soft p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight text-accent-text">
          Always double-check before you go
        </h2>
        <p className="text-base text-pretty">
          Deals come from public sources and can change, sell out or end early. Please confirm the
          price, dates and availability on the store&apos;s own site (or in store) before you buy.
        </p>
      </section>

      <Section title="What the badges mean">
        <ul className="flex flex-col gap-3">
          <li className="grid grid-cols-[6.5rem_1fr] items-start justify-items-start gap-3">
            <Badge tone="teal">Sudbury</Badge>
            <span>At a store in Greater Sudbury.</span>
          </li>
          <li className="grid grid-cols-[6.5rem_1fr] items-start justify-items-start gap-3">
            <Badge>Ontario</Badge>
            <span>An Ontario-wide promotion, in store or online.</span>
          </li>
          <li className="grid grid-cols-[6.5rem_1fr] items-start justify-items-start gap-3">
            <Badge tone="outline">Ships to ON</Badge>
            <span>An online deal that ships to Sudbury and the rest of Ontario.</span>
          </li>
        </ul>
      </Section>

      <Section title="Privacy">
        <p>
          No accounts, no cookies, no tracking. Your light or dark mode choice is saved only in your
          own browser.
        </p>
      </Section>

      <div className="flex justify-center pt-4">
        <ButtonLink href="/" size="lg">
          Browse deals
        </ButtonLink>
      </div>
    </div>
  );
}
