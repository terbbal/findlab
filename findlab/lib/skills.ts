import skillsData from "@/data/skills.json";
import type { Skill } from "./types";

const skills = skillsData.skills as unknown as Skill[];
const byName = new Map(skills.map((s) => [s.name, s]));

export const allSkills = (): Skill[] => skills;
/** Skill record by name (same names as Lab.inferredSkills). Unknown skills have no DGIST course. */
export const getSkill = (name: string): Skill => byName.get(name) ?? { name, courses: [], reasons: {} };
