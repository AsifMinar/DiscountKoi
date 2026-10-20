import type { Metadata } from "next";
import { DealExplorer } from "@/components/DealExplorer";
import { PageHero, PageShell } from "@/components/PageHero";
import { explorerData } from "@/lib/deals.server";

export const metadata: Metadata = {
  title: "Student discounts",
  description:
    "Student discounts for Laurentian, Cambrian and Collège Boréal students in Sudbury, plus SPC, Apple Education, Prime Student, Spotify Student and more.",
};

export default function StudentPage() {
  const { updatedAt, isSample, explorer } = explorerData("student");
  return (
    <PageShell>
      <PageHero title="Student discounts" updatedAt={updatedAt} isSample={isSample}>
        For Laurentian, Cambrian and Collège Boréal students, SPC members, and anyone with a valid
        student ID.
      </PageHero>
      <DealExplorer {...explorer} />
    </PageShell>
  );
}
