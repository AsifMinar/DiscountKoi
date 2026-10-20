import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DealSchema, DealsFileSchema, type Deal, type DealsFile } from "@shared/deal";
import { isExpired, sortDeals } from "@/lib/filters";
import { torontoDate } from "@/lib/format";

/**
 * Reads /data/deals.json at build time (server only). Every deal is re-checked
 * against the schema and expired deals are dropped, so a bad file can never
 * break the site. Returned in the default "Sudbury first" order.
 */
export function loadDeals(): DealsFile {
  const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), "data", "deals.json"), "utf8"));
  const file = DealsFileSchema.parse(raw);
  const today = torontoDate();

  const deals: Deal[] = [];
  for (const item of file.deals) {
    const result = DealSchema.safeParse(item);
    if (!result.success) {
      console.warn("[deals] skipped invalid deal:", result.error.issues[0]?.message);
      continue;
    }
    if (!isExpired(result.data, today)) deals.push(result.data);
  }

  return { updatedAt: file.updatedAt, deals: sortDeals(deals, "sudbury") };
}
