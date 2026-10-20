import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { loadDeals } from "@/lib/deals.server";
import { formatUpdated } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "About this Sudbury deals site",
  description:
    "What Discount Koi is, how often it updates, and where its Sudbury and Ontario deals, prices and freebies come from.",
  path: "about/",
});

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
        <p>Only from places that allow it:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Links to each Sudbury store&apos;s official weekly flyer.</li>
          <li>
            Weekly product picks: short, hand-written listings from those flyers, each linking to
            the flyer itself.
          </li>
          <li>
            Free programs and events from the City of Greater Sudbury&apos;s news releases and open
            data, the Downtown Sudbury BIA and the Ontario Parks blog.
          </li>
          <li>Well-known national student programs, each linking to its official page.</li>
          <li>Online sales from official public feeds, like itch.io&apos;s.</li>
          <li>Deals submitted by people in Sudbury, published only after a check.</li>
        </ul>
        <p>
          Discount Koi doesn&apos;t copy flyers from store websites, and every card links straight
          to the original, where the full details live. It isn&apos;t affiliated with any store.
          Store and brand names belong to their owners.
        </p>
        <p className="text-sm">
          Contains information licensed under the Open Data Licence – City of Greater Sudbury.
        </p>
      </Section>

      <Section title="Comparing product prices">
        <p>
          The Products page puts each store&apos;s price for the same product side by side, cheapest
          first. Unit prices (per lb, per 100 g, per L or each) make different package sizes fair to
          compare.
        </p>
        <p>
          <strong className="font-semibold text-ink">Lowest price in Sudbury this week</strong>{" "}
          means the cheapest of two or more Sudbury stores listing it.{" "}
          <strong className="font-semibold text-ink">Price drop</strong> means it costs less than
          the last time the same store listed it.
        </p>
      </Section>

      <Section title="Found a deal?">
        <p>
          Use <strong className="font-semibold text-ink">Submit a deal</strong> at the top or bottom
          of any page. It opens a short form on GitHub (a free account is needed). Each submission
          is checked by hand before it appears here.
        </p>
      </Section>

      <Section title="Affiliate links">
        <p>
          Some online deals may use affiliate links: if you buy through one, Discount Koi may earn a
          small commission at no extra cost to you. Those deals always carry an{" "}
          <strong className="font-semibold text-ink">Affiliate link</strong> label, and it never
          changes which deal is cheapest.
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
          own browser. Product thumbnails load straight from the store&apos;s website without
          telling it which page you came from.
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
