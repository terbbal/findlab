import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { jsonError, parseBody } from "@/lib/api";
import { getLab } from "@/lib/labs";
import { rateLimit } from "@/lib/ratelimit";
import { readiness } from "@/lib/readiness";
import { rank } from "@/lib/tfidf";
import type { Lab, Lang } from "@/lib/types";

const Entry = z.object({ id: z.string(), date: z.string(), category: z.string(), skills: z.array(z.string()), rawNote: z.string() }).passthrough();
const Body = z.object({
  mode: z.enum(["diary", "interests", "cv"]),
  text: z.string().max(3000).optional(),
  cvText: z.string().max(12000).optional(),
  interests: z.array(z.string()).max(20).default([]),
  entries: z.array(Entry).max(500).default([]),
  department: z.string().nullable().optional(),
  purpose: z.enum(["Undergrad intern", "UGRP", "Grad school"]).default("Undergrad intern"),
  labId: z.string().optional(),
  lang: z.enum(["ko", "en"]).default("en"),
});

const Out = z.object({
  matches: z.array(
    z.object({
      labId: z.string(),
      fitScore: z.number(),
      whyItFits: z.array(z.string()).min(1).max(4),
      citedEntryIds: z.array(z.string()).optional().default([]),
    }),
  ),
});

const SYSTEM = (lang: Lang, purpose: string) => `You are finD Lab's assistant for DGIST undergraduate students.
Output language: ${lang === "ko" ? "Korean (한국어) for all human-readable strings" : "English"}.
Honesty rules: use ONLY the student profile and the lab records given. Never invent facts about labs, papers, people or recruiting. Never write content on the student's behalf.
Task: rerank the candidate labs for a student looking for: ${purpose}. Choose the best ones and return them ordered.
- fitScore: integer 0–100, honest and differentiated.
- whyItFits: 2–3 short points. EACH point must name something specific from the student (a diary entry or a stated interest) AND something specific from that lab's record (an interest, the lab description, or a paper title). Plain language, no jargon.
- citedEntryIds: the diary entry ids referenced (copy exactly), [] if none.
- Only use labIds from the candidates.
Return only valid JSON, no markdown.`;

const labForAI = (l: Lab) => ({
  labId: l.id,
  professor: l.professor.nameEn ?? l.professor.nameKo,
  department: l.department,
  labName: l.labName,
  interests: l.researchInterests,
  description: l.labDescription?.slice(0, 600) ?? null,
  recentPapers: l.recentPapers.map((p) => ({ title: p.title, year: p.year })),
});

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Body);
  if (err) return err;

  const entries = body.entries;
  const userSkills = Array.from(new Set(entries.flatMap((e) => e.skills)));
  const profileText =
    body.mode === "diary"
      ? [...body.interests, ...body.interests, ...userSkills, ...entries.map((e) => `${e.rawNote} ${e.skills.join(" ")}`)].join(" ")
      : body.mode === "cv"
        ? `${body.cvText ?? ""} ${body.interests.join(" ")}`
        : `${body.text ?? ""} ${body.interests.join(" ")}`;
  if (profileText.trim().length < 3)
    return jsonError(
      body.mode === "diary" ? "Add a few diary entries first (or use 'Tell me your interests')." : body.mode === "cv" ? "Upload or paste your CV first." : "Tell us a bit about your interests first.",
    );

  // CV mode: count a lab skill as "have" when it is named in the student's CV text
  const cvNorm = (body.cvText ?? "").toLowerCase().replace(/[^a-z0-9가-힣+#]/g, "");
  const cvSkillsFor = (lab: Lab) => (lab.inferredSkills ?? []).map((s) => s.name).filter((n) => {
    const k = n.toLowerCase().replace(/[^a-z0-9가-힣+#]/g, "");
    return k.length > 1 && cvNorm.includes(k);
  });

  const ranked = rank(profileText, { department: body.department, limit: body.labId ? 400 : 15 });
  const enrich = (lab: Lab, extra: { fitScore: number; whyItFits: string[]; citedEntryIds: string[] }) => ({
    ...extra,
    lab: {
      id: lab.id,
      professor: lab.professor,
      department: lab.department,
      labName: lab.labName,
      labWebsite: lab.labWebsite,
      researchInterests: lab.researchInterests.slice(0, 6),
      recentPapers: lab.recentPapers.map((p) => ({ title: p.title, year: p.year, url: p.url })),
      recruiting: lab.recruiting,
    },
    readiness: readiness(lab, body.mode === "cv" ? cvSkillsFor(lab) : userSkills),
    citedEntries: extra.citedEntryIds
      .map((id) => entries.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => ({ id: e!.id, date: e!.date, text: e!.rawNote })),
  });

  const studentBlock = `STUDENT (${body.mode === "diary" ? "from their diary" : body.mode === "cv" ? "from their own CV" : "free-text interests"})
Interests: ${body.interests.join(", ") || "—"}
${body.mode === "interests" ? `Says: ${body.text}` : body.mode === "cv" ? `CV text (written by the student; cite specific items from it):\n${(body.cvText ?? "").slice(0, 6000)}` : `Skills: ${userSkills.join(", ")}\nEntries:\n${entries.slice(0, 25).map((e) => `- [${e.id}] (${e.category}) ${e.rawNote}`).join("\n")}`}`;

  const fallbackWhy = (r: (typeof ranked)[number]) => {
    // only terms that appear in the lab's own interests/keywords (avoids noise like "made", "weather")
    const vocab = [...r.lab.researchInterests, ...(r.lab.keywords ?? []), ...r.lab.recentPapers.flatMap((p) => p.keywords ?? [])].join(" ").toLowerCase();
    const terms = r.shared.filter((t) => t.length > 2 && vocab.includes(t)).slice(0, 3);
    const cited = entries.filter((e) => terms.some((t) => `${e.rawNote} ${e.skills.join(" ")}`.toLowerCase().includes(t))).slice(0, 2);
    const why = terms.length
      ? [
          body.lang === "ko"
            ? `공통 키워드: ${terms.join(", ")} — 이 연구실의 연구 분야(${r.lab.researchInterests.slice(0, 2).join(", ")})와 겹쳐요.`
            : `Shared keywords: ${terms.join(", ")} — overlaps with their work on ${r.lab.researchInterests.slice(0, 2).join(", ")}.`,
          ...cited.map((e) => (body.lang === "ko" ? `내 기록 "${e.rawNote.slice(0, 60)}"과 관련이 있어요.` : `Related to your entry “${e.rawNote.slice(0, 60)}”.`)),
        ]
      : [body.lang === "ko" ? "키워드가 겹치는 부분이 적어요 — 새 분야를 탐색해 볼 기회예요." : "Few shared keywords — a chance to explore a new field."];
    return { why, cited: cited.map((e) => e.id) };
  };

  // Single-lab fit ("Check my fit" from a lab page)
  if (body.labId) {
    const lab = getLab(body.labId);
    if (!lab) return jsonError("Lab not found.", 404);
    const pos = ranked.findIndex((r) => r.lab.id === lab.id);
    const r = ranked[pos];
    const pctile = pos >= 0 ? Math.round(100 - (pos / Math.max(1, ranked.length)) * 100) : 0;
    const limited = rateLimit(req);
    const result = limited
      ? { matches: [], demoMode: true }
      : await withFallback(
          async () =>
            Out.parse(
              await callClaudeJSON(SYSTEM(body.lang, body.purpose), `${studentBlock}\n\nCANDIDATE LAB (JSON):\n${JSON.stringify([labForAI(lab)])}`, `{ "matches": [ { "labId": string, "fitScore": number, "whyItFits": string[], "citedEntryIds": string[] } ] }`, { maxTokens: 2000 }),
            ),
          () => ({ matches: [] as z.infer<typeof Out>["matches"] }),
          "fit",
        );
    const m = result.matches.find((x) => x.labId === lab.id);
    const fb = r ? fallbackWhy(r) : { why: [], cited: [] };
    return NextResponse.json({
      single: enrich(lab, {
        fitScore: m ? Math.round(m.fitScore) : Math.max(20, Math.min(95, pctile)),
        whyItFits: m?.whyItFits ?? fb.why,
        citedEntryIds: m?.citedEntryIds ?? fb.cited,
      }),
      percentile: pctile,
      demoMode: !m,
    });
  }

  if (!ranked.length || ranked[0].score === 0) return NextResponse.json({ matches: [], more: [], demoMode: false });
  const ids = new Set(ranked.map((r) => r.lab.id));
  const limited = rateLimit(req);
  if (limited) return limited;

  const result = await withFallback(
    async () => {
      const out = Out.parse(
        await callClaudeJSON(
          SYSTEM(body.lang, body.purpose),
          `${studentBlock}\n\nCANDIDATE LABS (JSON, pre-ranked by keyword similarity):\n${JSON.stringify(ranked.map((r) => labForAI(r.lab)))}`,
          `{ "matches": [ { "labId": string, "fitScore": number, "whyItFits": string[], "citedEntryIds": string[] } ] }`,
          { maxTokens: 4000 },
        ),
      );
      const ok = out.matches.filter((m) => ids.has(m.labId)).slice(0, 3);
      if (!ok.length) throw new Error("no valid labIds");
      return { matches: ok };
    },
    () => {
      const max = ranked[0].score || 1;
      return {
        matches: ranked.slice(0, 3).map((r) => {
          const fb = fallbackWhy(r);
          return { labId: r.lab.id, fitScore: Math.round(55 + (r.score / max) * 37), whyItFits: fb.why, citedEntryIds: fb.cited };
        }),
      };
    },
    "find",
  );

  const top = result.matches.map((m) => enrich(getLab(m.labId)!, { fitScore: Math.max(0, Math.min(100, Math.round(m.fitScore))), whyItFits: m.whyItFits, citedEntryIds: m.citedEntryIds ?? [] }));
  const topIds = new Set(top.map((t) => t.lab.id));
  const more = ranked
    .filter((r) => !topIds.has(r.lab.id))
    .slice(0, 10)
    .map((r) => ({ id: r.lab.id, name: r.lab.professor.nameEn ?? r.lab.professor.nameKo, nameKo: r.lab.professor.nameKo, labName: r.lab.labName, department: r.lab.department, photoUrl: r.lab.professor.photoUrl }));
  return NextResponse.json({ matches: top, more, demoMode: result.demoMode });
}
