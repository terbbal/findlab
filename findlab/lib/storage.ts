import "server-only";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { Category, DiaryEntry, MailRecord, Opportunity, Profile } from "./types";

const DATA = path.join(process.cwd(), "data");
export const DEMO_USER = "minji";

const userDir = (userId: string) => path.join(DATA, "users", safe(userId));
const entriesDir = (userId: string) => path.join(userDir(userId), "entries");

function safe(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, "");
}

async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/* ---------- Diary entries (.md + YAML frontmatter) ---------- */

export function slugify(text: string): string {
  const ascii = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join("-");
  return ascii || "entry";
}

function entryToMarkdown(e: DiaryEntry): string {
  const fm: Record<string, unknown> = {
    id: e.id,
    date: e.date,
    source: e.source,
    category: e.category,
    skills: e.skills,
    highlight: Boolean(e.highlight),
  };
  let body = `## Note\n${e.rawNote.trim()}\n\n## CV bullet\n${e.cvBullet.trim()}\n`;
  if (e.cvBulletEdited) body += `\n## CV bullet (edited)\n${e.cvBulletEdited.trim()}\n`;
  return matter.stringify(body, fm);
}

function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const chunk of content.split(/^## /m).slice(1)) {
    const nl = chunk.indexOf("\n");
    const title = (nl < 0 ? chunk : chunk.slice(0, nl)).trim();
    out[title] = nl < 0 ? "" : chunk.slice(nl + 1).trim();
  }
  return out;
}

function markdownToEntry(raw: string): DiaryEntry {
  const { data, content } = matter(raw);
  const s = sections(content);
  const section = (h: string) => s[h] || undefined;
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
  return {
    id: String(data.id),
    date,
    source: data.source ?? "text",
    category: (data.category ?? "Other") as Category,
    skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
    highlight: Boolean(data.highlight),
    rawNote: section("Note") ?? "",
    cvBullet: section("CV bullet") ?? "",
    cvBulletEdited: section("CV bullet (edited)"),
  };
}

export async function listEntries(userId = DEMO_USER): Promise<DiaryEntry[]> {
  const dir = entriesDir(userId);
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const entries = await Promise.all(files.map(async (f) => markdownToEntry(await fs.readFile(path.join(dir, f), "utf8"))));
  return entries.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
}

export async function getEntry(id: string, userId = DEMO_USER): Promise<DiaryEntry | null> {
  try {
    return markdownToEntry(await fs.readFile(path.join(entriesDir(userId), `${safe(id)}.md`), "utf8"));
  } catch {
    return null;
  }
}

export async function newEntryId(date: string, note: string, userId = DEMO_USER): Promise<string> {
  const base = `${date}-${slugify(note)}`;
  let id = base;
  let n = 2;
  while (await getEntry(id, userId)) id = `${base}-${n++}`;
  return id;
}

export async function saveEntry(e: DiaryEntry, userId = DEMO_USER) {
  await fs.mkdir(entriesDir(userId), { recursive: true });
  await fs.writeFile(path.join(entriesDir(userId), `${safe(e.id)}.md`), entryToMarkdown(e), "utf8");
}

export async function deleteEntry(id: string, userId = DEMO_USER) {
  await fs.rm(path.join(entriesDir(userId), `${safe(id)}.md`), { force: true });
}

/* ---------- Profile ---------- */

export async function getProfile(userId = DEMO_USER): Promise<Profile> {
  return readJSON<Profile>(path.join(userDir(userId), "profile.json"), {
    userId,
    name: userId,
    year: "",
    interests: [],
    oneLineIntro: "",
    topSkills: [],
    bestProjects: [],
    email: "",
  });
}

export async function saveProfile(p: Profile, userId = DEMO_USER) {
  await writeJSON(path.join(userDir(userId), "profile.json"), p);
}

/* ---------- Mails ---------- */

export async function listMails(userId = DEMO_USER): Promise<MailRecord[]> {
  return readJSON<MailRecord[]>(path.join(userDir(userId), "mails.json"), []);
}

export async function saveMails(mails: MailRecord[], userId = DEMO_USER) {
  await writeJSON(path.join(userDir(userId), "mails.json"), mails);
}

/* ---------- Labs, opportunities, sample data ---------- */

export async function listOpportunities(): Promise<Opportunity[]> {
  const ops = await readJSON<Opportunity[]>(path.join(DATA, "sample", "opportunities.json"), []);
  return ops.sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export async function readSample<T>(name: string, fallback: T): Promise<T> {
  return readJSON<T>(path.join(DATA, "sample", `${name}.json`), fallback);
}
