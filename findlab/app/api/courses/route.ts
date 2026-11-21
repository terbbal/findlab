import { NextResponse } from "next/server";
import { allCourses, COURSES_META } from "@/lib/courses";
import { allSkills } from "@/lib/skills";

export const dynamic = "force-static";

/** DGIST undergraduate courses + the approved skill → course links, for the roadmap's course plan. */
export async function GET() {
  return NextResponse.json({ courses: allCourses(), skills: allSkills(), meta: COURSES_META });
}
