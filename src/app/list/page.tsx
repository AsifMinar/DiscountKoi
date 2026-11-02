import type { Metadata } from "next";
import { PageHero, PageShell } from "@/components/PageHero";
import { ShoppingList } from "@/components/ShoppingList";
import { loadDeals } from "@/lib/deals.server";
import { torontoDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Shopping list",
    description:
      "Make a shopping list and see which Sudbury store, or which two stores, is cheapest for all of it this week.",
    path: "list/",
  }),
  // Different for every visitor, so there's nothing for search engines here.
  robots: { index: false },
};

export default function ListPage() {
  const { updatedAt } = loadDeals();
  return (
    <PageShell>
      <PageHero title="Shopping list" updatedAt={updatedAt} noSearch>
        Add what you need and see which store is cheapest for your whole list this week. Your list
        stays in this browser only.
      </PageHero>
      <ShoppingList buildDay={torontoDate()} />
    </PageShell>
  );
}
