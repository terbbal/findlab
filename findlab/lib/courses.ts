import coursesData from "@/data/dgist_courses.json";
import type { Course } from "./types";

const raw = coursesData.courses as Course[];

// Make "equivalents" symmetric (the source lists them on one side only)
const byCode = new Map<string, Course>(raw.map((c) => [c.code, { ...c, equivalents: [...c.equivalents] }]));
for (const c of Array.from(byCode.values())) {
  for (const e of c.equivalents) {
    const other = byCode.get(e);
    if (other && !other.equivalents.includes(c.code)) other.equivalents.push(c.code);
  }
}

export const COURSES_META = coursesData.meta;
export const allCourses = (): Course[] => Array.from(byCode.values());
export const getCourse = (code: string): Course | undefined => byCode.get(code);
/** A course and all codes that count as the same course. */
export const sameCourseCodes = (code: string): string[] => [code, ...(byCode.get(code)?.equivalents ?? [])];
