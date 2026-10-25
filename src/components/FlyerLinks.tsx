import type { Deal } from "@shared/deal";
import { weekLabel } from "@shared/dates";
import { ArrowUpRightIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";

/** "This week's flyers": one small tile per store that opens its flyer in a new tab. */
export function FlyerLinks({ flyers }: { flyers: Deal[] }) {
  return (
    <section aria-labelledby="flyers-heading" className="flex flex-col gap-5">
      <div>
        <h2 id="flyers-heading" className="text-xl font-semibold tracking-tight">
          This week&rsquo;s flyers
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          Open a flyer, then pick your Sudbury store for local prices
        </p>
      </div>
      <ul role="list" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {flyers.map((flyer) => (
          <li key={flyer.id}>
            <GlassCard
              interactive
              className="relative flex h-full items-center gap-2.5 p-3 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring sm:p-4"
            >
              <Avatar name={flyer.store} className="max-xs:hidden" />
              <div className="min-w-0 flex-1">
                <a
                  href={flyer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
                >
                  {flyer.store}
                  <span className="sr-only"> flyer (opens in a new tab)</span>
                </a>
                {flyer.startDate && flyer.endDate && (
                  <p className="text-xs text-ink-muted">
                    {weekLabel(flyer.startDate, flyer.endDate)}
                  </p>
                )}
              </div>
              <ArrowUpRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-ink-muted max-xs:hidden"
              />
            </GlassCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
