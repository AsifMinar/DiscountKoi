import { useSyncExternalStore } from "react";

/*
 * Small confirmation messages ("Saved", "Filters cleared") that appear for a few
 * seconds with an optional next step or Undo. Anything on the page can call toast().
 */

export type ToastAction = { label: string; href?: string; onClick?: () => void };
export type Toast = {
  id: number;
  message: string;
  action?: ToastAction;
  tone?: "success" | "info" | "warning";
};

const MAX = 3;
const EMPTY: Toast[] = [];
let toasts: Toast[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, options: Omit<Toast, "id" | "message"> = {}) {
  const item: Toast = { id: nextId++, message, tone: "success", ...options };
  // The same message twice in a row replaces the first instead of stacking.
  toasts = [...toasts.filter((t) => t.message !== message), item].slice(-MAX);
  emit();
  return item.id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
}
