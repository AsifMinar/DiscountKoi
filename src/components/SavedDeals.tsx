"use client";

import { useMemo } from "react";
import { DealCardSkeleton, DealGrid, WIDE_GRID } from "@/components/DealCard";
import { DealModal } from "@/components/DealModal";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { isExpired } from "@/lib/filters";
import { plural } from "@/lib/format";
import { savedDeals } from "@/lib/local-lists";
import { useSearchString, useToday } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

/** The deals this visitor saved with ♡, newest save first. Ended ones can be cleared. */
export function SavedDeals({ buildDay }: { buildDay: string }) {
  const ids = savedDeals.useList();
  const today = useToday(buildDay);
  const search = useSearchString();
  const { deals: allDeals, failed } = useAllDeals();

  const { live, ended } = useMemo(() => {
    const byId = new Map((allDeals ?? []).map((d) => [d.id, d]));
    const live = ids.flatMap((id) => {
      const deal = byId.get(id);
      return deal && !isExpired(deal, today) ? [deal] : [];
    });
    const shown = new Set(live.map((d) => d.id));
    return { live, ended: ids.filter((id) => !shown.has(id)) };
  }, [ids, allDeals, today]);

  if (!ids.length) {
    return (
      <EmptyState title="Nothing saved yet" action={<ButtonLink href="/">Browse deals</ButtonLink>}>
        Tap the ♡ on any deal to keep it here. Saved deals stay on this device only.
      </EmptyState>
    );
  }

  return (
    <section aria-label="Saved deals" className="flex flex-col gap-5">
      <SectionHeader
        title="Your saved deals"
        count={allDeals ? plural(live.length, "deal") : "Loading…"}
      >
        <Button variant="ghost" onClick={savedDeals.clear}>
          Clear all
        </Button>
      </SectionHeader>

      {failed && (
        <EmptyState
          title="Couldn't load the deals"
          action={<Button onClick={() => window.location.reload()}>Try again</Button>}
        >
          Check your connection and try again.
        </EmptyState>
      )}

      {!allDeals && !failed && (
        <ul role="list" className={WIDE_GRID} aria-hidden="true">
          {ids.slice(0, 4).map((id) => (
            <li key={id}>
              <DealCardSkeleton />
            </li>
          ))}
        </ul>
      )}

      {allDeals && ended.length > 0 && (
        <div className="flex flex-col gap-3 rounded-3xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-pretty text-ink-muted">
            {ended.length === 1
              ? "1 saved deal has ended or was removed by the store."
              : `${ended.length} saved deals have ended or were removed by the store.`}
          </p>
          <Button variant="secondary" onClick={() => savedDeals.remove(ended)}>
            Remove {ended.length === 1 ? "it" : "them"}
          </Button>
        </div>
      )}

      {live.length > 0 && <DealGrid deals={live} today={today} search={search} />}

      <DealModal allDeals={allDeals} initialDeals={[]} failed={failed} today={today} />
    </section>
  );
}
