import "server-only";
import fs from "fs";
import path from "path";
import type { Category, Lang } from "./types";

type Fallbacks = {
  enhance: { match: string[]; category: Category; skills: string[]; bullet: Record<Lang, string> }[];
  gaps: Record<Lang, { title: string; message: string; suggestedAction: string; relatedOpportunityId: string | null }[]>;
  namecard: Record<Lang, { oneLineIntro: string }>;
  match: { labId: string; fitScore: number; whyItFits: Record<Lang, string[]>; citedEntryIds: string[]; prepare: { courses: string[]; skills: string[] } }[];
  mail: Record<Lang, { subject: string; body: string }>;
  mailLinks: Record<string, Record<Lang, [string, string]>>;
  summarize: Record<Lang, { summary: string; sentiment: "positive" | "neutral" | "negative"; nextSteps: string[] }>;
};

let cache: Fallbacks | null = null;
export function fallbacks(): Fallbacks {
  if (!cache) cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/sample/ai_fallbacks.json"), "utf8"));
  return cache!;
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

/* ---------- Diary enhancement (heuristic when no precomputed match) ---------- */

const SKILL_WORDS: [RegExp, string][] = [
  [/python|파이썬/i, "Python"], [/pandas/i, "pandas"], [/numpy/i, "NumPy"], [/pytorch/i, "PyTorch"], [/tensorflow/i, "TensorFlow"],
  [/opencv/i, "OpenCV"], [/\bml\b|machine learning|머신러닝|딥러닝|deep learning/i, "Machine learning"], [/arduino|아두이노/i, "Arduino"],
  [/\bc\+\+/i, "C++"], [/\bros\b/i, "ROS"], [/react/i, "React"], [/matlab/i, "MATLAB"], [/sensor|센서/i, "Sensors"],
  [/robot|로봇/i, "Robotics"], [/team|팀/i, "Teamwork"], [/present|발표/i, "Presentation"], [/report|보고서|writing/i, "Scientific writing"],
  [/microscop|현미경/i, "Microscopy"], [/data|데이터/i, "Data analysis"], [/teach|가르|mentor/i, "Teaching"], [/lead|리더|organiz/i, "Leadership"],
];

const CATEGORY_RULES: [RegExp, Category][] = [
  [/research|ugrp|lab intern|연구실|연구 인턴/i, "Research"],
  [/award|prize|place|won|수상|입상/i, "Award"],
  [/volunteer|봉사/i, "Volunteer"],
  [/club|동아리|study group|스터디/i, "Club"],
  [/assignment|homework|course|class|lecture|lab report|quiz|exam|과제|수업|강의/i, "Course"],
  [/project|built|made|develop|prototype|hackathon|프로젝트|만들|개발|해커톤/i, "Project"],
];

const VERBS: [RegExp, string][] = [
  [/^(i\s+)?(finished|completed|done with)\s+/i, "Completed "],
  [/^(i\s+)?(made|built|created)\s+/i, "Built "],
  [/^(i\s+)?(started|began)\s+/i, "Started "],
  [/^(i\s+)?(attended|went to)\s+/i, "Attended "],
  [/^(i\s+)?(wrote)\s+/i, "Wrote "],
  [/^(i\s+)?(led|organized)\s+/i, "Organized "],
  [/^(i\s+)?(learned|studied)\s+/i, "Studied "],
];

export function heuristicEnhance(note: string, lang: Lang): { category: Category; skills: string[]; cvBullet: string } {
  const lower = note.toLowerCase();
  const pre = fallbacks().enhance.find((f) => f.match.some((m) => lower.includes(m.toLowerCase())));
  if (pre && pre.match[0] === "gesture") return { category: pre.category, skills: pre.skills, cvBullet: pre.bullet[lang] };

  const category = CATEGORY_RULES.find(([re]) => re.test(note))?.[1] ?? pre?.category ?? "Other";
  const skills = Array.from(new Set(SKILL_WORDS.filter(([re]) => re.test(note)).map(([, s]) => s))).slice(0, 5);

  let text = note.trim().replace(/^today,?\s*/i, "").replace(/[.!?。]+$/, "");
  if (lang === "en") {
    const verb = VERBS.find(([re]) => re.test(text));
    text = verb ? verb[1] + text.replace(verb[0], "") : "Worked on " + text.replace(/^i\s+/i, "");
    text = text.charAt(0).toUpperCase() + text.slice(1);
    const words = text.split(/\s+/);
    if (words.length > 25) text = words.slice(0, 25).join(" ");
    return { category, skills, cvBullet: text + "." };
  }
  return { category, skills, cvBullet: text.length > 60 ? text.slice(0, 60) + "…" : text + " (활동 기록)" };
}
