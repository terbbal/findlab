"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Laptop, Plus, Search, X } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card, Chip } from "@/components/ui";
import { addDiaryEntry, api, todayISO, useEntries } from "@/lib/client";
import { DEFAULT_COURSE_PLAN, saveCoursePlan, useDB } from "@/lib/localdb";
import type { Course } from "@/lib/types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

/**
 * "My courses": the student's real courses, picked from the DGIST course catalog.
 * Shares `coursePlan.completed` with the Roadmap's course plan, so a course added here counts there too.
 * Courses whose code or name appears in the student's LMS calendar are suggested (the student confirms).
 */
export function MyCourses() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const { entries } = useEntries();
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<{ courses: Course[] }>("/api/courses").then((d) => setCatalog(d.courses)).catch(() => setCatalog([]));
  }, []);

  const cp = { ...DEFAULT_COURSE_PLAN, ...db?.coursePlan };
  const mine = cp.completed.map((code) => catalog.find((c) => c.code === code)).filter((c): c is Course => Boolean(c));
  const name = (c: Course) => (lang === "ko" && c.nameKo ? c.nameKo : c.name);

  // Suggestions from the LMS calendar: course code or course name mentioned in an event
  const detected = useMemo(() => {
    const lms = db?.lms ?? [];
    if (!lms.length || !catalog.length) return [];
    const texts = lms.map((x) => `${x.course ?? ""} ${x.title} ${x.description ?? ""}`);
    const joined = norm(texts.join(" "));
    return catalog
      .filter((c) => !cp.completed.includes(c.code))
      .filter((c) => joined.includes(norm(c.code)) || (c.name.length > 6 && joined.includes(norm(c.name))) || (c.nameKo && c.nameKo.length > 3 && joined.includes(norm(c.nameKo))))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db?.lms, catalog, cp.completed.join(",")]);

  const lmsCourseNames = useMemo(() => Array.from(new Set((db?.lms ?? []).map((x) => x.course).filter((x): x is string => Boolean(x)))), [db?.lms]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return catalog.filter((c) => !cp.completed.includes(c.code) && `${c.code} ${c.name} ${c.nameKo ?? ""}`.toLowerCase().includes(s)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, catalog, cp.completed.join(",")]);

  const add = (c: Course) => {
    saveCoursePlan({ completed: Array.from(new Set([...cp.completed, c.code])) });
    setQ("");
    toast(L(`Added ${c.code}`, `${c.code} 추가`));
  };
  const remove = (code: string) => saveCoursePlan({ completed: cp.completed.filter((x) => x !== code) });

  const courseNote = (c: Course) => `Took ${c.code} ${c.name}`;
  const inDiary = (c: Course) => (entries ?? []).some((e) => e.source === "course" && e.rawNote === courseNote(c));
  const toDiary = async (c: Course) => {
    setBusy(c.code);
    try {
      await addDiaryEntry({ note: courseNote(c), date: todayISO(), source: "course", lang });
      toast(L("Added to diary", "다이어리에 추가했어요"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="min-w-0">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <BookOpen className="h-5 w-5 text-cv" /> {L("My courses", "내 수업")}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        {L(
          "Pick the courses you've taken or are taking from the DGIST course list (copy them from lms.dgist.ac.kr → Courses). They also count in your Roadmap's course plan.",
          "들었거나 듣고 있는 수업을 DGIST 수업 목록에서 골라요 (lms.dgist.ac.kr → Courses 참고). 로드맵의 수업 계획에도 반영돼요.",
        )}
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder={L("Add a course: code or name (e.g. CSE302, 기계학습)", "수업 추가: 코드 또는 이름 (예: CSE302, 기계학습)")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {results.length > 0 && (
        <ul className="mt-1 max-h-64 overflow-auto rounded-xl border border-slate-100 bg-white">
          {results.map((c) => (
            <li key={c.code}>
              <button onClick={() => add(c)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cv-tint">
                <span className="w-16 shrink-0 font-bold text-cv">{c.code}</span>
                <span className="flex-1 truncate">{name(c)}</span>
                <Plus className="h-4 w-4 text-cv" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {detected.length > 0 && (
        <div className="mt-3 rounded-xl bg-cv-tint/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-cv">
            <Laptop className="h-3.5 w-3.5" /> {L("Found in your LMS calendar — add?", "LMS 캘린더에서 찾았어요 — 추가할까요?")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {detected.map((c) => (
              <Chip key={c.code} color="cv" onClick={() => add(c)}>
                <Plus className="h-3 w-3" /> {c.code} {name(c)}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {detected.length === 0 && lmsCourseNames.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {L("Courses named in your LMS calendar:", "LMS 캘린더에 있는 수업 이름:")} {lmsCourseNames.slice(0, 6).join(", ")}
        </p>
      )}

      {mine.length === 0 ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{L("No courses yet — search above to add yours.", "아직 수업이 없어요 — 위에서 검색해 추가하세요.")}</div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {mine.map((c) => (
            <li key={c.code} className="flex items-center gap-3 py-2.5">
              <span className="w-16 shrink-0 rounded-lg bg-cv-tint py-1 text-center text-xs font-bold text-cv">{c.code}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{name(c)}</div>
                <div className="truncate text-xs text-slate-500">
                  {c.credits} {L("credits", "학점")} · {c.category}
                </div>
              </div>
              {inDiary(c) ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-lab">
                  <Check className="h-4 w-4" /> {L("In diary", "추가됨")}
                </span>
              ) : (
                <Button variant="secondary" color="cv" className="py-1 text-xs" disabled={busy === c.code} onClick={() => toDiary(c)}>
                  <Plus className="h-3.5 w-3.5" /> {L("Diary", "다이어리")}
                </Button>
              )}
              <button onClick={() => remove(c.code)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={L("Remove", "빼기")}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
