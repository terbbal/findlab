"use client";

import sampleLms from "@/data/sample/lms.json";
import { api } from "@/lib/client";
import { readDB, setLms, writeDB } from "@/lib/localdb";
import type { LmsItem } from "@/lib/types";

const URL_KEY = "findlab.lmsUrl"; // stays in this browser only

export function getLmsUrl(): string | null {
  try {
    return localStorage.getItem(URL_KEY);
  } catch {
    return null;
  }
}

export async function connectLms(url: string) {
  const { items } = await api<{ items: LmsItem[] }>("/api/lms/parse", { method: "POST", json: { url } });
  try {
    localStorage.setItem(URL_KEY, url);
  } catch {}
  setLms(items);
  return items;
}

export async function uploadIcs(file: File) {
  const ics = await file.text();
  const { items } = await api<{ items: LmsItem[] }>("/api/lms/parse", { method: "POST", json: { ics } });
  setLms(items);
  return items;
}

/** Sample assignments with due dates around today (for demos). */
export function loadSampleLms() {
  const today = new Date();
  const items: LmsItem[] = (sampleLms as { id: string; title: string; course: string; date: string; description: string }[]).map((x, i) => {
    const due = new Date(today);
    due.setDate(today.getDate() + [-9, -4, 1, 3, 6, 12][i % 6]);
    due.setHours(23, 59, 0, 0);
    return { uid: `sample-${x.id}`, title: x.title, course: x.course, start: null, due: due.toISOString(), description: x.description, url: null };
  });
  setLms(items);
  return items;
}

export function disconnectLms() {
  try {
    localStorage.removeItem(URL_KEY);
  } catch {}
  writeDB((d) => ({ ...d, lms: [], lmsSyncedAt: undefined }));
}

/** Re-sync the iCal feed if the last sync was more than 1 hour ago. */
export async function syncIfStale() {
  const url = getLmsUrl();
  if (!url) return;
  const last = readDB().lmsSyncedAt;
  if (last && Date.now() - new Date(last).getTime() < 60 * 60 * 1000) return;
  try {
    await connectLms(url);
  } catch {}
}
