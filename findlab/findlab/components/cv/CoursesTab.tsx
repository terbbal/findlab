"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, Laptop, Plus } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button, Card, Chip, SampleBadge } from "@/components/ui";
import { addDiaryEntry, api, todayISO, useEntries } from "@/lib/client";

type Course = { code: string; title: string; skills: string[] };
type LmsItem = { id: string; title: string; course: string; date: string; description: string };

const courseNote = (c: Course) => `Took ${c.code} ${c.title} this semester (skills: ${c.skills.join(", ")})`;
const lmsNote = (x: LmsItem) => `${x.title} — ${x.course}: ${x.description}`;

export function CoursesTab() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { entries } = useEntries();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lms, setLms] = useState<LmsItem[]>([]);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<{ items: Course[] }>("/api/sample?name=courses").then((d) => setCourses(d.items));
    api<{ items: LmsItem[] }>("/api/sample?name=lms").then((d) => setLms(d.items));
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
        <SampleBadge text={L("Sample data", "샘플 데이터")} />
        {L("Real LMS connection coming soon — these are sample courses and assignments.", "실제 LMS 연동은 곧 지원돼요 — 지금은 샘플 수업과 과제예요.")}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <BookOpen className="h-5 w-5 text-cv" /> {L("This semester's courses", "이번 학기 수업")}
            </h2>
            <Button
              color="cv"
              className="py-1.5 text-xs"
              onClick={() => addAll(courses.map((c) => ({ key: c.code, note: courseNote(c), date: todayISO(), source: "course" as const })))}
            >
              {L("Add all", "모두 추가")}
            </Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {courses.map((c) => (
              <li key={c.code} className="flex items-center gap-3 py-3">
                <span className="w-14 shrink-0 rounded-lg bg-cv-tint py-1 text-center text-xs font-bold text-cv">{c.code}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.skills.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>
                </div>
                <AddBtn k={c.code} note={courseNote(c)} date={todayISO()} source="course" />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Laptop className="h-5 w-5 text-cv" /> {L("LMS assignments & projects", "LMS 과제 & 프로젝트")}
            </h2>
            <Button
              color="cv"
              className="py-1.5 text-xs"
              onClick={() => addAll(lms.map((x) => ({ key: x.id, note: lmsNote(x), date: x.date, source: "lms" as const })))}
            >
              {L("Add all", "모두 추가")}
            </Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {lms.map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{x.title}</div>
                  <div className="text-xs text-slate-500">
                    {x.course} · {x.date}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{x.description}</p>
                </div>
                <AddBtn k={x.id} note={lmsNote(x)} date={x.date} source="lms" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
