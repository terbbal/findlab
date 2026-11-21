"use client";

import { useCallback, useEffect, useState } from "react";
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

const ENTRIES_EVENT = "findlab:entries-changed";
export const notifyEntriesChanged = () => window.dispatchEvent(new Event(ENTRIES_EVENT));

/** Polish a note with AI, then save it as a diary entry. */
export async function addDiaryEntry(opts: {
  note: string;
  date: string;
  source: DiaryEntry["source"];
  lang: Lang;
  context?: string;
}): Promise<{ entry: DiaryEntry; demoMode: boolean }> {
  const ai = await api<{ category: DiaryEntry["category"]; skills: string[]; cvBullet: string; demoMode: boolean }>(
    "/api/diary/enhance",
    { method: "POST", json: { note: opts.note, lang: opts.lang, context: opts.context } },
  );
  const { entry } = await api<{ entry: DiaryEntry }>("/api/diary", {
    method: "POST",
    json: { date: opts.date, rawNote: opts.note, source: opts.source, category: ai.category, skills: ai.skills, cvBullet: ai.cvBullet },
  });
  notifyEntriesChanged();
  // Keep the namecard fresh (skills/levels) in the background.
  api("/api/cv/namecard", { method: "POST", json: { lang: opts.lang } }).catch(() => {});
  return { entry, demoMode: ai.demoMode };
}

export function useEntries() {
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const reload = useCallback(async () => {
    try {
      const { entries } = await api<{ entries: DiaryEntry[] }>("/api/diary", { cache: "no-store" });
      setEntries(entries);
    } catch {
      setEntries([]);
    }
  }, []);
  useEffect(() => {
    reload();
    window.addEventListener(ENTRIES_EVENT, reload);
    return () => window.removeEventListener(ENTRIES_EVENT, reload);
  }, [reload]);
  return { entries, reload, setEntries };
}

export const bulletOf = (e: DiaryEntry) => e.cvBulletEdited || e.cvBullet;
