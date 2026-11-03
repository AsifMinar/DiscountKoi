import type { Metadata } from "next";
import { FreeSections } from "@/components/FreeSections";
import { PageHero, PageShell } from "@/components/PageHero";
import { freePageData } from "@/lib/deals.server";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Free stuff in Sudbury",
  description:
    "Free events, food banks, meal programs, giveaways and freebies in Greater Sudbury and across Ontario, updated every morning.",
  path: "free/",
});

export default function FreePage() {
  const { updatedAt, explorer, foodHelp, foodHelpCredit } = freePageData();
  return (
    <PageShell>
      <PageHero
        title="Free stuff"
        updatedAt={updatedAt}
        searchLabel="Search freebies, events and food programs"
      >
        Giveaways, free events, freebies, food banks and meal programs in Sudbury and across
        Ontario.
      </PageHero>
      <FreeSections explorer={explorer} foodHelp={foodHelp} foodHelpCredit={foodHelpCredit} />
    </PageShell>
  );
}
