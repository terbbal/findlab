import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { fallbacks } from "@/lib/fallbacks";
import { prompts, schemas } from "@/lib/prompts";
import type { DiaryEntry, Profile } from "@/lib/types";

const Body = z.object({
  lang: z.enum(["ko", "en"]).default("en"),
  profile: z.object({ interests: z.array(z.string()) }).passthrough(),
  entries: z.array(z.object({ id: z.string(), date: z.string(), category: z.string(), skills: z.array(z.string()) }).passthrough()).max(500),
});

const Out = z.object({
  oneLineIntro: z.string(),
  topSkills: z.array(z.object({ name: z.string(), level: z.number() })).max(8),
  interests: z.array(z.string()).max(6),
  bestProjects: z.array(z.string()).max(5),
});

const WEIGHT: Record<string, number> = { Project: 2, Award: 2, Research: 2.5, Course: 1, Club: 1, Volunteer: 1, Other: 0.5 };

/** Deterministic skill levels: frequency × strength of the entries the skill appears in. */
function computeSkills(entries: DiaryEntry[]) {
  const score = new Map<string, number>();
  const soft = /teamwork|leadership|communication|teaching|presentation|design/i;
  for (const e of entries)
    for (const s of e.skills)
      score.set(s, (score.get(s) ?? 0) + ((WEIGHT[e.category] ?? 1) + (e.highlight ? 1 : 0)) * (soft.test(s) ? 0.6 : 1));
  const sorted = Array.from(score.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([name, v]) => ({ name, level: Math.max(1, Math.min(4, Math.round((v / max) * 4))) as 1 | 2 | 3 | 4 }));
}

function bestProjects(entries: DiaryEntry[]) {
  return [...entries]
    .sort((a, b) => Number(Boolean(b.highlight)) - Number(Boolean(a.highlight)) || (WEIGHT[b.category] ?? 0) - (WEIGHT[a.category] ?? 0) || b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((e) => e.id);
}

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const [body, err] = await parseBody(req, Body);
  if (err) return err;
  const profile = body.profile as unknown as Profile;
  const entries = body.entries as unknown as DiaryEntry[];
  const ids = new Set(entries.map((e) => e.id));

  const result = await withFallback(
    async () => {
      const user = `Stated interests: ${profile.interests.join(", ")}\nEntries (JSON):\n${JSON.stringify(
        entries.map((e) => ({ id: e.id, date: e.date, category: e.category, skills: e.skills, bullet: e.cvBulletEdited || e.cvBullet, highlight: Boolean(e.highlight) })),
      )}`;
      const out = Out.parse(await callClaudeJSON(prompts.namecard(body.lang), user, schemas.namecard, { maxTokens: 2000 }));
      return {
        oneLineIntro: out.oneLineIntro,
        topSkills: out.topSkills.slice(0, 5).map((s) => ({ name: s.name, level: Math.max(1, Math.min(4, Math.round(s.level))) as 1 | 2 | 3 | 4 })),
        interests: out.interests.slice(0, 4),
        bestProjects: out.bestProjects.filter((id) => ids.has(id)).slice(0, 3),
      };
    },
    () => ({
      oneLineIntro: profile.oneLineIntro || fallbacks().namecard[body.lang].oneLineIntro,
      topSkills: computeSkills(entries),
      interests: profile.interests,
      bestProjects: bestProjects(entries),
    }),
    "namecard",
  );

  const { demoMode, ...fields } = result;
  return NextResponse.json({ fields, demoMode });
}
