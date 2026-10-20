import { useCallback, useMemo, useSyncExternalStore, type MouseEvent } from "react";
import { filtersToSearch, parseFilters, type Filters } from "@/lib/filters";
import { torontoDate } from "@/lib/format";

/*
 * The URL query string is the single source of truth for filters, so any filtered
 * view can be shared as a link. During the static build there is no URL, so the
 * server snapshot is "" (the default view), and the page hydrates without a flash.
 */

const URL_EVENT = "discountkoi:urlchange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_EVENT, onChange);
  };
}

/** The current query string ("?a=b"), re-rendering when it changes. */
export function useSearchString(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
}

/**
 * Updates the query string without reloading. "replace" for filters (no history
 * spam), "push" for things the Back button should undo, like opening a deal.
 */
export function navigateSearch(search: string, mode: "push" | "replace" = "replace") {
  const { pathname, hash } = window.location;
  const url = `${pathname}${search ? `?${search}` : ""}${hash}`;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(URL_EVENT));
}

/** Current filters from the URL, plus a setter that merges changes into the URL. */
export function useFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const search = useSearchString();
  const filters = useMemo(() => parseFilters(search), [search]);
  const update = useCallback((patch: Partial<Filters>) => {
    const current = window.location.search;
    navigateSearch(filtersToSearch({ ...parseFilters(current), ...patch }, current));
  }, []);
  return [filters, update];
}

/* ---------- Deal detail (?deal=<id>) ---------- */

// True while the open deal was opened from a card on this page, so closing it can
// step back in history (making Close and the Back button behave the same).
let openedFromList = false;

/** Opens a deal's detail popup by adding ?deal=<id> as a new history entry. */
export function openDeal(id: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("deal", id);
  openedFromList = true;
  navigateSearch(params.toString(), "push");
}

/** Closes the popup: steps back if we opened it, otherwise just drops ?deal= from the URL. */
export function closeDeal() {
  if (openedFromList) {
    openedFromList = false;
    window.history.back();
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.delete("deal");
  navigateSearch(params.toString(), "replace");
}

/** Call when the popup has closed some other way (e.g. the Back button). */
export function forgetOpenedDeal() {
  openedFromList = false;
}

export const dealIdFrom = (search: string) => new URLSearchParams(search).get("deal");

/** Link that opens a deal's popup (the ?deal= param), keeping the current filters. */
export function dealHref(search: string, id: string) {
  const params = new URLSearchParams(search);
  params.set("deal", id);
  return `?${params.toString()}`;
}

/** Click handler for a deal link: opens the popup in place; Ctrl/Cmd/middle-click still open a tab. */
export function onDealClick(id: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openDeal(id);
  };
}

const noSubscribe = () => () => {};

/**
 * Today's date in Sudbury. The static HTML uses the build date; the browser then
 * switches to the real date, so "Ends in X days" is right even on an older build.
 */
export function useToday(buildDay: string): string {
  return useSyncExternalStore(
    noSubscribe,
    () => torontoDate(),
    () => buildDay,
  );
}
