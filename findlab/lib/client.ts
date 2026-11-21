"use client";

import { addEntry, useDB } from "./localdb";
import type { DiaryEntry, Lang } from "./types";

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function daysUntil(dateISO: string): number {
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(dateISO + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export const notifyEntriesChanged = () => {};

/** Save the student's own note as a diary entry. AI only suggests a category + skill tags (never rewrites the text). */
export async function addDiaryEntry(opts: {
  note: string;
  date: string;
  source: DiaryEntry["source"];
  lang: Lang;
  context?: string;
}): Promise<{ entry: DiaryEntry; demoMode: boolean }> {
  let tags: { category: DiaryEntry["category"]; skills: string[]; demoMode: boolean } = { category: "Other", skills: [], demoMode: true };
  try {
    tags = await api("/api/diary/enhance", { method: "POST", json: { note: opts.note, lang: opts.lang, context: opts.context } });
  } catch {}
  const entry = addEntry({
    date: opts.date,
    rawNote: opts.note,
    source: opts.source,
    category: tags.category,
    skills: tags.skills,
    cvBullet: opts.note,
  });
  return { entry, demoMode: tags.demoMode };
}

export function useEntries() {
  const db = useDB();
  return { entries: db ? db.entries : null, reload: () => {}, setEntries: () => {} };
}

export const bulletOf = (e: DiaryEntry) => e.cvBulletEdited || e.cvBullet || e.rawNote;
