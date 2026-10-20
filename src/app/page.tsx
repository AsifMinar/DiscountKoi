// TEMPORARY (Phase 1): design-system preview. Phase 2 replaces this with the real home page.
import { ChipDemo } from "./_preview/ChipDemo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowUpRightIcon, SearchIcon } from "@/components/icons";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-ink-muted">{children}</h2>;
}

export default function Home() {
  return (
    <div className="mx-auto flex max-w-[88rem] flex-col gap-12 pt-12 px-page sm:pt-20">
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Every deal in Sudbury, in one calm place.
        </h1>
        <p className="max-w-xl text-base text-pretty text-ink-muted sm:text-lg">
          Discounts, flyers, student perks and freebies, gathered every morning at 6 AM.
        </p>
        <label className="flex h-14 w-full max-w-xl items-center gap-3 rounded-full glass-strong px-5 frost focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
          <SearchIcon className="size-5 shrink-0 text-ink-muted" />
          <span className="sr-only">Search deals</span>
          <input
            type="search"
            placeholder="Search deals, stores or brands"
            className="h-full w-full min-w-0 bg-transparent text-base placeholder:text-ink-muted focus:outline-none"
          />
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Chips</SectionTitle>
        <ChipDemo />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Buttons</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <ButtonLink href="https://example.com" external size="lg">
            Get this deal <ArrowUpRightIcon className="size-4" />
          </ButtonLink>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Badges</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Badge tone="teal">Sudbury</Badge>
          <Badge>Ontario</Badge>
          <Badge tone="outline">Ships to ON</Badge>
          <Badge>Online</Badge>
          <Badge>In-Store</Badge>
          <Badge>Student</Badge>
          <Badge tone="accent">Free</Badge>
          <Badge tone="accent">−35%</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Cards</SectionTitle>
        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            ["Food Basics", "Fresh Atlantic salmon fillets", "8.99", "13.99", "−36%", "Sudbury"],
            [
              "Best Buy",
              "Sony WH-1000XM6 noise cancelling headphones",
              "399.99",
              "529.99",
              "−25%",
              "Ships to ON",
            ],
            [
              "Canadian Tire",
              "Mastercraft 120-piece tool set",
              "59.99",
              "149.99",
              "−60%",
              "Ontario",
            ],
            [
              "Spotify",
              "Premium Student: 1 month free, then half price",
              "0",
              "",
              "",
              "Ships to ON",
            ],
          ].map(([store, title, sale, orig, pct, loc]) => (
            <GlassCard key={title} as="article" interactive className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar name={store} />
                <span className="text-sm font-medium text-ink-muted">{store}</span>
              </div>
              <h3 className="line-clamp-2 text-base leading-snug font-medium">{title}</h3>
              <div className="mt-auto flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {sale === "0" ? "Free" : `$${sale}`}
                </span>
                {orig && <s className="text-sm text-ink-muted">${orig}</s>}
                {pct && (
                  <Badge tone="accent" className="ml-auto">
                    {pct}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  tone={loc === "Sudbury" ? "teal" : loc === "Ontario" ? "neutral" : "outline"}
                >
                  {loc}
                </Badge>
                <Badge>{sale === "0" ? "Student" : "In-Store"}</Badge>
              </div>
              <p className="text-xs text-ink-muted">Ends in 4 days</p>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
