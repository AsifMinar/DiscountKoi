import type { Metadata } from "next";
import { PageHero, PageShell } from "@/components/PageHero";
import { ProductExplorer } from "@/components/ProductExplorer";
import { productsData } from "@/lib/deals.server";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Compare product prices in Sudbury",
  description:
    "Search a product and compare Sudbury store prices side by side, cheapest first, with unit prices, price drops and the lowest price in Sudbury this week.",
  path: "products/",
});

export default function ProductsPage() {
  const { updatedAt, isSample, initialProducts, total, buildDay } = productsData();
  return (
    <PageShell>
      <PageHero
        title="Compare prices, store by store"
        updatedAt={updatedAt}
        isSample={isSample}
        searchLabel="Search products"
        searchPlaceholder="Try milk, eggs or AirPods"
        resultsId="products"
      >
        Search a product and see every Sudbury store&apos;s price side by side, cheapest first, with
        unit prices so different sizes compare fairly.
      </PageHero>
      <ProductExplorer initialProducts={initialProducts} total={total} buildDay={buildDay} />
    </PageShell>
  );
}
