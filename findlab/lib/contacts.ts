"use client";

/**
 * Received namecards: people the student met (professors, seniors, mentors…) and what each can help with,
 * so that later, when stuck, the student can find who to ask.
 *
 * Privacy: these are OTHER people's details, so they live in their own localStorage key —
 * NOT inside the synced DB (findlab.db.me is uploaded by cloud sync) and never in a share link.
 * "Delete all my data" still removes them (every key starting with "findlab.").
 */
import { useCallback, useEffect, useState } from "react";
import { KO_EN, expandKo } from "./glossary";
import { getWorkspace, type Workspace } from "./localdb";
import type { LabIndexItem } from "./types";

export interface ContactCard {
  id: string;
  name: string;
  /** 소속: lab, department, company */
  org: string;
  /** 직책: 교수, 박사과정, 개발자 … */
  role: string;
  email?: string;
  phone?: string;
  /** When/where we met */
  metOn?: string; // YYYY-MM-DD
  metWhere?: string;
  /** What they can help with (preset or custom tags) */
  helpTags: string[];
  memo: string;
  /** Downscaled JPEG data URL of the card photo */
  photo?: string;
  /** Linked DGIST lab (when the person is a DGIST professor/researcher) */
  labId?: string;
  lastContactedOn?: string;
  createdAt: string;
  isSample?: boolean;
}

/** Preset "can help with" tags and the words that point to them in a request. */
export const HELP_TAGS: { tag: string; en: string; words: string[] }[] = [
  { tag: "연구실·컨택", en: "Labs & contacting", words: ["연구실", "컨택", "교수", "ugrp", "인턴", "지원", "메일", "lab", "contact", "professor", "intern"] },
  { tag: "실험·장비", en: "Experiments & equipment", words: ["실험", "장비", "pcr", "현미경", "세포", "배양", "시약", "측정", "experiment", "equipment", "microscope", "cell", "culture", "assay"] },
  { tag: "코딩·개발", en: "Coding", words: ["코딩", "코드", "개발", "프로그래밍", "파이썬", "버그", "에러", "오류", "깃", "앱", "웹", "coding", "code", "programming", "python", "bug", "error", "git", "app", "web"] },
  { tag: "데이터·AI", en: "Data & AI", words: ["데이터", "분석", "통계", "머신러닝", "딥러닝", "인공지능", "모델", "학습", "data", "analysis", "statistics", "machine", "learning", "model", "ai"] },
  { tag: "논문·글쓰기", en: "Papers & writing", words: ["논문", "글쓰기", "작성", "보고서", "영어", "발표", "포스터", "paper", "writing", "report", "presentation", "poster", "english"] },
  { tag: "대학원 진학", en: "Grad school", words: ["대학원", "진학", "석사", "박사", "입시", "면접", "grad", "graduate", "phd", "master", "admission", "interview"] },
  { tag: "취업·인턴", en: "Jobs & internships", words: ["취업", "회사", "인턴", "채용", "이력서", "자소서", "면접", "job", "company", "internship", "resume", "career"] },
  { tag: "진로 상담", en: "Career advice", words: ["진로", "고민", "상담", "방향", "전공", "career", "advice", "major"] },
  { tag: "수업·과제", en: "Courses & homework", words: ["수업", "과제", "시험", "공부", "강의", "학점", "course", "homework", "exam", "study", "class"] },
  { tag: "장학금·행정", en: "Scholarships & admin", words: ["장학금", "행정", "서류", "등록", "기숙사", "scholarship", "admin", "document"] },
  { tag: "창업", en: "Startups", words: ["창업", "스타트업", "사업", "투자", "startup", "business", "investment"] },
  { tag: "해외·교환", en: "Abroad & exchange", words: ["해외", "교환", "유학", "어학", "exchange", "abroad", "overseas"] },
];

const KEY = (w: Workspace) => `findlab.contacts.${w}`;
const EVENT = "findlab:contacts-changed";

const today = () => new Date().toISOString().slice(0, 10);

/** Fictional people for the demo workspace (clearly marked as samples). */
function demoContacts(): ContactCard[] {
  const at = "2026-11-01T00:00:00.000Z";
  return [
    {
      id: "sample-senior",
      name: "박지우 (샘플)",
      org: "DGIST 뉴바이올로지학과",
      role: "박사과정",
      email: "",
      metOn: "2026-10-15",
      metWhere: "UGRP 설명회",
      helpTags: ["실험·장비", "연구실·컨택", "대학원 진학"],
      memo: "세포 배양, PCR 잘 아심. 연구실 컨택 메일 봐 주신다고 함.",
      createdAt: at,
      isSample: true,
    },
    {
      id: "sample-dev",
      name: "이서연 (샘플)",
      org: "스타트업 개발팀",
      role: "백엔드 개발자",
      email: "",
      metOn: "2026-11-08",
      metWhere: "주말 해커톤 멘토",
      helpTags: ["코딩·개발", "취업·인턴"],
      memo: "React, 파이썬 서버 질문 언제든 OK. 겨울 인턴 공고 알려주기로 함.",
      createdAt: at,
      isSample: true,
    },
    {
      id: "sample-office",
      name: "학생지원팀 (샘플)",
      org: "DGIST 학생지원팀",
      role: "담당 선생님",
      email: "",
      metOn: "2026-09-02",
      metWhere: "신입생 오리엔테이션",
      helpTags: ["장학금·행정"],
      memo: "장학금 서류, 기숙사 문의.",
      createdAt: at,
      isSample: true,
    },
  ];
}

function read(w: Workspace): ContactCard[] {
  try {
    const raw = localStorage.getItem(KEY(w));
    if (raw) return JSON.parse(raw) as ContactCard[];
  } catch {}
  return w === "demo" ? demoContacts() : [];
}

function write(update: (list: ContactCard[]) => ContactCard[]) {
  const w = getWorkspace();
  try {
    localStorage.setItem(KEY(w), JSON.stringify(update(read(w))));
  } catch {
    throw new Error("저장 공간이 부족해요. 사진을 빼고 다시 저장해 보세요. / Storage is full — try without the photo.");
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useContacts(): ContactCard[] | null {
  const [list, setList] = useState<ContactCard[] | null>(null);
  const load = useCallback(() => setList(read(getWorkspace())), []);
  useEffect(() => {
    load();
    // also reload when the workspace (me/demo) changes or data is deleted
    const events = [EVENT, "findlab:db-changed", "storage"];
    events.forEach((e) => window.addEventListener(e, load));
    return () => events.forEach((e) => window.removeEventListener(e, load));
  }, [load]);
  return list;
}

export function saveContact(c: Omit<ContactCard, "id" | "createdAt"> & { id?: string }) {
  write((list) => {
    if (c.id && list.some((x) => x.id === c.id)) return list.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x));
    const id = `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return [{ ...c, id, createdAt: new Date().toISOString() }, ...list];
  });
}

export function deleteContact(id: string) {
  write((list) => list.filter((x) => x.id !== id));
}

export function markContacted(id: string) {
  write((list) => list.map((x) => (x.id === id ? { ...x, lastContactedOn: today() } : x)));
}

/* ---------- "Who can help me?" ---------- */

const STOP = new Set(["있어요", "해요", "하고", "그리고", "관련", "문의", "질문", "도움", "필요", "필요해요", "어떻게", "너무", "계속", "the", "and", "for", "with", "help", "need"]);
const words = (s: string) => (expandKo(s).toLowerCase().match(/[a-z][a-z0-9+#-]+|[가-힣]{2,}/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w));
/** Korean words carry particles ("실험이", "실험을"), so two words match when one starts with the other. */
const same = (a: string, b: string) => a === b || (/[가-힣]/.test(a) && Math.min(a.length, b.length) >= 2 && (a.startsWith(b) || b.startsWith(a)));

export type HelpMatch = { contact: ContactCard; score: number; reasons: string[] };

/**
 * Rank contacts for a request ("PCR 실험이 계속 실패해요"): preset tags whose words appear in the request
 * count most, then words shared with the memo / role / org / custom tags / linked lab's research topics.
 * Korean and English research terms meet through the glossary ("단백질" ↔ "protein").
 */
export function findHelpers(request: string, contacts: ContactCard[], labs: LabIndexItem[] = [], lang: "ko" | "en" = "ko"): HelpMatch[] {
  const q = request.trim();
  if (!q) return [];
  const qWords = words(q);
  const qLower = expandKo(q).toLowerCase();
  const wantedTags = HELP_TAGS.filter((t) => t.words.some((w) => qLower.includes(w)) || qLower.includes(t.tag.split("·")[0]));
  const labById = new Map(labs.map((l) => [l.id, l]));

  return contacts
    .map((c) => {
      const reasons: string[] = [];
      let score = 0;
      const tagHits = c.helpTags.filter((t) => wantedTags.some((w) => w.tag === t));
      if (tagHits.length) {
        score += 3 * tagHits.length;
        reasons.push(lang === "ko" ? `도움 분야: ${tagHits.join(", ")}` : `Can help with: ${tagHits.map((t) => HELP_TAGS.find((h) => h.tag === t)?.en ?? t).join(", ")}`);
      }
      const lab = c.labId ? labById.get(c.labId) : undefined;
      const fields: [string, string][] = [
        [lang === "ko" ? "메모" : "memo", c.memo],
        [lang === "ko" ? "소속·직책" : "affiliation", `${c.org} ${c.role}`],
        [lang === "ko" ? "태그" : "tags", c.helpTags.filter((t) => !HELP_TAGS.some((h) => h.tag === t)).join(" ")],
        [lang === "ko" ? "연구 분야" : "research", lab ? [lab.labName ?? "", ...lab.interests, ...lab.keywords].join(" ") : ""],
      ];
      for (const [label, text] of fields) {
        if (!text) continue;
        const raw = Array.from(new Set(words(text))).filter((w) => qWords.some((qw) => same(w, qw)));
        // Show "딥러닝", not "딥러닝, deep, learning": drop English words that only came from a Korean hit's glossary entry.
        const fromKo = new Set(raw.filter((w) => /[가-힣]/.test(w)).flatMap((w) => Object.keys(KO_EN).filter((k) => w.startsWith(k)).flatMap((k) => KO_EN[k].split(" "))));
        const hit = raw.filter((w) => !fromKo.has(w));
        if (hit.length) {
          score += hit.length;
          reasons.push(`${label}: ${hit.slice(0, 4).join(", ")}`);
        }
      }
      return { contact: c, score, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
