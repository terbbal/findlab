"use client";

/**
 * Per-browser storage (guest/local mode). Each visitor's diary, profile, saved labs,
 * roadmaps and LMS items live in their own browser — nothing personal is sent to or kept on the server.
 * Two workspaces: "me" (your own data) and "demo" (Minji's sample data, resettable).
 */
import { useCallback, useEffect, useState } from "react";
import demo from "@/data/sample/demo_user.json";
import type { DiaryEntry, LmsItem, Profile, Roadmap } from "./types";

export type Workspace = "me" | "demo";
type DB = { profile: Profile; entries: DiaryEntry[]; savedLabs: string[]; roadmaps: Roadmap[]; lms: LmsItem[]; lmsSyncedAt?: string };

const EVENT = "findlab:db-changed";
const WS_KEY = "findlab.workspace";

const emptyProfile = (): Profile => ({
  userId: "me",
  name: "",
  year: "",
  interests: [],
  oneLineIntro: "",
  topSkills: [],
  bestProjects: [],
  email: "",
});

function demoDB(): DB {
  return {
    profile: demo.profile as Profile,
    entries: demo.entries as DiaryEntry[],
    savedLabs: [],
    roadmaps: [],
    lms: [],
  };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

export function getWorkspace(): Workspace {
  const w = safeGet(WS_KEY);
  return w === "me" ? "me" : w === "demo" ? "demo" : "demo"; // first visit: demo, so voters see a filled app
}

export function setWorkspace(w: Workspace) {
  safeSet(WS_KEY, w);
  window.dispatchEvent(new Event(EVENT));
}

function key(w: Workspace) {
  return `findlab.db.${w}`;
}

export function readDB(w: Workspace = getWorkspace()): DB {
  const raw = safeGet(key(w));
  if (raw) {
    try {
      const db = JSON.parse(raw) as Partial<DB>;
      return { savedLabs: [], roadmaps: [], lms: [], ...db } as DB;
    } catch {}
  }
  return w === "demo" ? demoDB() : { profile: emptyProfile(), entries: [], savedLabs: [], roadmaps: [], lms: [] };
}

export function writeDB(update: (db: DB) => DB, w: Workspace = getWorkspace()) {
  safeSet(key(w), JSON.stringify(update(readDB(w))));
  window.dispatchEvent(new Event(EVENT));
}

export function resetWorkspace(w: Workspace) {
  try {
    localStorage.removeItem(key(w));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Delete everything this app stored in this browser. */
export function deleteAllData() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("findlab."))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe to the local DB. Returns null until mounted (avoids SSR mismatch). */
export function useDB(): (DB & { workspace: Workspace }) | null {
  const [state, setState] = useState<(DB & { workspace: Workspace }) | null>(null);
  const load = useCallback(() => {
    const w = getWorkspace();
    setState({ ...readDB(w), workspace: w });
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [load]);
  return state;
}

/* ---------- Entries ---------- */

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .join("-") || "entry"
  );
}

export function addEntry(e: Omit<DiaryEntry, "id">): DiaryEntry {
  const db = readDB();
  const base = `${e.date}-${slug(e.rawNote)}`;
  let id = base;
  let n = 2;
  while (db.entries.some((x) => x.id === id)) id = `${base}-${n++}`;
  const entry = { ...e, id };
  writeDB((d) => ({ ...d, entries: [entry, ...d.entries].sort((a, b) => b.date.localeCompare(a.date)) }));
  return entry;
}

export function updateEntry(id: string, patch: Partial<DiaryEntry>) {
  writeDB((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
}

export function deleteEntry(id: string) {
  writeDB((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
}

export function saveProfile(patch: Partial<Profile>) {
  writeDB((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
}

/* ---------- Saved labs ---------- */

export function toggleSavedLab(id: string) {
  writeDB((d) => ({ ...d, savedLabs: d.savedLabs.includes(id) ? d.savedLabs.filter((x) => x !== id) : [id, ...d.savedLabs] }));
}

/* ---------- Roadmaps ---------- */

export function saveRoadmap(r: Roadmap) {
  writeDB((d) => ({ ...d, roadmaps: [r, ...d.roadmaps.filter((x) => x.labId !== r.labId)] }));
}

export function deleteRoadmap(labId: string) {
  writeDB((d) => ({ ...d, roadmaps: d.roadmaps.filter((x) => x.labId !== labId) }));
}

/* ---------- LMS ---------- */

export function setLms(items: LmsItem[]) {
  writeDB((d) => ({ ...d, lms: items, lmsSyncedAt: new Date().toISOString() }));
}
