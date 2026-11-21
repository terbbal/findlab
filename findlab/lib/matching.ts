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

/** Words from multi-word research areas that say nothing about the topic. */
const STOPWORDS = new Set(["and", "for", "the", "with", "based", "using", "via", "of", "in", "on", "systems", "system", "technology", "engineering", "science", "sciences", "study", "research", "applications", "application", "analysis", "development", "advanced", "novel"]);

/** Keyword/skill overlap score (no vector DB needed). */
export function scoreLab(lab: Lab, profileText: string): { score: number; hits: string[] } {
  const text = norm(profileText);
  const terms = new Set(
    [...lab.keywords, ...(lab.fields ?? []), ...lab.researchAreas.flatMap((a) => [a, ...a.split(/\s+/)])].map(norm).filter((t) => !STOPWORDS.has(t)),
  );
  const hits: string[] = [];
  let score = 0;
  for (const term of terms) {
    // Hangul terms carry more meaning per character, so 2 syllables (e.g. "로봇") are enough.
    if (term.length < (/[가-힣]/.test(term) ? 2 : 3)) continue;
    // `\b` only works next to ASCII word characters, so use it only when the term starts with one (Korean terms match anywhere).
    const lead = /^\w/.test(term) ? "\\b" : "";
    const re = new RegExp(`${lead}${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
    const n = (text.match(re) ?? []).length;
    if (n > 0) {
      hits.push(term);
      score += (term.includes(" ") ? 2 : 1) * Math.min(n, 4);
    }
  }
  // Drop hits that are part of a longer hit ("deep" when "deep learning" matched), longest first.
  hits.sort((a, b) => b.length - a.length);
  return { score, hits: hits.filter((h, i) => !hits.slice(0, i).some((longer) => longer.includes(h))) };
}

export function applyFilters(labs: Lab[], f: MatchFilters): Lab[] {
  return labs.filter((lab) => {
    // Labs with unknown recruiting info (e.g. imported from DGIST Scholar) stay in — the student can ask.
    const unknown = lab.recruiting.status === "Unknown" && lab.recruiting.types.length === 0;
    if (f.types?.length && !unknown && !f.types.some((t) => lab.recruiting.types.includes(t as never))) return false;
    if (f.style && f.style !== "Any" && lab.style && lab.style !== "Both" && f.style !== "Both" && lab.style !== f.style) return false;
    return true;
  });
}

export function preselect(labs: Lab[], profileText: string, k = 10) {
  return labs
    .map((lab) => {
      const s = scoreLab(lab, profileText);
      // Small tie-breaker for labs known to be recruiting (e.g. 김박사넷 open lab) — only when the topic already matches.
      return { lab, ...s, score: s.score + (s.score > 0 && lab.recruiting.status === "Recruiting" ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
