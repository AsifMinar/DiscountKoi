import { useSyncExternalStore } from "react";

/*
 * Lists kept in the visitor's own browser (localStorage), like saved deals. Nothing is
 * sent anywhere and there are no accounts, so they stay on this device.
 * Every component using a list re-renders when it changes, in this tab or another one.
 */

const EMPTY: string[] = [];

function storedList(key: string, max: number) {
  let cache: string[] | null = null;
  const listeners = new Set<() => void>();

  const read = (): string[] => {
    if (cache) return cache;
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      cache = Array.isArray(value)
        ? [...new Set(value.filter((v): v is string => typeof v === "string"))].slice(0, max)
        : [];
    } catch {
      // Private mode or blocked storage: the list just starts empty.
      cache = [];
    }
    return cache;
  };

  const write = (next: string[]) => {
    cache = next.slice(0, max);
    try {
      window.localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      // Can't save (private mode): it still works until the page is closed.
    }
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      cache = null;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return {
    /** The list, newest first. Empty in the static HTML, filled in once the page runs. */
    useList: () => useSyncExternalStore(subscribe, read, () => EMPTY),
    toggle: (item: string) =>
      write(read().includes(item) ? read().filter((i) => i !== item) : [item, ...read()]),
    remove: (items: string[]) => write(read().filter((i) => !items.includes(i))),
    clear: () => write([]),
  };
}

/** Deal ids the visitor tapped ♡ on. */
export const savedDeals = storedList("discountkoi:saved", 300);
