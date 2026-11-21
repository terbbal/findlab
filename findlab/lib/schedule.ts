/**
 * Find a date phrase in a diary note ("내일", "다음주 월요일", "3일 후", "11월 30일", "next Friday" …)
 * and turn it into a calendar date, so a note about the future can be saved as a schedule item.
 *
 * Rule-based on purpose: instant, offline, and predictable (no AI). Weeks start on Monday,
 * as in Korean usage ("다음주 월요일" = Monday of next week).
 */

export type DateHit = {
  /** YYYY-MM-DD */
  date: string;
  /** The words that were matched, e.g. "다음주 월요일" */
  phrase: string;
  /** The note without the date phrase, e.g. "수학 시험" */
  title: string;
  /** Only the week / month is known ("다음주에 …"): `date` is its first day. */
  approx?: "week" | "month";
};

const KO_DAYS = "일월화수목금토"; // index = Date.getDay()
const EN_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Monday of the week containing d (weeks start on Monday). */
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
/** Offset of a weekday from Monday: 월=0 … 일=6. */
const fromMonday = (dow: number) => (dow + 6) % 7;

type Rule = { re: RegExp; date: (m: RegExpMatchArray, today: Date) => Date | null; approx?: DateHit["approx"] };

/** Same day n months later, clamped to the month's last day (1월 31일 + 1달 → 2월 28일). */
const addMonths = (d: Date, n: number) => {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last));
};
const lastDayOfMonth = (d: Date, plus = 0) => new Date(d.getFullYear(), d.getMonth() + plus + 1, 0);

/** Korean counting words: 한 달, 두 주, 세 달 … (also digits). */
const KO_NUM: Record<string, number> = { 한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : KO_NUM[s] ?? NaN);
const KO_NUM_RE = "\\d+|한|하나|두|둘|세|셋|네|넷|다섯|여섯|일곱|여덟|아홉|열";
/** Native Korean day counts: 하루 뒤, 이틀 후, 열흘 뒤, 보름 뒤 … */
const KO_DAY_WORDS: Record<string, number> = { 하루: 1, 이틀: 2, 사흘: 3, 나흘: 4, 닷새: 5, 엿새: 6, 이레: 7, 여드레: 8, 아흐레: 9, 열흘: 10, 보름: 15 };
/** "after" — 뒤/후/있다가/지나서 (but not "1주일간"/"동안", which is a duration). */
const AFTER = "\\s*(?:뒤|후|이후|있다가|있으면|지나서|지나면)";
const EN_NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const enNum = (s: string) => (/^\d+$/.test(s) ? Number(s) : EN_NUM[s.toLowerCase()] ?? NaN);
const EN_NUM_RE = "\\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten";

const koDay = (c: string) => KO_DAYS.indexOf(c);
const enDay = (s: string) => EN_DAYS.findIndex((d) => d.startsWith(s.toLowerCase().slice(0, 3)));
const enMonth = (s: string) => EN_MONTHS.indexOf(s.toLowerCase().slice(0, 3));

/**
 * A month/day without a year: this year — except early-year dates written late in the year
 * ("1월 5일" in November), which mean next year. "3월 14일" in November stays a past date (a record).
 */
function monthDay(today: Date, month: number, day: number): Date | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const year = today.getMonth() - month >= 9 ? today.getFullYear() + 1 : today.getFullYear();
  const d = new Date(year, month, day);
  return d.getMonth() === month ? d : null; // rejects e.g. 2월 30일
}

// Order matters: more specific phrases first.
const RULES: Rule[] = [
  // ---------- Korean ----------
  // Past phrases first, so "지난주 금요일" is not read as "금요일" (they give a past date → not a plan).
  { re: /(?:지난|저번)\s*주\s*([월화수목금토일])요일/, date: (m, t) => addDays(mondayOf(t), -7 + fromMonday(koDay(m[1]))) },
  { re: /(?:지난|저번)\s*주/, date: (_m, t) => addDays(mondayOf(t), -7), approx: "week" },
  { re: /그저께|그제/, date: (_m, t) => addDays(t, -2) },
  { re: /어제/, date: (_m, t) => addDays(t, -1) },
  { re: /다다음\s*주\s*([월화수목금토일])요일/, date: (m, t) => addDays(mondayOf(t), 14 + fromMonday(koDay(m[1]))) },
  { re: /(?:다음\s*주|담주|차주)\s*([월화수목금토일])요일/, date: (m, t) => addDays(mondayOf(t), 7 + fromMonday(koDay(m[1]))) },
  { re: /(?:이번\s*주|금주)\s*([월화수목금토일])요일/, date: (m, t) => addDays(mondayOf(t), fromMonday(koDay(m[1]))) },
  { re: /다음\s*주\s*주말|담주\s*주말/, date: (_m, t) => addDays(mondayOf(t), 12) },
  { re: /이번\s*주말|주말에/, date: (_m, t) => addDays(mondayOf(t), 5) },
  { re: /다음\s*달\s*(\d{1,2})\s*일/, date: (m, t) => new Date(t.getFullYear(), t.getMonth() + 1, Number(m[1])) },
  { re: /(\d{1,2})\s*월\s*(\d{1,2})\s*일/, date: (m, t) => monthDay(t, Number(m[1]) - 1, Number(m[2])) },
  // "N일/주/주일/달/개월 뒤" — digits or counting words (1주일 뒤, 일주일 후, 한 달 뒤, 3개월 후, 2주 있다가 …)
  { re: new RegExp(`일주일${AFTER}`), date: (_m, t) => addDays(t, 7) },
  { re: new RegExp(`(${KO_NUM_RE})\\s*(?:주일|주)${AFTER}`), date: (m, t) => addDays(t, 7 * num(m[1])) },
  { re: new RegExp(`(${KO_NUM_RE})\\s*(?:달|개월)${AFTER}`), date: (m, t) => addMonths(t, num(m[1])) },
  { re: new RegExp(`(\\d+)\\s*일${AFTER}`), date: (m, t) => addDays(t, Number(m[1])) },
  { re: new RegExp(`(${Object.keys(KO_DAY_WORDS).join("|")})${AFTER}`), date: (m, t) => addDays(t, KO_DAY_WORDS[m[1]]) },
  // End / start of a month: 이번 달 말, 월말, 다음 달 초, 다음 달 말
  { re: /다음\s*달\s*(?:말|말일)/, date: (_m, t) => lastDayOfMonth(t, 1) },
  { re: /다음\s*달\s*초/, date: (_m, t) => new Date(t.getFullYear(), t.getMonth() + 1, 1), approx: "week" },
  { re: /이번\s*달\s*(?:말|말일)|월말/, date: (_m, t) => lastDayOfMonth(t) },
  { re: /글피/, date: (_m, t) => addDays(t, 3) },
  { re: /모레/, date: (_m, t) => addDays(t, 2) },
  { re: /내일/, date: (_m, t) => addDays(t, 1) },
  { re: /다다음\s*주/, date: (_m, t) => addDays(mondayOf(t), 14), approx: "week" },
  { re: /다음\s*주|담주|차주/, date: (_m, t) => addDays(mondayOf(t), 7), approx: "week" },
  { re: /다음\s*달/, date: (_m, t) => new Date(t.getFullYear(), t.getMonth() + 1, 1), approx: "month" },
  // A weekday on its own ("금요일에 발표"): the next one, today included.
  { re: /([월화수목금토일])요일/, date: (m, t) => addDays(t, (koDay(m[1]) - t.getDay() + 7) % 7) },

  // ---------- English ----------
  { re: /\byesterday\b/i, date: (_m, t) => addDays(t, -1) },
  { re: /\blast (mon|tues|wednes|thurs|fri|satur|sun)day\b/i, date: (m, t) => addDays(mondayOf(t), -7 + fromMonday(enDay(m[1]))) },
  { re: /\blast week\b/i, date: (_m, t) => addDays(mondayOf(t), -7), approx: "week" },
  { re: /\bday after tomorrow\b/i, date: (_m, t) => addDays(t, 2) },
  { re: /\btomorrow\b/i, date: (_m, t) => addDays(t, 1) },
  { re: /\bnext (mon|tues|wednes|thurs|fri|satur|sun)day\b/i, date: (m, t) => addDays(mondayOf(t), 7 + fromMonday(enDay(m[1]))) },
  { re: /\bthis (mon|tues|wednes|thurs|fri|satur|sun)day\b/i, date: (m, t) => addDays(mondayOf(t), fromMonday(enDay(m[1]))) },
  // in 3 days / in a week / in two weeks / in a month / a week from now / 2 weeks later
  { re: new RegExp(`\\bin (${EN_NUM_RE}) days?\\b|\\b(${EN_NUM_RE}) days? (?:from now|later)\\b`, "i"), date: (m, t) => addDays(t, enNum(m[1] ?? m[2])) },
  { re: new RegExp(`\\bin (${EN_NUM_RE}) weeks?\\b|\\b(${EN_NUM_RE}) weeks? (?:from now|later)\\b`, "i"), date: (m, t) => addDays(t, 7 * enNum(m[1] ?? m[2])) },
  { re: new RegExp(`\\bin (${EN_NUM_RE}) months?\\b|\\b(${EN_NUM_RE}) months? (?:from now|later)\\b`, "i"), date: (m, t) => addMonths(t, enNum(m[1] ?? m[2])) },
  { re: /\bnext weekend\b/i, date: (_m, t) => addDays(mondayOf(t), 12) },
  { re: /\bthis weekend\b/i, date: (_m, t) => addDays(mondayOf(t), 5) },
  { re: /\bend of (?:the |this )?month\b/i, date: (_m, t) => lastDayOfMonth(t) },
  { re: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?\b/i, date: (m, t) => monthDay(t, enMonth(m[1]), Number(m[2])) },
  { re: /\bnext week\b/i, date: (_m, t) => addDays(mondayOf(t), 7), approx: "week" },
  { re: /\bnext month\b/i, date: (_m, t) => new Date(t.getFullYear(), t.getMonth() + 1, 1), approx: "month" },
  { re: /\b(?:on )?(mon|tues|wednes|thurs|fri|satur|sun)day\b/i, date: (m, t) => addDays(t, (enDay(m[1]) - t.getDay() + 7) % 7) },

  // ---------- Numeric ----------
  { re: /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/, date: (m, t) => monthDay(t, Number(m[1]) - 1, Number(m[2])) },
];

/** Remove the date phrase and the particle right after it ("다음주 월요일에 수학 시험" → "수학 시험"). */
function titleWithout(note: string, phrase: string): string {
  const i = note.indexOf(phrase);
  const rest = (note.slice(0, i) + " " + note.slice(i + phrase.length).replace(/^\s*(?:에는|에|까지|부터|중에|중)(?=\s|$)/, ""))
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:on|at|by)\s+/i, "")
    .trim();
  return rest || note.trim();
}

/** The first date phrase in the note, or null. `today` defaults to now (local time). */
export function findDate(note: string, today: Date = new Date()): DateHit | null {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let best: { hit: DateHit; index: number } | null = null;
  for (const rule of RULES) {
    const m = note.match(rule.re);
    if (!m || m.index === undefined) continue;
    const d = rule.date(m, t);
    if (!d || isNaN(d.getTime())) continue;
    const phrase = m[0].trim();
    const hit: DateHit = { date: iso(d), phrase, title: titleWithout(note, phrase), ...(rule.approx ? { approx: rule.approx } : {}) };
    // Rules are ordered by specificity, so keep the first rule that matches (not the leftmost match).
    best = { hit, index: m.index };
    break;
  }
  return best?.hit ?? null;
}

/** A date phrase that points to the future (after today) — i.e. the note is a plan, not a record. */
export function findFutureDate(note: string, today: Date = new Date()): DateHit | null {
  const hit = findDate(note, today);
  return hit && hit.date > iso(today) ? hit : null;
}

export const todayLocalISO = (d: Date = new Date()) => iso(d);
