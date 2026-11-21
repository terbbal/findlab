import "server-only";
import labsData from "@/data/labs.json";
import metaData from "@/data/labs_meta.json";
import type { Lab, LabIndexItem } from "./types";

// Static JSON bundled at build time: works on Vercel (read-only FS) and offline.
const LABS = (labsData as unknown as Lab[]).filter((l) => l && (l as Lab).scholarUrl);
const BY_ID = new Map(LABS.map((l) => [l.id, l]));

export type LabsMeta = { source: string; sourceUrl: string; crawledAt: string; researchers: number; withLab: number; withPapers: number };
export const labsMeta = metaData as unknown as LabsMeta;

export function allLabs(): Lab[] {
  return LABS;
}

export function getLab(id: string): Lab | null {
  return BY_ID.get(id) ?? null;
}

/** Enough data to say something meaningful about fit. */
export function isMatchable(l: Lab): boolean {
  const papers = l.recentPapers.filter((p) => p.abstract || p.title).length;
  return (l.researchInterests.length >= 2 || Boolean(l.labDescription)) && (papers >= 1 || l.researchInterests.length >= 4);
}

export function displayName(l: Pick<Lab, "professor">, lang: "ko" | "en" = "en"): string {
  const { nameKo, nameEn } = l.professor;
  return (lang === "ko" ? nameKo || nameEn : nameEn || nameKo) ?? "Not listed";
}

export function toIndexItem(l: Lab): LabIndexItem {
  return {
    id: l.id,
    nameKo: l.professor.nameKo,
    nameEn: l.professor.nameEn,
    photoUrl: l.professor.photoUrl,
    department: l.department,
    labName: l.labName,
    interests: l.researchInterests,
    keywords: l.keywords ?? [],
    paperTitles: l.recentPapers.map((p) => p.title),
    publicationCount: l.publicationCount,
    latestYear: l.recentPapers.reduce<number | null>((m, p) => (p.year && (!m || p.year > m) ? p.year : m), null),
    hasWebsite: Boolean(l.labWebsite),
    matchable: isMatchable(l),
  };
}

let _index: LabIndexItem[] | null = null;
export function labIndex(): LabIndexItem[] {
  if (!_index) _index = LABS.map(toIndexItem);
  return _index;
}
