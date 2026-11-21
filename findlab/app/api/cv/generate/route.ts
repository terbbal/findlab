import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { jsonError, parseBody } from "@/lib/api";
import { scoreLab } from "@/lib/matching";
import { prompts, schemas } from "@/lib/prompts";
import { getLab, getProfile, listEntries, readSample } from "@/lib/storage";
import type { DiaryEntry, Lab, Lang } from "@/lib/types";

const TEMPLATES = ["Undergrad research intern", "UGRP application", "General"] as const;

const Body = z.object({
  lang: z.enum(["ko", "en"]).default("en"),
  template: z.enum(TEMPLATES).default("Undergrad research intern"),
  targetLabId: z.string().optional().nullable(),
});

const Out = z.object({
  summary: z.array(z.string()).min(1).max(3),
  researchProjects: z.array(z.string()),
  courses: z.array(z.string()),
  activitiesAwards: z.array(z.string()),
  skills: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
  changes: z.array(z.string()).default([]),
});

type CVBody = z.infer<typeof Out>;

const b = (e: DiaryEntry) => e.cvBulletEdited || e.cvBullet;

function groupSkills(entries: DiaryEntry[], lang: Lang) {
  const counts = new Map<string, number>();
  entries.forEach((e) => e.skills.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
  const all = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const soft = /teamwork|leadership|communication|teaching|presentation|writing|design/i;
  const tech = all.filter((s) => !soft.test(s));
  const softs = all.filter((s) => soft.test(s));
  return [
    { group: lang === "ko" ? "기술" : "Technical", items: tech.slice(0, 12) },
    { group: lang === "ko" ? "소프트 스킬" : "Soft skills", items: softs.slice(0, 6) },
  ].filter((g) => g.items.length);
}

function deterministicCV(entries: DiaryEntry[], lang: Lang, template: string, lab: Lab | null, interests: string[]): CVBody {
  let sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const changes: string[] = [];
  if (lab) {
    const scored = sorted.map((e) => ({ e, s: scoreLab(lab, `${e.rawNote} ${b(e)} ${e.skills.join(" ")}`).score }));
    const before = sorted.filter((e) => e.category === "Project" || e.category === "Research").map((e) => e.id);
    sorted = scored.sort((x, y) => y.s - x.s || y.e.date.localeCompare(x.e.date)).map((x) => x.e);
    const after = sorted.filter((e) => e.category === "Project" || e.category === "Research");
    const moved = after.filter((e, i) => before.indexOf(e.id) > i).slice(0, 3);
    moved.forEach((e) =>
      changes.push(
        lang === "ko"
          ? `"${b(e).slice(0, 40)}…" 항목을 위로 올렸어요 (${lab.researchAreas[0]} 관련).`
          : `Moved “${b(e).slice(0, 48)}…” up — relevant to ${lab.researchAreas[0]}.`,
      ),
    );
    const top = scored.filter((x) => x.s > 0).flatMap((x) => x.e.skills);
    if (top.length)
      changes.push(
        lang === "ko"
          ? `스킬 목록에서 ${Array.from(new Set(top)).slice(0, 3).join(", ")}을(를) 앞쪽에 배치했어요.`
          : `Put ${Array.from(new Set(top)).slice(0, 3).join(", ")} first in Skills.`,
      );
    changes.push(lang === "ko" ? "새로운 사실은 추가하지 않았어요." : "No new facts were added — only order and emphasis changed.");
  }
  const pick = (cats: string[]) => sorted.filter((e) => cats.includes(e.category)).map(b);
  const skills = groupSkills(sorted, lang);
  if (lab) {
    const rel = new Set(sorted.slice(0, 4).flatMap((e) => e.skills));
    skills.forEach((g) => g.items.sort((x, y) => Number(rel.has(y)) - Number(rel.has(x))));
  }
  const focus = lab ? lab.researchAreas.slice(0, 2).join(lang === "ko" ? "·" : " & ") : interests.join(lang === "ko" ? "·" : ", ");
  const summary =
    lang === "ko"
      ? [`${focus}에 관심 있는 DGIST 학부생으로, 직접 만들고 실험하며 배우는 것을 좋아합니다.`, template === "UGRP application" ? "팀 프로젝트와 스터디를 이끈 경험이 있으며 첫 연구 프로젝트를 찾고 있습니다." : "하드웨어와 머신러닝 프로젝트 경험을 바탕으로 학부 연구 인턴 기회를 찾고 있습니다."]
      : [`DGIST undergraduate interested in ${focus}, who learns best by building and testing things.`, template === "UGRP application" ? "Experienced in leading team projects and study groups; looking for a first group research project." : "Hands-on experience with hardware and ML projects; seeking an undergraduate research internship."];
  return {
    summary,
    researchProjects: pick(["Research", "Project"]),
    courses: pick(["Course"]),
    activitiesAwards: pick(["Award", "Club", "Volunteer", "Other"]),
    skills,
    changes,
  };
}

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Body);
  if (err) return err;
  const [profile, entries, courses] = await Promise.all([
    getProfile(),
    listEntries(),
    readSample<{ code: string; title: string }[]>("courses", []),
  ]);
  const lab = body.targetLabId ? await getLab(body.targetLabId) : null;
  if (body.targetLabId && !lab) return jsonError("Lab not found.", 404);

  const result = await withFallback(
    async () => {
      const user = `TEMPLATE: ${body.template}
STUDENT: ${profile.name}, ${profile.year}. Interests: ${profile.interests.join(", ")}
ENTRIES (JSON): ${JSON.stringify(entries.map((e) => ({ id: e.id, date: e.date, category: e.category, skills: e.skills, bullet: b(e), highlight: Boolean(e.highlight) })))}
${lab ? `TARGET LAB (JSON): ${JSON.stringify({ name: lab.name, researchAreas: lab.researchAreas, plainSummary: lab.plainSummary, keywords: lab.keywords })}` : "No target lab."}`;
      const out = Out.parse(await callClaudeJSON(prompts.cv(body.lang, body.template, Boolean(lab)), user, schemas.cv, { maxTokens: 5000 }));
      return { ...out, changes: lab ? out.changes : [] };
    },
    () => deterministicCV(entries, body.lang, body.template, lab, body.lang === "ko" && profile.interestsKo?.length ? profile.interestsKo : profile.interests),
    "cv",
  );

  return NextResponse.json({
    ...result,
    header: {
      name: body.lang === "ko" && profile.nameKo ? `${profile.nameKo} (${profile.name})` : profile.name,
      email: profile.email,
      year: profile.year,
      namecard: `/cv/namecard/${profile.userId}`,
    },
    education: {
      school: body.lang === "ko" ? "DGIST (대구경북과학기술원) 기초학부" : "DGIST (Daegu Gyeongbuk Institute of Science and Technology)",
      detail: body.lang === "ko" ? "학사 과정 · 2025.03 – 현재 (샘플)" : "B.S. program, School of Undergraduate Studies · Mar 2025 – present (sample)",
      courses: courses.map((c) => c.title),
    },
    template: body.template,
    targetLab: lab ? { id: lab.id, name: lab.name } : null,
  });
}
