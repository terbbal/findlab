"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, BookOpenCheck, CalendarRange, CheckCircle2, CircleDashed, Compass, GraduationCap, NotebookPen, Search, X } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Card, Chip, Skeleton } from "@/components/ui";
import { LabPhoto } from "@/components/labs/LabPhoto";
import { api } from "@/lib/client";
import { buildCoursePlan, type PlanCourse, type PlanSkill } from "@/lib/courseplan";
import { DEFAULT_COURSE_PLAN, saveCoursePlan, useDB } from "@/lib/localdb";
import type { Course, Lab, LabIndexItem, Skill } from "@/lib/types";

type CourseData = { courses: Course[]; skills: Skill[]; meta: { source: string; terms: string[]; snapshot: string } };

const GRADES = [1, 2, 3, 4].flatMap((g) => [1, 2].map((s) => ({ g, s: s as 1 | 2 }))).filter((x) => !(x.g === 4 && x.s === 2));

export function CoursePlanView({ index }: { index: LabIndexItem[] }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const cp = { ...DEFAULT_COURSE_PLAN, ...db?.coursePlan };
  const [data, setData] = useState<CourseData | null>(null);
  const [labs, setLabs] = useState<Record<string, Lab>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    api<CourseData>("/api/courses").then(setData);
  }, []);
  const labKey = cp.labIds.join(",");
  useEffect(() => {
    cp.labIds
      .filter((id) => !labs[id])
      .forEach((id) => api<{ lab: Lab }>(`/api/labs/${id}`).then((d) => setLabs((m) => ({ ...m, [id]: d.lab }))).catch(() => {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labKey]);

  const courseMap = useMemo(() => new Map((data?.courses ?? []).map((c) => [c.code, c])), [data]);
  const skillMap = useMemo(() => new Map((data?.skills ?? []).map((s) => [s.name, s])), [data]);
  const diarySkills = useMemo(() => Array.from(new Set((db?.entries ?? []).flatMap((e) => e.skills))), [db]);
  const selectedLabs = cp.labIds.map((id) => labs[id]).filter(Boolean);

  const plan = useMemo(() => {
    if (!data) return null;
    return buildCoursePlan({
      labs: selectedLabs,
      settings: cp,
      diarySkills,
      getCourse: (c) => courseMap.get(c),
      getSkill: (n) => skillMap.get(n) ?? { name: n, courses: [], reasons: {} },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedLabs.length, labKey, cp.grade, cp.semester, cp.maxCredits, cp.completed.join(","), diarySkills.join(",")]);

  const courseName = (c: Course) => (lang === "ko" ? c.nameKo || c.name : c.name);
  const labLabel = (id: string) => {
    const l = index.find((x) => x.id === id);
    return l ? ((lang === "ko" ? l.nameKo || l.nameEn : l.nameEn || l.nameKo) ?? "—") : "…";
  };
  const semLabel = (g: number, s: 1 | 2) => (lang === "ko" ? `${g}학년 ${s}학기` : `Year ${g} · ${s === 1 ? "Spring" : "Fall"}`);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !data) return [];
    return data.courses.filter((c) => !cp.completed.includes(c.code) && `${c.code} ${c.name} ${c.nameKo ?? ""}`.toLowerCase().includes(s)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, data, cp.completed.join(",")]);

  if (!db || !data) return <Skeleton className="h-[420px]" />;

  const skillReason = (skill: string, code: string) => skillMap.get(skill)?.reasons[code];

  return (
    <div className="space-y-5">
      {/* ① Labs + student settings */}
      <Card>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          <Compass className="h-4 w-4" /> {L("Labs I'm interested in", "관심 연구실")}
        </div>
        {cp.labIds.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">{L("Pick labs on the left — each one you click is added here.", "왼쪽에서 연구실을 누르면 여기에 추가돼요. 여러 곳을 고를 수 있어요.")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cp.labIds.map((id) => {
              const l = index.find((x) => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 text-sm">
                  <LabPhoto src={l?.photoUrl ?? null} alt="" size={24} />
                  <span className="font-semibold">{labLabel(id)}</span>
                  <span className="max-w-[180px] truncate text-xs text-slate-500">{l?.labName}</span>
                  <button onClick={() => saveCoursePlan({ labIds: cp.labIds.filter((x) => x !== id) })} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-navy" aria-label={L("Remove", "빼기")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[auto_auto_1fr]">
          <label className="text-xs font-semibold text-slate-500">
            {L("Now in", "현재 학기")}
            <select
              className="input mt-1 w-auto"
              value={`${cp.grade}-${cp.semester}`}
              onChange={(e) => {
                const [g, s] = e.target.value.split("-").map(Number);
                saveCoursePlan({ grade: g, semester: s as 1 | 2 });
              }}
            >
              {GRADES.map(({ g, s }) => (
                <option key={`${g}-${s}`} value={`${g}-${s}`}>
                  {semLabel(g, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            {L("Max credits / semester", "학기당 최대 학점")}
            <input type="number" min={3} max={24} className="input mt-1 w-24" value={cp.maxCredits} onChange={(e) => saveCoursePlan({ maxCredits: Math.max(3, Math.min(24, Number(e.target.value) || 18)) })} />
          </label>
          <div className="relative text-xs font-semibold text-slate-500">
            {L("Courses I've taken", "이수한 과목")}
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 font-normal" placeholder={L("Search by code or name (e.g. CSE302, 프로그래밍)", "과목 코드나 이름으로 검색 (예: CSE302, 프로그래밍)")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-100 bg-white p-1 font-normal shadow-soft">
                {results.map((c) => (
                  <li key={c.code}>
                    <button
                      onClick={() => {
                        saveCoursePlan({ completed: [...cp.completed, c.code] });
                        setQ("");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-mono text-xs text-slate-500">{c.code}</span>
                      <span className="flex-1 truncate">{courseName(c)}</span>
                      <span className="text-xs text-slate-400">{c.credits}{L("cr", "학점")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {cp.completed.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cp.completed.map((code) => {
              const c = courseMap.get(code);
              return (
                <Chip key={code} color="lab">
                  <CheckCircle2 className="h-3 w-3" /> {code} {c ? courseName(c) : ""}
                  <button onClick={() => saveCoursePlan({ completed: cp.completed.filter((x) => x !== code) })} aria-label={L("Remove", "빼기")} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </Chip>
              );
            })}
          </div>
        )}
      </Card>

      {plan && selectedLabs.length > 0 && (
        <>
          {/* ② Skills (merged across labs) */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold">{L("Skills these labs use", "이 연구실들이 쓰는 스킬")}</h2>
              <span className="text-sm font-semibold text-mail">
                {L(`${plan.ready}/${plan.total} skills ready`, `${plan.ready}/${plan.total} 스킬 준비 완료`)}
              </span>
              <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-mail-tint">
                <div className="h-full rounded-full bg-mail transition-all" style={{ width: `${plan.total ? (plan.ready / plan.total) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <Legend s="done-course" /> <Legend s="done-diary" /> <Legend s="planned" /> <Legend s="external" />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {plan.skills.map((s) => (
                <SkillRow key={s.name} s={s} courseMap={courseMap} labLabel={labLabel} />
              ))}
            </ul>
          </Card>

          {/* ③ Semester plan */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CalendarRange className="h-5 w-5 text-mail" />
              <h2 className="text-lg font-bold">{L("Semester plan", "학기별 수강 계획")}</h2>
              <span className="text-xs text-slate-500">
                {L(`From ${semLabel(cp.grade, cp.semester)} onward · max ${cp.maxCredits} credits`, `${semLabel(cp.grade, cp.semester)} 다음 학기부터 · 학기당 최대 ${cp.maxCredits}학점`)}
              </span>
            </div>
            {plan.semesters.length === 0 ? (
              <p className="text-sm text-slate-500">{L("No semesters left to plan.", "계획할 남은 학기가 없어요.")}</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {plan.semesters.map((sem) => (
                  <div key={`${sem.grade}-${sem.semester}`} className={clsx("rounded-xl border p-3", sem.courses.length ? "border-mail/30 bg-mail-tint/30" : "border-dashed border-slate-200")}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-bold">
                        {semLabel(sem.grade, sem.semester)} <span className="font-semibold text-slate-400">· {sem.season}</span>
                      </div>
                      <span className="text-xs font-semibold text-mail">
                        {sem.credits}/{cp.maxCredits}
                        {L(" cr", "학점")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sem.courses.map((c) => (
                        <CourseCard key={c.code} c={c} name={courseName(c.course)} reason={skillReason} labLabel={labLabel} />
                      ))}
                      {!sem.courses.length && <p className="py-2 text-center text-xs text-slate-400">{L("Free for other requirements", "다른 졸업요건용으로 비워 둠")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {plan.unscheduled.length > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-4 w-4" /> {L("Didn't fit in the remaining semesters", "남은 학기에 넣지 못한 과목")}
                </div>
                {plan.unscheduled.map((c) => (
                  <div key={c.code}>
                    {c.code} {courseName(c.course)} ({c.course.semester.join("/")}) — {c.skills.join(", ")}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ④ Completed */}
          {plan.completed.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-lab" />
                <h2 className="text-lg font-bold">{L("Already taken", "이수 완료")}</h2>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {plan.completed.map((c) => (
                  <CourseCard key={c.code} c={c} name={courseName(c.course)} reason={skillReason} labLabel={labLabel} done />
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <p className="px-1 text-xs text-slate-500">
        {L(
          `Courses: DGIST undergraduate course lookup (${data.meta.terms.join(", ")}), snapshot ${data.meta.snapshot}. The source has no prerequisite data, so courses are ordered by course level (100→400 by year) and the semester they are offered — check the official curriculum before registering.`,
          `과목: DGIST 학부 개설과목 조회(${data.meta.terms.join(", ")}), ${data.meta.snapshot} 기준. 원본에 선수과목 정보가 없어서 과목 번호 수준(100→400, 학년 순)과 개설 학기로 배치했어요. 수강 신청 전 공식 교육과정을 꼭 확인하세요.`,
        )}
      </p>
    </div>
  );
}

const STATUS_STYLE: Record<PlanSkill["status"], { icon: typeof CheckCircle2; cls: string; en: string; ko: string }> = {
  "done-course": { icon: BookOpenCheck, cls: "text-lab", en: "Covered by a course you took", ko: "이수 과목으로 충족" },
  "done-diary": { icon: NotebookPen, cls: "text-cv", en: "Shown in your diary", ko: "다이어리로 충족" },
  planned: { icon: CalendarRange, cls: "text-mail", en: "Planned course", ko: "수강 계획됨" },
  unscheduled: { icon: AlertTriangle, cls: "text-amber-600", en: "Doesn't fit", ko: "배치 못 함" },
  external: { icon: CircleDashed, cls: "text-slate-400", en: "No DGIST course → learn outside", ko: "DGIST 과목 없음 → 외부 학습 필요" },
};

function Legend({ s }: { s: PlanSkill["status"] }) {
  const { lang } = useLang();
  const st = STATUS_STYLE[s];
  return (
    <span className="inline-flex items-center gap-1">
      <st.icon className={clsx("h-3.5 w-3.5", st.cls)} /> {lang === "ko" ? st.ko : st.en}
    </span>
  );
}

function SkillRow({ s, courseMap, labLabel }: { s: PlanSkill; courseMap: Map<string, Course>; labLabel: (id: string) => string }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const st = STATUS_STYLE[s.status];
  const done = s.status === "done-course" || s.status === "done-diary";
  return (
    <li className={clsx("rounded-xl border p-3 text-sm", done ? "border-lab/40 bg-lab-tint/50" : s.status === "external" ? "border-dashed border-slate-200" : "border-slate-100")}>
      <div className="flex items-center gap-2">
        <st.icon className={clsx("h-4 w-4 shrink-0", st.cls)} />
        <span className="font-semibold">{s.name}</span>
        <span className={clsx("ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold", s.importance === "core" ? "bg-mail text-white" : "bg-mail-tint text-mail")}>{s.importance}</span>
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{s.labIds.map(labLabel).join(" · ")}</div>
      {s.status === "external" ? (
        <p className="mt-1 text-xs font-semibold text-slate-500">{L("No DGIST course → learn outside DGIST", "DGIST 과목 없음 → 외부 학습 필요")}</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {s.courses.map((code) => (
            <span
              key={code}
              title={courseMap.get(code)?.nameKo ?? ""}
              className={clsx("rounded-md px-1.5 py-0.5 font-mono text-[11px]", code === s.by ? (done ? "bg-lab text-white" : "bg-mail text-white") : "bg-slate-100 text-slate-500")}
            >
              {code}
            </span>
          ))}
          {s.status === "done-diary" && <span className="text-[11px] text-cv">{L("· from your diary", "· 다이어리 기록")}</span>}
        </div>
      )}
    </li>
  );
}

function CourseCard({ c, name, reason, labLabel, done }: { c: PlanCourse; name: string; reason: (skill: string, code: string) => string | undefined; labLabel: (id: string) => string; done?: boolean }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start gap-2">
        <GraduationCap className={clsx("mt-0.5 h-4 w-4 shrink-0", done ? "text-lab" : "text-mail")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-slate-500">{c.code}</span>
            {done && <span className="rounded-full bg-lab px-1.5 py-0.5 text-[10px] font-bold text-white">{L("Taken", "이수 완료")}</span>}
            <span className="ml-auto shrink-0 text-[11px] text-slate-400">
              {c.course.credits}
              {L("cr", "학점")} · {c.course.semester.join("/")}
            </span>
          </div>
          <div className="text-sm font-semibold leading-snug">{name}</div>
        </div>
      </div>
      {c.skills.length > 0 ? (
        <div className="mt-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{L("Skills this course fills", "이 과목이 채워주는 skill")}</div>
          <div className="flex flex-wrap gap-1">
            {c.skills.map((s) => (
              <span key={s} title={reason(s, c.code) ?? ""} className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", done ? "bg-lab-tint text-lab" : "bg-mail-tint text-mail")}>
                {s}
              </span>
            ))}
          </div>
          <div className="mt-1 truncate text-[10px] text-slate-400">{c.labIds.map(labLabel).join(" · ")}</div>
        </div>
      ) : (
        done && <div className="mt-1 text-[11px] text-slate-400">{L("Not linked to these labs' skills", "선택한 연구실 스킬과는 연결 없음")}</div>
      )}
    </div>
  );
}
