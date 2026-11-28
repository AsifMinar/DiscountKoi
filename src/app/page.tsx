import { DealExplorer } from "@/components/DealExplorer";
import { PageHero, PageShell } from "@/components/PageHero";
import { explorerData } from "@/lib/deals.server";

export default function HomePage() {
  const { updatedAt, explorer } = explorerData();
  return (
    <PageShell>
      <PageHero
        title={
          <>
            Every deal in Sudbury, <span className="text-aurora">in one calm place.</span>
          </>
        }
        updatedAt={updatedAt}
      >
        Flyers, discounts, student perks and freebies from Greater Sudbury and across Ontario.
      </PageHero>
      <DealExplorer {...explorer} />
    </PageShell>
  );
}
