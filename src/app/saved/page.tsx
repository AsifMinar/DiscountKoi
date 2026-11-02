import type { Metadata } from "next";
import { PageHero, PageShell } from "@/components/PageHero";
import { SavedDeals } from "@/components/SavedDeals";
import { loadDeals } from "@/lib/deals.server";
import { torontoDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Saved deals",
    description: "The deals you saved on Discount Koi. They're kept on this device only.",
    path: "saved/",
  }),
  // Different for every visitor, so there's nothing for search engines here.
  robots: { index: false },
};

export default function SavedPage() {
  const { updatedAt } = loadDeals();
  return (
    <PageShell>
      <PageHero title="Saved deals" updatedAt={updatedAt} noSearch>
        Deals you tapped ♡ on. They&apos;re kept in this browser only: no account, nothing sent
        anywhere.
      </PageHero>
      <SavedDeals buildDay={torontoDate()} />
    </PageShell>
  );
}
