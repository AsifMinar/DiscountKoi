import { readFileSync } from "node:fs";
import { z } from "zod";
import { CATEGORY_IDS } from "@shared/taxonomy";
import type { DealTypeId } from "@shared/taxonomy";
import type { RawDeal, Source } from "./types";

/*
 * National student programs from data/student-discounts.json (SPC, Prime Student,
 * Spotify Student, GitHub Student Pack…), each linking to its official page. They're
 * permanent programs, so they never age out. No web requests.
 */

export const STUDENT_DISCOUNTS_FILE = "data/student-discounts.json";

export const ProgramSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    store: z.string().trim().min(1).max(80),
    url: z.url({ protocol: /^https$/ }),
    description: z.string().trim().min(1).max(300),
    category: z.enum(CATEGORY_IDS).default("other"),
    where: z.enum(["online", "in-store", "both"]).default("online"),
  })
  .strict();

const WHERE: Record<"online" | "in-store" | "both", DealTypeId[]> = {
  online: ["online"],
  "in-store": ["in-store"],
  both: ["online", "in-store"],
};

/** Turns the file into deals. Bad entries are skipped and reported, the rest still load. */
export function programsToDeals(file: unknown): { deals: RawDeal[]; problems: string[] } {
  const programs = (file as { programs?: unknown })?.programs;
  if (!Array.isArray(programs)) return { deals: [], problems: ['the file has no "programs" list'] };
  const deals: RawDeal[] = [];
  const problems: string[] = [];
  programs.forEach((entry, i) => {
    const parsed = ProgramSchema.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      problems.push(`program #${i + 1}: ${issue.path.join(".") || "entry"}: ${issue.message}`);
      return;
    }
    const p = parsed.data;
    deals.push({
      title: p.title,
      url: p.url,
      store: p.store,
      // National programs: available everywhere in Ontario, Sudbury included.
      location: "ontario",
      description: p.description,
      category: p.category,
      dealType: ["student", ...WHERE[p.where]],
      ongoing: true,
    });
  });
  return { deals, problems };
}

export const studentDiscounts: Source = {
  id: "student-discounts",
  name: "Student programs",
  enabled: true,
  local: true,
  async fetchDeals({ log }) {
    const { deals, problems } = programsToDeals(
      JSON.parse(readFileSync(STUDENT_DISCOUNTS_FILE, "utf8")),
    );
    problems.forEach((p) => log(`skipped ${p}`));
    return deals;
  },
};
