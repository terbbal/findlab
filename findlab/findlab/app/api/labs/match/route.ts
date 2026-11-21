import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { jsonError, parseBody } from "@/lib/api";
import { fallbacks } from "@/lib/fallbacks";
import { applyFilters, buildProfileText, preselect } from "@/lib/matching";
import { prompts, schemas } from "@/lib/prompts";
import { getProfile, listEntries, listLabs } from "@/lib/storage";
import type { DiaryEntry, Lab, LabMatch, Lang } from "@/lib/types";

const Body = z.object({
  mode: z.enum(["profile", "interests", "cv"]),
  text: z.string().max(12000).optional(),
  lang: z.enum(["ko", "en"]).default("en"),
  filters: z
    .object({
      types: z.array(z.enum(["Undergrad intern", "UGRP", "Grad student"])).optional(),
      style: z.enum(["Computational", "Experimental", "Both", "Any"]).optional(),
    })
    .default({}),
});

const Out = z.object({
  matches: z
    .array(
      z.object({
        labId: z.string(),
        fitScore: z.number(),
        whyItFits: z.array(z.string()).min(1).max(4),
        citedEntryIds: z.array(z.string()).optional().default([]),
        prepare: z.object({ courses: z.array(z.string()).default([]), skills: z.array(z.string()).default([]) }),
      }),
    )
    .min(1),
});

/** Strip internal fields before sending lab records to the model. */
const labForAI = (l: Lab) => ({
  id: l.id,
  name: l.name,
  professor: l.professor,
  researchAreas: l.researchAreas,
  plainSummary: l.plainSummary,
  recentPapers: l.recentPapers.map((p) => p.title),
  recruiting: l.recruiting,
  keywords: l.keywords,
  style: l.style ?? null,
});

function heuristicMatches(
  ranked: { lab: Lab; score: number; hits: string[] }[],
  entries: DiaryEntry[],
  lang: Lang,
  mode: "profile" | "interests" | "cv",
): LabMatch[] {
  const pre = fallbacks().match;
  const ids = new Set(ranked.map((r) => r.lab.id));
  const usable = pre.filter((m) => ids.has(m.labId));
  // Precomputed answers for the demo profile, if they fit the filtered candidates.
  if (usable.length >= Math.min(3, ranked.length) && entries.length) {
    const entryIds = new Set(entries.map((e) => e.id));
    return usable.slice(0, 3).map((m) => ({
      labId: m.labId,
      fitScore: m.fitScore,
      whyItFits: m.whyItFits[lang],
      citedEntryIds: m.citedEntryIds.filter((id) => entryIds.has(id)),
      prepare: m.prepare,
    }));
  }
  const max = Math.max(1, ...ranked.map((r) => r.score));
  return ranked.slice(0, 3).map((r) => {
    const hits = r.hits.slice(0, 3);
    const cited = entries.filter((e) => hits.some((h) => (e.rawNote + " " + e.skills.join(" ")).toLowerCase().includes(h)));
    const why = hits.length
      ? hits.slice(0, 2).map((h) =>
          lang === "ko"
            ? `"${h}" 관련 경험/관심이 이 연구실의 ${r.lab.researchAreas[0]} 연구와 연결돼요.`
            : `Your ${mode === "interests" ? "interest in" : "experience with"} "${h}" connects to their work on ${r.lab.researchAreas[0]}.`,
        )
      : [lang === "ko" ? `${r.lab.researchAreas[0]} 분야를 새로 탐색해 볼 수 있어요.` : `A chance to explore ${r.lab.researchAreas[0]}.`];
    return {
      labId: r.lab.id,
      fitScore: Math.round(55 + (r.score / max) * 35),
      whyItFits: why,
      citedEntryIds: cited.slice(0, why.length).map((e) => e.id),
      prepare: { courses: [], skills: r.lab.researchAreas.slice(0, 2) },
    };
  });
}

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Body);
  if (err) return err;

  const [allLabs, profile, entries] = await Promise.all([listLabs(), getProfile(), listEntries()]);
  const useEntries = body.mode === "profile" ? entries : [];

  let profileText: string;
  if (body.mode === "profile") profileText = buildProfileText(profile, entries);
  else {
    if (!body.text || body.text.trim().length < 2) return jsonError("Please tell us a bit more first.");
    profileText = body.mode === "cv" ? `CV text:\n${body.text}` : `Interests (free text): ${body.text}`;
  }

  const labs = applyFilters(allLabs, body.filters);
  if (labs.length === 0) return NextResponse.json({ matches: [], demoMode: false });
  const ranked = preselect(labs, profileText, 10);
  const candidateIds = new Set(ranked.map((r) => r.lab.id));

  const result = await withFallback(
    async () => {
      const user = `STUDENT PROFILE\n${profileText}\n\nCANDIDATE LABS (JSON)\n${JSON.stringify(ranked.map((r) => labForAI(r.lab)), null, 1)}`;
      const out = Out.parse(await callClaudeJSON(prompts.match(body.lang), user, schemas.match, { maxTokens: 4000 }));
      const entryIds = new Set(useEntries.map((e) => e.id));
      const matches = out.matches
        .filter((m) => candidateIds.has(m.labId))
        .slice(0, 3)
        .map((m) => ({
          ...m,
          fitScore: Math.max(0, Math.min(100, Math.round(m.fitScore))),
          citedEntryIds: m.citedEntryIds.filter((id) => entryIds.has(id)),
        }));
      if (!matches.length) throw new Error("AI returned no valid lab ids");
      return { matches };
    },
    () => ({ matches: heuristicMatches(ranked, useEntries, body.lang, body.mode) }),
    "match",
  );

  // Attach full lab records + cited entries for the UI.
  const byId = new Map(allLabs.map((l) => [l.id, l]));
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const matches = result.matches
    .map((m) => ({
      ...m,
      lab: byId.get(m.labId)!,
      citedEntries: (m.citedEntryIds ?? [])
        .map((id) => entryById.get(id))
        .filter(Boolean)
        .map((e) => ({ id: e!.id, date: e!.date, bullet: e!.cvBulletEdited || e!.cvBullet })),
    }))
    .filter((m) => m.lab)
    .sort((a, b) => b.fitScore - a.fitScore);

  return NextResponse.json({ matches, demoMode: result.demoMode });
}
