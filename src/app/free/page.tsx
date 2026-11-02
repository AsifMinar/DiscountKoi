import type { Metadata } from "next";
import { DealExplorer } from "@/components/DealExplorer";
import { PageHero, PageShell } from "@/components/PageHero";
import { explorerData } from "@/lib/deals.server";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Free stuff in Sudbury",
  description:
    "Free events, food banks, meal programs, giveaways and freebies in Greater Sudbury and across Ontario, updated every morning.",
  path: "free/",
});

export default function FreePage() {
  const { updatedAt, explorer } = explorerData({ page: "free" });
  return (
    <PageShell>
      <PageHero title="Free stuff" updatedAt={updatedAt}>
        Giveaways, free events, freebies, food banks and meal programs in Sudbury and across
        Ontario.
      </PageHero>
      <DealExplorer {...explorer} />
    </PageShell>
  );
}
