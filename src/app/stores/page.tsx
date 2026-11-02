import type { Metadata } from "next";
import { StoreTiles } from "@/components/HomeSections";
import { PageHero, PageShell } from "@/components/PageHero";
import { storesData } from "@/lib/deals.server";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "All stores",
  description:
    "Every store on Discount Koi with its deals and weekly flyer: Sudbury grocery stores, retailers, online shops, food banks and meal programs.",
  path: "stores/",
});

export default function StoresPage() {
  const { updatedAt, stores } = storesData();
  const shops = stores.filter((s) => !s.foodHelp);
  const foodHelp = stores.filter((s) => s.foodHelp);

  return (
    <PageShell>
      <PageHero title="All stores" updatedAt={updatedAt} noSearch>
        Every store with a deal or a weekly flyer on Discount Koi. Pick one to see everything it has
        on sale.
      </PageHero>

      <section aria-labelledby="shops-heading" className="flex flex-col gap-4">
        <h2 id="shops-heading" className="text-xl font-semibold tracking-tight">
          Stores
        </h2>
        <StoreTiles stores={shops} />
      </section>

      {foodHelp.length > 0 && (
        <section aria-labelledby="food-help-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="food-help-heading" className="text-xl font-semibold tracking-tight">
              Food banks and meal programs
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">Free or low-cost food in Sudbury</p>
          </div>
          <StoreTiles stores={foodHelp} />
        </section>
      )}
    </PageShell>
  );
}
