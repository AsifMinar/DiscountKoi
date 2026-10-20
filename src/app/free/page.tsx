import type { Metadata } from "next";
import { DealExplorer } from "@/components/DealExplorer";
import { PageHero, PageShell } from "@/components/PageHero";
import { explorerData } from "@/lib/deals.server";

export const metadata: Metadata = {
  title: "Free stuff",
  description:
    "Giveaways, free samples, free events and freebies in Sudbury and across Ontario, updated every morning.",
};

export default function FreePage() {
  const { updatedAt, isSample, explorer } = explorerData("free");
  return (
    <PageShell>
      <PageHero title="Free stuff" updatedAt={updatedAt} isSample={isSample}>
        Giveaways, free samples, free events and freebies in Sudbury and across Ontario.
      </PageHero>
      <DealExplorer {...explorer} />
    </PageShell>
  );
}
