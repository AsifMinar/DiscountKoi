import { startTransition, useEffect, useSyncExternalStore } from "react";
import type { Deal, DealsFile } from "@shared/deal";

const DEALS_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/deals.json`;
/** Browser cache (Cache Storage) holding the last good copy, for offline visits. */
const CACHE_NAME = "discountkoi-deals-v1";
const SAVED_AT_HEADER = "x-discountkoi-saved-at";
/** After this long without the list, say the connection looks slow. */
export const SLOW_AFTER_MS = 4_000;
/** After this long, give up and offer a retry instead of spinning forever. */
export const TIMEOUT_MS = 25_000;

export type LoadError =
  | { kind: "offline" }
  | { kind: "timeout" }
  | { kind: "server"; status: number }
  | { kind: "bad-data" };

export type DealsState = {
  deals: Deal[] | null;
  /** True when the list couldn't be loaded at all (no cached copy either). */
  failed: boolean;
  phase: "idle" | "loading" | "ready" | "error";
  /** Still loading after SLOW_AFTER_MS. */
  slow: boolean;
  /** Bytes downloaded so far, for "Downloading… 48 KB". */
  received: number;
  error: LoadError | null;
  /** Set when the deals came from the offline copy: when that copy was saved. */
  cachedAt: string | null;
};

const INITIAL: DealsState = {
  deals: null,
  failed: false,
  phase: "idle",
  slow: false,
  received: 0,
  error: null,
  cachedAt: null,
};

/* One shared store, so every component on the page sees the same single download. */
let state = INITIAL;
const listeners = new Set<() => void>();
function set(patch: Partial<DealsState>, transition = false) {
  state = { ...state, ...patch };
  const notify = () => listeners.forEach((l) => l());
  // A low-priority update: drawing the full list never blocks a tap or a keystroke.
  if (transition) startTransition(notify);
  else notify();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

async function readCached(): Promise<{ deals: Deal[]; savedAt: string } | null> {
  try {
    if (!("caches" in window)) return null;
    const res = await (await caches.open(CACHE_NAME)).match(DEALS_URL);
    if (!res) return null;
    const file = (await res.json()) as DealsFile;
    return { deals: file.deals, savedAt: res.headers.get(SAVED_AT_HEADER) ?? file.updatedAt };
  } catch {
    return null;
  }
}

async function writeCached(text: string) {
  try {
    if (!("caches" in window)) return;
    const headers = {
      "content-type": "application/json",
      [SAVED_AT_HEADER]: new Date().toISOString(),
    };
    await (await caches.open(CACHE_NAME)).put(DEALS_URL, new Response(text, { headers }));
  } catch {
    // Storage blocked or full: offline copies just aren't kept.
  }
}

/** Reads the body in chunks so the page can show how much has arrived. */
async function readWithProgress(res: Response): Promise<string> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    set({ received });
  }
  return text + decoder.decode();
}

let running = false;

async function load() {
  if (running || state.phase === "ready") return;
  running = true;
  set({ phase: "loading", slow: false, received: 0, error: null, failed: false });
  const controller = new AbortController();
  const slowTimer = window.setTimeout(() => set({ slow: true }), SLOW_AFTER_MS);
  const timeoutTimer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  let error: LoadError | null = null;
  try {
    if (!navigator.onLine) throw new TypeError("offline");
    const res = await fetch(DEALS_URL, { signal: controller.signal });
    if (!res.ok) {
      error = { kind: "server", status: res.status };
    } else {
      const text = await readWithProgress(res);
      let file: DealsFile;
      try {
        file = JSON.parse(text) as DealsFile;
        if (!Array.isArray(file.deals)) throw new Error("no deals");
      } catch {
        error = { kind: "bad-data" };
        throw new Error("bad data");
      }
      void writeCached(text);
      set({ deals: file.deals, phase: "ready", slow: false, cachedAt: null }, true);
    }
  } catch {
    error ??= controller.signal.aborted
      ? { kind: "timeout" }
      : navigator.onLine
        ? { kind: "server", status: 0 }
        : { kind: "offline" };
  } finally {
    window.clearTimeout(slowTimer);
    window.clearTimeout(timeoutTimer);
    running = false;
  }

  if (error) {
    // Fall back to the last good copy, so the page never goes blank.
    const cached = await readCached();
    if (cached) {
      set(
        { deals: cached.deals, phase: "ready", slow: false, error, cachedAt: cached.savedAt },
        true,
      );
    } else {
      set({ deals: null, phase: "error", slow: false, error, failed: true });
    }
  }
}

/** Try again after a failure (or to swap an offline copy for fresh deals). */
export function retryDeals() {
  if (running || (state.phase === "ready" && !state.cachedAt)) return;
  state = { ...state, phase: "idle" };
  void load();
}

const getState = () => state;
const getServerState = () => INITIAL;

/** The download state alone, for banners that don't trigger a download themselves. */
export function useDealsState(): DealsState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

/**
 * The full deal list. The page's HTML only carries the first screen of deals;
 * the rest arrives as one JSON file right after the page loads. Pass `false` when
 * the page already has everything it needs, and nothing is downloaded.
 */
export function useAllDeals(enabled = true): DealsState & { retry: () => void } {
  const current = useDealsState();

  useEffect(() => {
    if (!enabled || state.phase !== "idle") return;
    // The first screen is already in the HTML, so fetch the rest once the page is idle
    // (at most 1.5 s later). Browsers without requestIdleCallback start right away.
    const idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => void load(), { timeout: 1500 })
        : null;
    if (idle === null) void load();
    return () => {
      if (idle !== null) window.cancelIdleCallback(idle);
    };
  }, [enabled]);

  // Back online after a failure, or while showing the offline copy: fetch fresh deals.
  useEffect(() => {
    if (!enabled) return;
    const onOnline = () => {
      if (state.phase === "error" || state.cachedAt) retryDeals();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [enabled]);

  return { ...current, retry: retryDeals };
}
