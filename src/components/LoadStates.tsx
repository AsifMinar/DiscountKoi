"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { AlertIcon, RefreshIcon, WifiOffIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { formatUpdated } from "@/lib/format";
import type { DealsState, LoadError } from "@/lib/use-all-deals";

/* What a deal list shows while its data downloads, is slow, or fails. */

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("en-CA")} KB`;

/**
 * One line above the skeleton cards: "Loading deals…", then on a slow connection an
 * honest update with how much has arrived and a moving bar, so it never looks frozen.
 */
export function LoadingStatus({ state }: { state: DealsState }) {
  return (
    <div role="status" className="flex flex-col gap-2">
      <p className="text-sm text-ink-muted">
        {state.slow ? (
          <>
            <span className="font-medium text-ink">Slow connection.</span> Still downloading deals
            {state.received > 0 && (
              <span className="tabular-nums"> · {kb(state.received)} so far</span>
            )}
            …
          </>
        ) : (
          "Loading deals…"
        )}
      </p>
      {state.slow && (
        <span
          aria-hidden="true"
          className="block h-1 w-full max-w-xs overflow-hidden rounded-full bg-accent-soft"
        >
          <span className="block h-full w-full progress-sweep" />
        </span>
      )}
    </div>
  );
}

function errorCopy(error: LoadError | null): { title: string; body: string; icon: ReactNode } {
  switch (error?.kind) {
    case "offline":
      return {
        title: "You're offline",
        body: "Discount Koi couldn't reach the internet to download the deal list. Reconnect to Wi-Fi or mobile data and we'll try again automatically.",
        icon: <WifiOffIcon className="size-7" />,
      };
    case "timeout":
      return {
        title: "The deal list is taking too long",
        body: "Nothing finished downloading in 25 seconds, so your connection looks very slow. Try again, or move to a stronger signal.",
        icon: <AlertIcon className="size-7" />,
      };
    case "bad-data":
      return {
        title: "The deal list arrived damaged",
        body: "Part of the download got corrupted on the way. Trying again almost always fixes it.",
        icon: <AlertIcon className="size-7" />,
      };
    case "server":
      return error.status
        ? {
            title: "Couldn't load the deal list",
            body: `The website's server answered with an error (code ${error.status}). It's usually fixed within a few minutes, so please try again shortly.`,
            icon: <AlertIcon className="size-7" />,
          }
        : {
            title: "Couldn't load the deal list",
            body: "The download was dropped before it finished. A VPN, an ad or content blocker, or a weak connection can cause this. Check those, then try again.",
            icon: <AlertIcon className="size-7" />,
          };
    default:
      return {
        title: "Couldn't load the deal list",
        body: "Something went wrong while downloading deals. Please try again.",
        icon: <AlertIcon className="size-7" />,
      };
  }
}

/** The failure panel: what went wrong in plain words, and a Retry button. */
export function LoadErrorPanel({
  state,
  onRetry,
  secondary,
}: {
  state: DealsState;
  onRetry: () => void;
  secondary?: ReactNode;
}) {
  const copy = errorCopy(state.error);
  const busy = state.phase === "loading";
  return (
    <EmptyState
      tone={state.error?.kind === "offline" ? "warning" : "error"}
      title={copy.title}
      icon={copy.icon}
      action={
        <Button onClick={onRetry} disabled={busy}>
          <RefreshIcon className={busy ? "size-4 motion-safe:animate-spin" : "size-4"} />
          {busy ? "Trying again…" : "Try again"}
        </Button>
      }
      secondary={secondary}
    >
      {copy.body}
    </EmptyState>
  );
}

/** Small note when the deals on screen are the saved offline copy. */
export function CachedNotice({ state, onRetry }: { state: DealsState; onRetry: () => void }) {
  if (!state.cachedAt) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line px-4 py-3 text-sm">
      <WifiOffIcon aria-hidden="true" className="size-4 shrink-0 text-tint-gold-text" />
      <p className="min-w-0 flex-1 text-pretty text-ink-muted">
        Showing your offline copy, saved{" "}
        <span className="font-medium text-ink">{formatUpdated(state.cachedAt)}</span> (Sudbury
        time). Some deals may have changed.
      </p>
      <Button variant="ghost" onClick={onRetry} disabled={state.phase === "loading"}>
        <RefreshIcon className="size-4" />
        Refresh
      </Button>
    </div>
  );
}
