/**
 * CV writing guide (runs on client and server, no AI needed).
 *
 * finD Lab archives what the student did and guides them to write their own CV —
 * it does not write the CV for them. This module checks a record / sentence for the
 * four things a good CV line has, asks questions for what is missing, and gives
 * section-by-section tips.
 */
import type { Category, DiaryEntry, LabIndexItem, Lang } from "./types";

export type Element = "action" | "tool" | "role" | "result";
export const ELEMENTS: Element[] = ["action", "tool", "role", "result"];

export const ELEMENT_LABEL: Record<Element, Record<Lang, string>> = {
  action: { ko: "무엇을 했나", en: "What you did" },
  tool: { ko: "도구·방법", en: "Tools / methods" },
  role: { ko: "내 역할", en: "Your role" },
  result: { ko: "결과·배운 점", en: "Result / takeaway" },
};

const QUESTIONS: Record<Element, Record<Lang, string>> = {
  action: { ko: "구체적으로 무엇을 만들거나 분석했나요? (동사로 시작해 보세요)", en: "What exactly did you build or analyze? (start with a verb)" },
  tool: { ko: "어떤 언어·도구·장비·방법을 썼나요?", en: "Which language, tool, equipment or method did you use?" },
  role: { ko: "혼자 했나요, 팀이었나요? 팀이었다면 내가 맡은 부분은?", en: "Solo or team? If team, which part was yours?" },
  result: { ko: "결과는 어땠나요? 숫자(정확도, 인원, 기간)나 배운 점이 있나요?", en: "What came out of it? Any number (accuracy, people, weeks) or lesson?" },
};

const TOOL_RE =
  /python|pandas|numpy|pytorch|tensorflow|opencv|matlab|arduino|ros\b|c\+\+|java|react|excel|sql|cad|solidworks|figma|r\b|현미경|microscop|pcr|센서|sensor|라즈베리|raspberry|git|파이썬|아두이노|엑셀|코딩|code|coding|algorithm|알고리즘|모델|model|cnn|ml\b|머신러닝|딥러닝|machine learning|deep learning/i;
const ROLE_RE = /혼자|팀|맡|담당|리드|이끌|주도|역할|팀장|팀원|my part|my role|i led|led |solo|alone|team|teammate|responsible|in charge|organized|mentor|가르/i;
// A bare number is not a result ("3 teammates"), so numbers only count with a unit or rank.
const RESULT_RE =
  /\d+(\.\d+)?\s*(%|점|등|위|배|명의? ?(사용자|참가자|학생)|users?|participants?|x\b|times|place|accuracy)|결과|완성|성공|수상|입상|선정|배운|배웠|개선|향상|달성|발표했|게재|채택|result|achiev|improv|\bwon\b|award|accuracy|published|learned|completed|finished|launched|selected/i;

/** Which of the four elements a text (plus the record's skills) already covers. */
export function checkElements(text: string, skills: string[] = []): Record<Element, boolean> {
  const t = text.trim();
  return {
    action: t.length >= 8,
    tool: skills.some((s) => !/teamwork|leadership|presentation|teaching/i.test(s)) || TOOL_RE.test(t),
    role: ROLE_RE.test(t),
    result: RESULT_RE.test(t),
  };
}

/** The student's own CV sentence, if they wrote one (the AI line is only an example). */
// A new record starts with cvBullet = the raw note, so a line only counts as written once it differs from the note.
export const ownSentence = (e: DiaryEntry) => {
  const line = (e.cvBulletEdited || e.cvBullet || "").trim();
  return line && line !== e.rawNote.trim() ? line : null;
};

export function entryGuide(e: DiaryEntry, lang: Lang) {
  const own = ownSentence(e);
  // Before the student writes, judge the raw note: does the record already hold the facts they will need?
  const has = checkElements(own ?? e.rawNote, e.skills);
  const missing = ELEMENTS.filter((k) => !has[k]);
  return {
    written: Boolean(own),
    has,
    missing,
    questions: missing.map((k) => QUESTIONS[k][lang]),
    score: ELEMENTS.length - missing.length,
  };
}

/* ---------- Sections ---------- */

export type SectionId = "research" | "courses" | "activities" | "skills" | "summary";

export const SECTION_OF: Record<Category, SectionId> = {
  Research: "research",
  Project: "research",
  Course: "courses",
  Club: "activities",
  Award: "activities",
  Volunteer: "activities",
  Other: "activities",
};

export const TEMPLATES = ["Undergrad research intern", "UGRP application", "General"] as const;
export type Template = (typeof TEMPLATES)[number];

export const TEMPLATE_LABEL: Record<Template, Record<Lang, string>> = {
  "Undergrad research intern": { ko: "연구실 학부 인턴", en: "Undergrad research intern" },
  "UGRP application": { ko: "UGRP 지원", en: "UGRP application" },
  General: { ko: "일반", en: "General" },
};

type Tips = Record<Lang, string[]>;
export const SECTIONS: { id: SectionId; title: Record<Lang, string>; tips: Tips; focus: Partial<Record<Template, Record<Lang, string>>> }[] = [
  {
    id: "research",
    title: { ko: "연구 & 프로젝트", en: "Research & Projects" },
    tips: {
      ko: [
        "한 줄 = 한 경험. \"동사 + 무엇을 + 어떤 도구로 + 결과\" 순서로 써 보세요.",
        "팀 프로젝트라면 내가 맡은 부분을 분명히 적으세요.",
        "숫자는 실제로 있었던 것만 (정확도, 기간, 인원). 없으면 배운 점으로 마무리해도 돼요.",
      ],
      en: [
        "One line = one experience. Try \"verb + what + with which tool + result\".",
        "For team projects, say clearly which part was yours.",
        "Only real numbers (accuracy, weeks, people). If none, end with what you learned.",
      ],
    },
    focus: {
      "Undergrad research intern": { ko: "인턴 지원: 직접 손으로 해 본 기술(코드, 실험, 장비)을 앞에 두세요.", en: "Intern: put hands-on skills (code, experiments, equipment) first." },
      "UGRP application": { ko: "UGRP: 팀으로 문제를 정의하고 풀어 본 경험을 앞에 두세요.", en: "UGRP: lead with team problem-solving and research curiosity." },
    },
  },
  {
    id: "courses",
    title: { ko: "수업", en: "Courses" },
    tips: {
      ko: ["지원하는 분야와 관련된 수업만 골라 적으세요.", "수업 중 프로젝트·과제가 있었다면 한 줄로 덧붙이면 좋아요."],
      en: ["List only courses related to what you apply for.", "Add one line if the course had a project or assignment."],
    },
    focus: {},
  },
  {
    id: "activities",
    title: { ko: "활동 & 수상", en: "Activities & Awards" },
    tips: {
      ko: ["동아리·봉사·수상은 기간과 역할을 함께 적으세요.", "수상은 대회 이름과 순위를 정확하게."],
      en: ["For clubs, volunteering and awards, add the period and your role.", "For awards, the exact competition name and place."],
    },
    focus: {
      "UGRP application": { ko: "UGRP: 협업·리더십이 드러나는 활동을 골라 주세요.", en: "UGRP: pick activities that show teamwork and leadership." },
    },
  },
  {
    id: "skills",
    title: { ko: "스킬", en: "Skills" },
    tips: {
      ko: ["기록에서 여러 번 쓴 스킬을 위에. 한 번 써 본 건 \"기초\"라고 솔직하게.", "언어 / 도구 / 실험 기법처럼 묶어서 적으면 읽기 쉬워요."],
      en: ["Skills you used many times go first; be honest (\"basic\") about ones used once.", "Group them: languages / tools / lab techniques."],
    },
    focus: {},
  },
  {
    id: "summary",
    title: { ko: "요약 (맨 위 2줄)", en: "Summary (top 2 lines)" },
    tips: {
      ko: ["마지막에 쓰세요. 아래 내용을 다 쓴 뒤 \"나는 어떤 사람인지 + 무엇을 하고 싶은지\" 두 줄로.", "연구실에 지원한다면 그 연구실 분야와 연결되는 관심사를 한 줄에 넣으세요."],
      en: ["Write it last: two lines on who you are and what you want to do.", "Applying to a lab? Tie one line to that lab's field."],
    },
    focus: {},
  },
];

/* ---------- Lab focus ---------- */

const FILLER = new Set(["and", "for", "the", "with", "based", "using", "systems", "system", "technology", "engineering", "science", "sciences", "study", "research", "applications", "application", "analysis", "development", "advanced", "novel", "design", "materials", "devices"]);

/** Records worth emphasizing for a lab: overlap between the lab's topics and the record's note, skills and sentence. */
export function recordsForLab(lab: Pick<LabIndexItem, "keywords" | "interests">, entries: DiaryEntry[], k = 3) {
  // Whole research interests are long phrases, so also use their words and word pairs (minus filler) to find overlaps.
  const words = lab.interests.map((a) => a.split(/[\s,/()·-]+/).filter((w) => w && !FILLER.has(w.toLowerCase())));
  const pairs = words.flatMap((ws) => ws.slice(1).map((w, i) => `${ws[i]} ${w}`));
  const terms = Array.from(
    new Set([...lab.keywords, ...lab.interests, ...pairs, ...words.flat()].map((t) => t.toLowerCase().trim()).filter((t) => t.length >= (/[가-힣]/.test(t) ? 2 : 4))),
  );
  return entries
    .map((e) => {
      const text = [e.rawNote, e.cvBullet, e.cvBulletEdited ?? "", ...e.skills].join(" ").toLowerCase();
      // Longest first, and drop a hit that is part of a longer one ("learning" when "machine learning" matched).
      const raw = terms.filter((t) => text.includes(t)).sort((a, b) => b.length - a.length);
      const hits = raw.filter((h, i) => !raw.slice(0, i).some((longer) => longer.includes(h)));
      return { entry: e, hits, score: hits.length + (e.highlight ? 0.5 : 0) };
    })
    .filter((r) => r.hits.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
