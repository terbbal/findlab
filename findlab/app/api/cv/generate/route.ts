import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api";
import { readSample } from "@/lib/storage";
import { CATEGORIES, type DiaryEntry, type Lang, type Profile } from "@/lib/types";

const TEMPLATES = ["Undergrad research intern", "UGRP application", "General"] as const;

const Body = z.object({
  lang: z.enum(["ko", "en"]).default("en"),
  template: z.enum(TEMPLATES).default("Undergrad research intern"),
  profile: z.object({ name: z.string(), nameKo: z.string().optional(), email: z.string(), year: z.string(), userId: z.string(), interests: z.array(z.string()), interestsKo: z.array(z.string()).optional() }).passthrough(),
  entries: z.array(z.object({ id: z.string(), date: z.string(), category: z.enum(CATEGORIES as [string, ...string[]]), skills: z.array(z.string()), rawNote: z.string(), cvBullet: z.string(), cvBulletEdited: z.string().optional() }).passthrough()).max(500),
});

type CVBody = { summary: string[]; researchProjects: string[]; courses: string[]; activitiesAwards: string[]; skills: { group: string; items: string[] }[] };

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

/** The student's own words, grouped into CV sections — no AI rewriting (v3 rule). */
function buildCV(entries: DiaryEntry[], lang: Lang, template: string, interests: string[]): CVBody {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const pick = (cats: string[]) => sorted.filter((e) => cats.includes(e.category)).map(b);
  const focus = interests.join(lang === "ko" ? "·" : ", ");
  return {
    summary: focus ? [lang === "ko" ? `관심 분야: ${focus}` : `Interests: ${focus}`] : [],
    researchProjects: pick(["Research", "Project"]),
    courses: pick(["Course"]),
    activitiesAwards: pick(["Award", "Club", "Volunteer", "Other"]),
    skills: groupSkills(sorted, lang),
  };
}

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Body);
  if (err) return err;
  const profile = body.profile as unknown as Profile;
  const entries = body.entries as unknown as DiaryEntry[];
  const courses = await readSample<{ code: string; title: string }[]>("courses", []);
  const interests = body.lang === "ko" && profile.interestsKo?.length ? profile.interestsKo : profile.interests;
  return NextResponse.json({
    ...buildCV(entries, body.lang, body.template, interests),
    changes: [],
    demoMode: false,
    header: {
      name: body.lang === "ko" && profile.nameKo ? `${profile.nameKo} (${profile.name})` : profile.name,
      email: profile.email,
      year: profile.year,
      namecard: `/cv/namecard/${profile.userId}`,
    },
    education: {
      school: body.lang === "ko" ? "DGIST (대구경북과학기술원) 기초학부" : "DGIST (Daegu Gyeongbuk Institute of Science and Technology)",
      detail: body.lang === "ko" ? "학사 과정" : "B.S. program, School of Undergraduate Studies",
      courses: courses.map((c) => c.title),
    },
    template: body.template,
    targetLab: null,
  });
}
