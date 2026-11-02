import { priceInfo } from "@/lib/deals.server";

// Written to /price-info.json at build time: past prices and Ontario averages for the
// "good deal" meter. The browser only downloads it when a product popup opens.
export const dynamic = "force-static";

export function GET() {
  return Response.json(priceInfo());
}
