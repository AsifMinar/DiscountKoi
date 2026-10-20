import { loadDeals } from "@/lib/deals.server";

// Written to /deals.json at build time. The browser downloads it for filtering.
export const dynamic = "force-static";

export function GET() {
  return Response.json(loadDeals());
}
