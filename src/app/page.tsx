import { DealExplorer } from "@/components/DealExplorer";
import { SearchBar } from "@/components/SearchBar";
import { loadDeals } from "@/lib/deals.server";
import { PAGE_SIZE, splitDefaultView, storeOptions } from "@/lib/filters";
import { formatUpdated, torontoDate } from "@/lib/format";

export default function HomePage() {
  const { updatedAt, deals } = loadDeals();
  const { highlight, rest } = splitDefaultView(deals);
  // Only the first screen of deals goes into the HTML; the rest loads as /deals.json.
  const initialDeals = [...highlight, ...rest.slice(0, PAGE_SIZE)];
  const isSample = deals.some((d) => d.source === "sample");

  return (
    <div className="mx-auto flex max-w-[88rem] flex-col gap-10 pt-10 sm:gap-14 sm:pt-16">
      <section className="flex flex-col items-center gap-5 text-center">
        <h1 className="max-w-2xl text-[2.125rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Every deal in Sudbury, in one calm place.
        </h1>
        <p className="max-w-xl text-base text-pretty text-ink-muted sm:text-lg">
          Flyers, discounts, student perks and freebies from Greater Sudbury and across Ontario.
        </p>
        <SearchBar />
        <p className="text-xs text-ink-muted">
          Last updated: <time dateTime={updatedAt}>{formatUpdated(updatedAt)}</time> (Sudbury time)
          {isSample && " · Showing sample data"}
        </p>
      </section>

      <DealExplorer
        initialDeals={initialDeals}
        total={deals.length}
        stores={storeOptions(deals)}
        buildDay={torontoDate()}
      />
    </div>
  );
}
