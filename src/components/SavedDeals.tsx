"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DealCardSkeleton, DealGrid, FEED } from "@/components/DealCard";
import { DealModal } from "@/components/DealModal";
import { EmptyState } from "@/components/EmptyState";
import { HeartIcon, LockIcon } from "@/components/icons";
import { CachedNotice, LoadErrorPanel, LoadingStatus } from "@/components/LoadStates";
import { SectionHeader } from "@/components/SectionHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { isExpired } from "@/lib/filters";
import { plural } from "@/lib/format";
import { savedDeals, storageBlocked } from "@/lib/local-lists";
import { toast } from "@/lib/toast";
import { useSearchString, useToday } from "@/lib/url-state";
import { useAllDeals } from "@/lib/use-all-deals";

const noop = () => () => {};

/**
 * Shown when the browser blocks site storage. Explains why it matters and how to allow
 * it. Web pages can't open browser settings themselves, so it gives the exact path.
 */
function StorageBlocked() {
  return (
    <section
      id="storage"
      aria-labelledby="storage-heading"
      className="flex scroll-mt-28 flex-col gap-3 rounded-3xl border border-[color-mix(in_srgb,var(--tint-gold-text),transparent_70%)] bg-tint-gold/40 p-5"
    >
      <h2 id="storage-heading" className="flex items-center gap-2 text-base font-semibold">
        <LockIcon aria-hidden="true" className="size-5 text-tint-gold-text" />
        Your browser is blocking site storage
      </h2>
      <p className="text-sm text-pretty text-ink-muted">
        Saved deals live only on this device, in your browser&apos;s storage for this site. Nothing
        is sent to us. Right now your browser won&apos;t let the site keep anything, so saved deals
        disappear when you close the tab. To keep them, allow site data for{" "}
        <strong className="font-medium text-ink">asifminar.github.io</strong>:
      </p>
      <ul className="flex flex-col gap-1.5 text-sm text-pretty">
        <li>
          <strong className="font-medium">Chrome / Edge:</strong> tap the icon left of the address →
          Site settings → Cookies and site data → Allow.
        </li>
        <li>
          <strong className="font-medium">Safari (iPhone):</strong> Settings → Apps → Safari → turn
          off “Block All Cookies”. Private tabs never keep data.
        </li>
        <li>
          <strong className="font-medium">Firefox:</strong> tap the shield or lock icon → turn off
          Enhanced Tracking Protection for this site, or allow cookies under Settings → Privacy.
        </li>
      </ul>
      <div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          I&apos;ve allowed it, check again
        </Button>
      </div>
    </section>
  );
}

/** The deals this visitor saved with ♡, newest save first. Ended ones can be cleared. */
export function SavedDeals({ buildDay }: { buildDay: string }) {
  const ids = savedDeals.useList();
  const today = useToday(buildDay);
  const search = useSearchString();
  const dealsState = useAllDeals();
  const { deals: allDeals, failed, retry } = dealsState;
  // Checked once the page runs (there's no storage during the static build).
  const blocked = useSyncExternalStore(noop, storageBlocked, () => false);

  const { live, ended } = useMemo(() => {
    const byId = new Map((allDeals ?? []).map((d) => [d.id, d]));
    const live = ids.flatMap((id) => {
      const deal = byId.get(id);
      return deal && !isExpired(deal, today) ? [deal] : [];
    });
    const shown = new Set(live.map((d) => d.id));
    return { live, ended: ids.filter((id) => !shown.has(id)) };
  }, [ids, allDeals, today]);

  const removeWithUndo = (items: string[], message: string) => {
    const before = savedDeals.snapshot();
    savedDeals.remove(items);
    toast(message, {
      tone: "info",
      action: { label: "Undo", onClick: () => savedDeals.restore(before) },
    });
  };

  if (!ids.length) {
    return (
      <div className="flex flex-col gap-5">
        {blocked && <StorageBlocked />}
        <EmptyState
          title="Nothing saved yet"
          icon={<HeartIcon className="size-7" />}
          action={<ButtonLink href="/">Browse deals</ButtonLink>}
          secondary={
            <ButtonLink href="/free/" variant="ghost">
              See free stuff
            </ButtonLink>
          }
        >
          Tap the ♡ on any deal to keep it here for later. Saved deals stay on this device only, no
          account needed.
        </EmptyState>
      </div>
    );
  }

  return (
    <section aria-label="Saved deals" className="flex flex-col gap-5">
      {blocked && <StorageBlocked />}
      <SectionHeader
        title="Your saved deals"
        count={allDeals ? plural(live.length, "deal") : "Loading…"}
      >
        <Button
          variant="ghost"
          onClick={() => removeWithUndo(ids, `Cleared ${plural(ids.length, "saved deal")}`)}
        >
          Clear all
        </Button>
      </SectionHeader>

      <CachedNotice state={dealsState} onRetry={retry} />

      {failed && <LoadErrorPanel state={dealsState} onRetry={retry} />}

      {!allDeals && !failed && (
        <>
          <LoadingStatus state={dealsState} />
          <ul role="list" className={FEED} aria-hidden="true">
            {ids.slice(0, 4).map((id) => (
              <li key={id}>
                <DealCardSkeleton />
              </li>
            ))}
          </ul>
        </>
      )}

      {allDeals && ended.length > 0 && (
        <div className="flex flex-col gap-3 rounded-3xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-pretty text-ink-muted">
            {ended.length === 1
              ? "1 saved deal has ended or was removed by the store."
              : `${ended.length} saved deals have ended or were removed by the store.`}
          </p>
          <Button
            variant="secondary"
            onClick={() => removeWithUndo(ended, `Removed ${plural(ended.length, "ended deal")}`)}
          >
            Remove {ended.length === 1 ? "it" : "them"}
          </Button>
        </div>
      )}

      {allDeals && live.length === 0 && ended.length > 0 && (
        <EmptyState
          title="All your saved deals have ended"
          action={<ButtonLink href="/">Find new deals</ButtonLink>}
        >
          Deals end when the store&apos;s sale is over. Save new ones with the ♡.
        </EmptyState>
      )}

      {live.length > 0 && <DealGrid deals={live} today={today} search={search} grid={FEED} />}

      <DealModal allDeals={allDeals} initialDeals={[]} failed={failed} today={today} />
    </section>
  );
}
