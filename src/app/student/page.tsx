import type { Metadata } from "next";
import { DealExplorer } from "@/components/DealExplorer";
import { PageHero, PageShell } from "@/components/PageHero";
import { explorerData } from "@/lib/deals.server";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Student discounts in Sudbury",
  description:
    "Student discounts for Laurentian, Cambrian and Collège Boréal students in Sudbury: SPC, Prime Student, Spotify Student, Apple education pricing, free software and more.",
  path: "student/",
});

export default function StudentPage() {
  const { updatedAt, explorer } = explorerData("student");
  return (
    <PageShell>
      <PageHero title="Student discounts" updatedAt={updatedAt}>
        For Laurentian, Cambrian and Collège Boréal students, SPC members, and anyone with a valid
        student ID.
      </PageHero>
      <DealExplorer {...explorer} />
    </PageShell>
  );
}
