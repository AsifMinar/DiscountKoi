"use client";

import { useDeferredValue, useMemo } from "react";
import type { Deal } from "@shared/deal";
import { groupProducts, searchProducts } from "@shared/products";
import { DealModal } from "@/components/DealModal";
import { EmptyState } from "@/components/EmptyState";
import { ProductGroupCard } from "@/components/ProductGroupCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { isExpired } from "@/lib/filters";
import { plural } from "@/lib/format";
import { useFilters, useSearchString, useToday } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

export type ProductExplorerProps = {
  /** Product listings baked into the HTML at build time. */
  initialProducts: Deal[];
  /** All product listings at build time; if more than the baked ones, the rest load as /deals.json. */
  total: number;
  buildDay: string;
};

/** Product search and side-by-side store prices. The search text lives in the URL (?q=). */
export function ProductExplorer({ initialProducts, total, buildDay }: ProductExplorerProps) {
  const [filters, update] = useFilters();
  const search = useSearchString();
  const today = useToday(buildDay);
  const needsMore = total > initialProducts.length;
  const { deals: allDeals, failed } = useAllDeals(needsMore);

  const products = useMemo(
    () =>
      (needsMore && allDeals ? allDeals.filter((d) => d.productName) : initialProducts).filter(
        (d) => !isExpired(d, today),
      ),
    [needsMore, allDeals, initialProducts, today],
  );
  const groups = useMemo(() => groupProducts(products), [products]);
  const query = useDeferredValue(filters.q);
  const results = useMemo(() => searchProducts(groups, query), [groups, query]);
  const prices = results.reduce((n, g) => n + g.deals.length, 0);

  return (
    <div className="flex flex-col gap-12">
      <section id="products" aria-label="Products" className="flex scroll-mt-28 flex-col gap-5">
        <SectionHeader
          title={query.trim() ? "Results" : "This week's products"}
          count={
            groups.length
              ? `${plural(results.length, "product")} · ${plural(prices, "price")}`
              : undefined
          }
        />

        {groups.length === 0 && (
          <EmptyState
            title="No product prices yet"
            action={<ButtonLink href="/">Browse this week&apos;s flyers</ButtonLink>}
          >
            Store-by-store prices from this week&apos;s Sudbury flyers will show up here. Until
            then, every store&apos;s weekly flyer is one tap away.
          </EmptyState>
        )}

        {groups.length > 0 && results.length === 0 && (
          <EmptyState
            title="No products match your search"
            action={<Button onClick={() => update({ q: "" })}>Clear search</Button>}
          >
            Try a shorter word, like &ldquo;milk&rdquo; or &ldquo;eggs&rdquo;.
          </EmptyState>
        )}

        {needsMore && failed && (
          <p className="text-sm text-ink-muted">
            Some products couldn&apos;t load. Check your connection and reload the page.
          </p>
        )}

        {results.length > 0 && (
          <ul
            role="list"
            key={query}
            className="grid animate-fade-in grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {results.map((group) => (
              <li key={group.key}>
                <ProductGroupCard group={group} today={today} search={search} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <DealModal allDeals={products} initialDeals={products} failed={false} today={today} />
    </div>
  );
}
