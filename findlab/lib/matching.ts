import "server-only";
import type { DiaryEntry, Lab, Profile } from "./types";

export type MatchFilters = { types?: string[]; style?: "Computational" | "Experimental" | "Both" | "Any" };

/** Profile text used for matching + sent to the AI. */
export function buildProfileText(profile: Profile, entries: DiaryEntry[]): string {
  const skillCounts = new Map<string, number>();
  entries.forEach((e) => e.skills.forEach((s) => skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1)));
  const skills = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `${s} (${n})`)
    .join(", ");
  const top = [...entries]
    .sort((a, b) => Number(Boolean(b.highlight)) - Number(Boolean(a.highlight)) || b.date.localeCompare(a.date))
    .slice(0, 14)
    .map((e) => `- [${e.id}] (${e.category}, ${e.date}) ${e.cvBulletEdited || e.cvBullet} | note: ${e.rawNote}`)
    .join("\n");
  return `Name: ${profile.name} (${profile.year})
Interests: ${profile.interests.join(", ")}
Skills (count of entries): ${skills}
Entries:
${top}`;
}

const norm = (s: string) => s.toLowerCase();

/** Keyword/skill overlap score (no vector DB needed). */
export function scoreLab(lab: Lab, profileText: string): { score: number; hits: string[] } {
  const text = norm(profileText);
  const terms = new Set([...lab.keywords, ...lab.researchAreas.flatMap((a) => [a, ...a.split(/\s+/)])].map(norm));
  const hits: string[] = [];
  let score = 0;
  for (const term of terms) {
    if (term.length < 3) continue;
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
    const n = (text.match(re) ?? []).length;
    if (n > 0) {
      hits.push(term);
      score += (term.includes(" ") ? 2 : 1) * Math.min(n, 4);
    }
  }
  return { score, hits };
}

export function applyFilters(labs: Lab[], f: MatchFilters): Lab[] {
  return labs.filter((lab) => {
    if (f.types?.length && !f.types.some((t) => lab.recruiting.types.includes(t as never))) return false;
    if (f.style && f.style !== "Any" && lab.style && lab.style !== "Both" && f.style !== "Both" && lab.style !== f.style) return false;
    return true;
  });
}

export function preselect(labs: Lab[], profileText: string, k = 10) {
  return labs
    .map((lab) => ({ lab, ...scoreLab(lab, profileText) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
