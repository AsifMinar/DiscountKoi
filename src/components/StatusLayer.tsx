"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, CloseIcon, InfoIcon, AlertIcon, WifiOffIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatUpdated } from "@/lib/format";
import { dismissToast, toast, useToasts, type Toast } from "@/lib/toast";
import { useDealsState } from "@/lib/use-all-deals";

/* Bottom-of-screen messages: the offline banner and short confirmation toasts. */

const TOAST_MS = 5_000;

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** False while the browser says there's no network. Always true in the static HTML. */
export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

const TONE_ICON = {
  success: <CheckIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <AlertIcon className="size-4" />,
};

function ToastItem({ item }: { item: Toast }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismissToast(item.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [item.id, paused]);

  const action = item.action;
  const actionClass =
    "inline-flex h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-accent-text hover:bg-accent-soft";
  return (
    <li
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex animate-rise items-center gap-3 rounded-2xl glass-strong py-1 pr-1 pl-3 shadow-[var(--glass-shadow-hover)] frost"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          item.tone === "warning" ? "bg-warn-soft text-warn" : "bg-accent text-accent-fg",
        )}
      >
        {TONE_ICON[item.tone ?? "success"]}
      </span>
      <p className="min-w-0 flex-1 text-sm font-medium text-pretty">{item.message}</p>
      {action?.href && (
        <Link href={action.href} className={actionClass} onClick={() => dismissToast(item.id)}>
          {action.label}
        </Link>
      )}
      {action && !action.href && (
        <button
          type="button"
          className={actionClass}
          onClick={() => {
            action.onClick?.();
            dismissToast(item.id);
          }}
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismissToast(item.id)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-neutral-soft hover:text-ink"
      >
        <CloseIcon className="size-4" />
      </button>
    </li>
  );
}

/** "You're offline" strip, plus a "Back online" toast when the network returns. */
function OfflineBanner() {
  const online = useOnline();
  const { cachedAt } = useDealsState();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      toast("You're back online.", { tone: "info" });
    }
  }, [online]);

  if (online) return null;
  return (
    <div
      role="status"
      className="pointer-events-auto flex animate-rise items-center gap-3 rounded-2xl border border-warn/40 bg-surface/95 px-3 py-2.5 shadow-[var(--glass-shadow-hover)]"
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn"
      >
        <WifiOffIcon className="size-4" />
      </span>
      <p className="text-sm text-pretty">
        <span className="font-semibold">You&apos;re offline.</span>{" "}
        <span className="text-ink-muted">
          {cachedAt
            ? `Showing deals saved ${formatUpdated(cachedAt)} (Sudbury time). We'll refresh when you're back.`
            : "You can still browse what's on this page. We'll refresh when you're back."}
        </span>
      </p>
    </div>
  );
}

export function StatusLayer() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] z-50 flex justify-center px-page max-md:bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+5.25rem)]">
      <div className="flex w-full max-w-md flex-col gap-2">
        <OfflineBanner />
        {/* Always in the page, so screen readers announce each new toast. */}
        <ol aria-live="polite" aria-label="Notifications" className="flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} item={t} />
          ))}
        </ol>
      </div>
    </div>
  );
}
