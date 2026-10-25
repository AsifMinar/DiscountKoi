import { DealExplorer } from "@/components/DealExplorer";
import { PageHero, PageShell } from "@/components/PageHero";
import { explorerData } from "@/lib/deals.server";

export default function HomePage() {
  const { updatedAt, explorer } = explorerData();
  return (
    <PageShell>
      <PageHero title="Every deal in Sudbury, in one calm place." updatedAt={updatedAt}>
        Flyers, discounts, student perks and freebies from Greater Sudbury and across Ontario.
      </PageHero>
      <DealExplorer {...explorer} />
    </PageShell>
  );
}
