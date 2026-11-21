import type { Lab } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣+#]/g, "");

/** Deterministic readiness: which of the lab's inferred skills the student already shows in their diary. */
export function readiness(lab: Lab, userSkills: string[]) {
  const mine = userSkills.map(norm).filter(Boolean);
  const has = (skill: string) => {
    const s = norm(skill);
    return mine.some((m) => m === s || (m.length > 2 && s.includes(m)) || (s.length > 2 && m.includes(s)));
  };
  const skills = lab.inferredSkills ?? [];
  const have = skills.filter((s) => has(s.name)).map((s) => s.name);
  const missing = skills.filter((s) => !has(s.name)).map((s) => ({ name: s.name, importance: s.importance }));
  const core = skills.filter((s) => s.importance === "core");
  const coreHave = core.filter((s) => has(s.name)).length;
  const pct = skills.length ? Math.round(((coreHave * 2 + (have.length - coreHave)) / (core.length * 2 + (skills.length - core.length))) * 100) : null;
  const level = pct === null ? "Unknown" : pct >= 60 ? "Ready" : pct >= 30 ? "Almost there" : "Stretch";
  return { pct, level, have, missing };
}
