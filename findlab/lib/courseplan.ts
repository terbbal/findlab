/**
 * Course plan: interested labs → skills they use → DGIST courses that teach them → semester plan.
 * Pure functions (no I/O) so the roadmap page can recompute instantly in the browser.
 */
import type { Course, Lab, Skill } from "./types";

export type Season = "봄" | "가을";
export interface PlanSettings {
  /** Current grade (1–4) and semester (1 = spring, 2 = fall). Planning starts with the NEXT semester. */
  grade: number;
  semester: 1 | 2;
  completed: string[];
  maxCredits: number;
}

export interface PlanSkill {
  name: string;
  importance: "core" | "helpful";
  labIds: string[];
  courses: string[];
  /** done-course: a completed course covers it · done-diary: shown in the diary · planned: a planned course covers it
   *  external: no DGIST course · unscheduled: has courses but none fit in the remaining semesters */
  status: "done-course" | "done-diary" | "planned" | "external" | "unscheduled";
  by: string | null; // course code (or null)
}
export interface PlanCourse {
  code: string;
  course: Course;
  skills: string[]; // skills (of the selected labs) this course fills
  labIds: string[];
}
export interface PlanSemester {
  grade: number;
  semester: 1 | 2;
  season: Season;
  courses: PlanCourse[];
  credits: number;
}
export interface CoursePlan {
  skills: PlanSkill[];
  completed: PlanCourse[];
  semesters: PlanSemester[];
  unscheduled: PlanCourse[];
  ready: number; // skills done (course or diary)
  total: number;
}

const season = (s: 1 | 2): Season => (s === 1 ? "봄" : "가을");
/** Course-number level: CSE302 → 3, BS101 → 1. */
export const courseLevel = (code: string) => Number(code.match(/\d/)?.[0] ?? 1);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣+#]/g, "");

export function buildCoursePlan(opts: {
  labs: Pick<Lab, "id" | "inferredSkills">[];
  settings: PlanSettings;
  diarySkills: string[];
  getCourse: (code: string) => Course | undefined;
  getSkill: (name: string) => Skill;
}): CoursePlan {
  const { labs, settings, getCourse, getSkill } = opts;

  // Completed codes, expanded with equivalents (CSE204 ≡ BE201)
  const done = new Set<string>();
  for (const c of settings.completed) {
    done.add(c);
    getCourse(c)?.equivalents.forEach((e) => done.add(e));
  }
  const diary = opts.diarySkills.map(norm).filter(Boolean);
  const inDiary = (skill: string) => {
    const s = norm(skill);
    return diary.some((m) => m === s || (m.length > 2 && s.includes(m)) || (s.length > 2 && m.includes(s)));
  };

  // 1) Merge skills across labs (keep the strongest importance)
  const merged = new Map<string, { importance: "core" | "helpful"; labIds: string[] }>();
  for (const lab of labs) {
    for (const s of lab.inferredSkills) {
      const m = merged.get(s.name);
      if (!m) merged.set(s.name, { importance: s.importance, labIds: [lab.id] });
      else {
        if (s.importance === "core") m.importance = "core";
        if (!m.labIds.includes(lab.id)) m.labIds.push(lab.id);
      }
    }
  }
  const skills: PlanSkill[] = Array.from(merged, ([name, m]) => {
    const courses = getSkill(name).courses.filter((c) => getCourse(c));
    const by = courses.find((c) => done.has(c)) ?? null;
    return {
      name,
      importance: m.importance,
      labIds: m.labIds,
      courses,
      status: by ? "done-course" : !courses.length ? "external" : inDiary(name) ? "done-diary" : "unscheduled",
      by,
    } as PlanSkill;
  });

  const skillsOf = (code: string) => skills.filter((s) => s.courses.includes(code) || getCourse(code)?.equivalents.some((e) => s.courses.includes(e))).map((s) => s.name);
  const labsOf = (names: string[]) => Array.from(new Set(skills.filter((s) => names.includes(s.name)).flatMap((s) => s.labIds)));
  const card = (code: string): PlanCourse => {
    const names = skillsOf(code);
    return { code, course: getCourse(code)!, skills: names, labIds: labsOf(names) };
  };

  // 2) Pick the fewest courses that cover the open skills (greedy set cover; core skills weigh double).
  //    A skill needs only one of its linked courses.
  const open = new Set(skills.filter((s) => s.status === "unscheduled").map((s) => s.name));
  const chosen: string[] = [];
  while (open.size) {
    let best: { code: string; score: number } | null = null;
    const candidates = new Set(skills.filter((s) => open.has(s.name)).flatMap((s) => s.courses));
    for (const code of Array.from(candidates)) {
      if (done.has(code) || chosen.includes(code)) continue;
      const score = skills.filter((s) => open.has(s.name) && s.courses.includes(code)).reduce((a, s) => a + (s.importance === "core" ? 2 : 1), 0);
      const better =
        !best ||
        score > best.score ||
        (score === best.score && (courseLevel(code) < courseLevel(best.code) || (courseLevel(code) === courseLevel(best.code) && code < best.code)));
      if (better) best = { code, score };
    }
    if (!best) break;
    chosen.push(best.code);
    skills.forEach((s) => s.courses.includes(best!.code) && open.delete(s.name));
  }

  // 3) Remaining semesters, starting after the current one, through 4학년 2학기
  const semesters: PlanSemester[] = [];
  let g = settings.grade;
  let sm: 1 | 2 = settings.semester;
  for (;;) {
    if (sm === 1) sm = 2;
    else {
      sm = 1;
      g += 1;
    }
    if (g > 4) break;
    semesters.push({ grade: g, semester: sm, season: season(sm), courses: [], credits: 0 });
  }

  // 4) Place courses: lower levels first; a course goes in the earliest semester that
  //    (a) offers it, (b) has room under maxCredits, (c) comes after its prerequisites,
  //    (d) is not above the student's year (course level ≤ grade, e.g. 300-level from 3학년).
  const placedAt = new Map<string, number>();
  const unscheduled: PlanCourse[] = [];
  const order = [...chosen].sort((a, b) => courseLevel(a) - courseLevel(b) || a.localeCompare(b));
  for (const code of order) {
    const c = getCourse(code)!;
    const after = Math.max(-1, ...c.prerequisites.filter((p) => !done.has(p)).map((p) => placedAt.get(p) ?? Infinity));
    const idx = semesters.findIndex(
      (s, i) => i > after && c.semester.includes(s.season) && s.credits + c.credits <= settings.maxCredits && courseLevel(code) <= Math.max(1, s.grade),
    );
    if (idx === -1) {
      unscheduled.push(card(code));
      continue;
    }
    semesters[idx].courses.push(card(code));
    semesters[idx].credits += c.credits;
    placedAt.set(code, idx);
  }

  // 5) Final skill status
  for (const s of skills) {
    if (s.status !== "unscheduled") continue;
    const p = s.courses.find((c) => placedAt.has(c));
    if (p) {
      s.status = "planned";
      s.by = p;
    }
  }
  const rank = { "done-course": 0, "done-diary": 1, planned: 2, unscheduled: 3, external: 4 } as const;
  skills.sort((a, b) => rank[a.status] - rank[b.status] || (a.importance === b.importance ? a.name.localeCompare(b.name) : a.importance === "core" ? -1 : 1));

  const completedCards = settings.completed.filter((c) => getCourse(c)).map(card);
  const ready = skills.filter((s) => s.status === "done-course" || s.status === "done-diary").length;
  return { skills, completed: completedCards, semesters, unscheduled, ready, total: skills.length };
}
