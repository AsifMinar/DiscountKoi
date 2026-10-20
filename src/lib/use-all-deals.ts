import { useEffect, useState } from "react";
import type { Deal, DealsFile } from "@shared/deal";

const DEALS_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/deals.json`;

// One request per page load, shared by every component that asks.
let request: Promise<Deal[]> | null = null;

function loadAllDeals(): Promise<Deal[]> {
  request ??= fetch(DEALS_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`deals.json responded ${res.status}`);
      return res.json() as Promise<DealsFile>;
    })
    .then((file) => file.deals)
    .catch((error: unknown) => {
      request = null; // allow a retry next time
      throw error;
    });
  return request;
}

/**
 * The full deal list. The page's HTML only carries the first screen of deals;
 * the rest arrives as one JSON file right after the page loads. Pass `false` when
 * the page already has everything it needs, and nothing is downloaded.
 */
export function useAllDeals(enabled = true): { deals: Deal[] | null; failed: boolean } {
  const [state, setState] = useState<{ deals: Deal[] | null; failed: boolean }>({
    deals: null,
    failed: false,
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadAllDeals().then(
      (deals) => active && setState({ deals, failed: false }),
      () => active && setState({ deals: null, failed: true }),
    );
    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}
