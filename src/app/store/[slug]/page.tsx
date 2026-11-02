import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { weekLabel } from "@shared/dates";
import { DealExplorer } from "@/components/DealExplorer";
import { ArrowUpRightIcon } from "@/components/icons";
import { PageHero, PageShell } from "@/components/PageHero";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { explorerData, storesData } from "@/lib/deals.server";
import { plural } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

// One page per store, made at build time. Any other /store/… address is the 404 page.
export const dynamicParams = false;

export function generateStaticParams() {
  return storesData().stores.map((s) => ({ slug: s.slug }));
}

const findStore = (slug: string) => storesData().stores.find((s) => s.slug === slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = findStore((await params).slug);
  if (!store) return {};
  return pageMetadata({
    title: `${store.name} deals`,
    description: `Every ${store.name} deal on Discount Koi${store.flyer ? ", plus a link to this week's flyer" : ""}. Updated every morning.`,
    path: `store/${store.slug}/`,
  });
}

/** One store: its weekly flyer (if it has one) and every deal listed for it. */
export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const store = findStore(slug);
  if (!store) notFound();
  const { updatedAt, explorer } = explorerData({ page: "store", slug });
  const flyer = store.flyer;

  return (
    <PageShell>
      <PageHero
        title={store.name}
        updatedAt={updatedAt}
        searchLabel={`Search ${store.name} deals`}
        noSearch={!store.count}
        before={<Avatar name={store.name} className="size-16 text-xl" />}
        actions={
          flyer && (
            <ButtonLink href={flyer.url} external size="lg">
              Open this week&apos;s flyer
              {flyer.startDate && flyer.endDate && (
                <span className="font-normal opacity-80">
                  {weekLabel(flyer.startDate, flyer.endDate)}
                </span>
              )}
              <ArrowUpRightIcon className="size-4" />
            </ButtonLink>
          )
        }
      >
        {store.count
          ? `${plural(store.count, "deal")} listed today.`
          : "No individual deals listed today."}
        {flyer && " Prices can differ between stores, so pick your Sudbury store on the flyer."}
      </PageHero>
      {/* A store with only a flyer this week has nothing to filter. */}
      {store.count > 0 && <DealExplorer {...explorer} />}
    </PageShell>
  );
}
