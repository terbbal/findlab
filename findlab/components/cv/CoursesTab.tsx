"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, Laptop, Plus } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button, Card, Chip, SampleBadge } from "@/components/ui";
import { addDiaryEntry, api, todayISO, useEntries } from "@/lib/client";
import { addEntry, useDB } from "@/lib/localdb";
import { loadSampleLms } from "@/components/lms/lms";
import Link from "next/link";
import { MyCourses } from "./MyCourses";

type Course = { code: string; title: string; skills: string[] };

const courseNote = (c: Course) => `Took ${c.code} ${c.title} this semester (skills: ${c.skills.join(", ")})`;

export function CoursesTab() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { entries } = useEntries();
  const [courses, setCourses] = useState<Course[]>([]);
  const db = useDB();
  const lms = db?.lms ?? [];
  const [busy, setBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<{ items: Course[] }>("/api/sample?name=courses").then((d) => setCourses(d.items));
  }, []);

  const added = (note: string) => (entries ?? []).some((e) => e.rawNote === note);

  const add = async (key: string, note: string, date: string, source: "course" | "lms") => {
    setBusy((s) => new Set(s).add(key));
    try {
      await addDiaryEntry({ note, date, source, lang });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
      throw e;
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  };

  const addAll = async (items: { key: string; note: string; date: string; source: "course" | "lms" }[]) => {
    const todo = items.filter((i) => !added(i.note));
    for (const i of todo) {
      try {
        await add(i.key, i.note, i.date, i.source);
      } catch {
        break;
      }
    }
    if (todo.length) toast(L(`Added ${todo.length} entries ✨`, `${todo.length}개 기록을 추가했어요 ✨`));
  };

  const AddBtn = ({ k, note, date, source }: { k: string; note: string; date: string; source: "course" | "lms" }) =>
    busy.has(k) ? (
      <div className="w-28">
        <AIThinking lines={0} />
      </div>
    ) : added(note) ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-lab">
        <Check className="h-4 w-4" /> {L("In diary", "추가됨")}
      </span>
    ) : (
      <Button variant="secondary" color="cv" className="py-1.5 text-xs" onClick={() => add(k, note, date, source).then(() => toast(L("Added to diary ✨", "다이어리에 추가했어요 ✨"))).catch(() => {})}>
        <Plus className="h-3.5 w-3.5" /> {L("Add to diary", "다이어리에 추가")}
      </Button>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {L("Your courses come from the DGIST course list; LMS assignments come from your own lms.dgist.ac.kr calendar (Settings → Connect LMS).", "수업은 DGIST 수업 목록에서, LMS 과제는 내 lms.dgist.ac.kr 캘린더에서 가져와요 (설정 → LMS 연결).")}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <MyCourses />
        <Card className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Laptop className="h-5 w-5 text-cv" /> {L("LMS assignments", "LMS 과제")}
            </h2>
            <Link href="/settings#lms" className="text-xs font-semibold text-cv hover:underline">
              {L("Connect LMS →", "LMS 연결 →")}
            </Link>
          </div>
          {lms.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              {L("No LMS items yet. Connect your lms.dgist.ac.kr calendar (iCal link or .ics file) in Settings.", "아직 LMS 항목이 없어요. 설정에서 lms.dgist.ac.kr 캘린더(iCal 링크 또는 .ics 파일)를 연결하세요.")}
              <div className="mt-3">
                <Button variant="secondary" color="cv" className="text-xs" onClick={() => loadSampleLms()}>
                  {L("Try with sample data", "샘플 데이터로 체험")}
                </Button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lms.map((x) => {
                const due = x.due ? x.due.slice(0, 10) : null;
                const past = due ? due < todayISO() : false;
                const inDiary = (entries ?? []).some((e) => e.source === "lms" && e.rawNote === x.title);
                return (
                  <li key={x.uid} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{x.title}</div>
                      <div className="text-xs text-slate-500">
                        {x.course ?? "—"} · {due ? `${L("due", "마감")} ${due}` : L("no due date", "마감일 없음")} {past && <span className="text-slate-400">({L("past", "지남")})</span>}
                      </div>
                    </div>
                    {inDiary ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-lab">
                        <Check className="h-4 w-4" /> {L("In diary", "추가됨")}
                      </span>
                    ) : past ? (
                      <Button
                        variant="secondary"
                        color="cv"
                        className="py-1.5 text-xs"
                        onClick={() => {
                          addEntry({ date: due ?? todayISO(), rawNote: x.title, source: "lms", category: "Course", skills: [], cvBullet: x.title });
                          toast(L("Added to diary", "다이어리에 추가했어요"));
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> {L("Done → diary", "완료 → 다이어리")}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">{L("upcoming", "예정")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
