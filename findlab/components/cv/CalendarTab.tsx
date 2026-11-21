"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { CalendarClock, ChevronLeft, ChevronRight, Flag, Trash2 } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Card, CATEGORY_STYLE } from "@/components/ui";
import { useOpportunities } from "@/components/shared/Nudges";
import { InlineConfirm } from "@/components/shared/InlineConfirm";
import { todayISO, useEntries } from "@/lib/client";
import { deletePlan, updatePlan, useDB } from "@/lib/localdb";
import type { SchedulePlan } from "@/lib/types";
import { EntryCard } from "./EntryCard";

/** One plan with a done checkbox and delete. */
function PlanRow({ p, showDate, onSelect }: { p: SchedulePlan; showDate?: boolean; onSelect?: () => void }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const when = new Date(p.date + "T00:00:00").toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", weekday: "short" });
  return (
    <div className={clsx("flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm", p.done && "opacity-60")}>
      <input
        type="checkbox"
        checked={Boolean(p.done)}
        onChange={(e) => updatePlan(p.id, { done: e.target.checked })}
        className="mt-0.5 h-4 w-4 accent-amber-500"
        aria-label={L("Done", "완료")}
      />
      <button type="button" onClick={onSelect} className={clsx("min-w-0 flex-1 text-left", !onSelect && "cursor-default")}>
        <div className={clsx("font-semibold text-navy", p.done && "line-through")}>📅 {p.title}</div>
        <div className="text-xs text-slate-500">
          {showDate && `${when} · `}
          {p.approx === "week" ? L("sometime that week", "그 주 중") : p.approx === "month" ? L("sometime that month", "그 달 중") : null}
          {p.rawNote !== p.title && <span className="block truncate text-slate-400">“{p.rawNote}”</span>}
        </div>
      </button>
      <InlineConfirm
        question={L("Delete?", "삭제할까요?")}
        onConfirm={() => deletePlan(p.id)}
        triggerClassName="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        triggerLabel={L("Delete plan", "일정 삭제")}
      >
        <Trash2 className="h-4 w-4" />
      </InlineConfirm>
    </div>
  );
}

export function CalendarTab() {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { entries } = useEntries();
  const ops = useOpportunities();
  const db = useDB();
  const lmsOn = (iso: string) => (db?.lms ?? []).filter((x) => x.due?.slice(0, 10) === iso);
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string>(today);

  const days = useMemo(() => {
    const first = new Date(month + "-01T00:00:00");
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      return iso;
    });
  }, [month]);

  const shift = (n: number) => {
    const d = new Date(month + "-01T00:00:00");
    d.setMonth(d.getMonth() + n);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const byDate = (iso: string) => (entries ?? []).filter((e) => e.date === iso);
  const plans = db?.plans ?? [];
  const plansOn = (iso: string) => plans.filter((p) => p.date === iso);
  const upcoming = plans.filter((p) => !p.done && p.date >= today).slice(0, 5);
  const opsOn = (iso: string) => (ops ?? []).filter((o) => o.deadline === iso);
  const weekdays = lang === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">
            {new Date(month + "-01T00:00:00").toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long" })}
          </h2>
          <button onClick={() => shift(1)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
          {weekdays.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((iso) => {
            const es = byDate(iso);
            const os = opsOn(iso);
            const inMonth = iso.startsWith(month);
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={clsx(
                  "flex aspect-square flex-col items-start rounded-xl border p-1.5 text-left text-sm transition md:aspect-[1.2]",
                  inMonth ? "bg-white" : "bg-slate-50 text-slate-300",
                  selected === iso ? "border-cv ring-2 ring-cv/20" : "border-slate-100 hover:border-cv/40",
                )}
              >
                <span className={clsx("grid h-6 w-6 place-items-center rounded-full text-xs font-semibold", iso === today && "bg-navy text-white")}>
                  {Number(iso.slice(8))}
                </span>
                <div className="mt-auto flex flex-wrap items-center gap-0.5">
                  {es.map((e) => (
                    <span key={e.id} className="h-2 w-2 rounded-full" style={{ background: (CATEGORY_STYLE[e.category] ?? CATEGORY_STYLE.Other).color }} />
                  ))}
                  {os.map((o) => (
                    <Flag key={o.id} className="h-3.5 w-3.5 fill-mail text-mail" />
                  ))}
                  {lmsOn(iso).map((x) => (
                    <span key={x.uid} className="rounded bg-cv px-1 text-[9px] font-bold text-white">LMS</span>
                  ))}
                  {plansOn(iso).map((p) => (
                    <span
                      key={p.id}
                      title={p.title}
                      className={clsx("max-w-full truncate rounded bg-amber-400 px-1 text-[9px] font-bold text-white", p.done && "opacity-40 line-through")}
                    >
                      {p.title}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          {Object.entries(CATEGORY_STYLE).map(([c, s]) => (
            <span key={c} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {c}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <Flag className="h-3 w-3 fill-mail text-mail" /> {L("Deadline", "마감")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-amber-400" /> {L("My plan", "내 일정")}
          </span>
        </div>
      </Card>
      <div className="space-y-3">
        <Card className="space-y-2">
          <div className="flex items-center gap-1.5 font-bold">
            <CalendarClock className="h-4 w-4 text-amber-500" /> {L("Upcoming plans", "다가오는 일정")}
          </div>
          {upcoming.length ? (
            upcoming.map((p) => (
              <PlanRow
                key={p.id}
                p={p}
                showDate
                onSelect={() => {
                  setSelected(p.date);
                  setMonth(p.date.slice(0, 7));
                }}
              />
            ))
          ) : (
            <p className="text-xs text-slate-500">
              {L(
                'Write a note like "next Monday: math exam" in the diary and save it as a plan.',
                '다이어리에 "다음주 월요일에 수학 시험"처럼 쓰면 일정으로 저장할 수 있어요.',
              )}
            </p>
          )}
        </Card>
        <h3 className="font-bold">{selected}</h3>
        {plansOn(selected).map((p) => (
          <PlanRow key={p.id} p={p} />
        ))}
        {opsOn(selected).map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-xl bg-mail-tint p-3 text-sm font-semibold text-mail">
            <Flag className="h-4 w-4 fill-mail" /> {o.name} {L("deadline", "마감")}
          </div>
        ))}
        {lmsOn(selected).map((x) => (
          <div key={x.uid} className="rounded-xl bg-cv-tint p-3 text-sm">
            <span className="font-bold text-cv">LMS</span> · {x.title} {x.course && <span className="text-slate-500">({x.course})</span>}
          </div>
        ))}
        {byDate(selected).map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
        {byDate(selected).length === 0 && opsOn(selected).length === 0 && lmsOn(selected).length === 0 && plansOn(selected).length === 0 && (
          <Card className="text-center text-sm text-slate-500">{L("Nothing on this day.", "이 날은 기록이 없어요.")}</Card>
        )}
      </div>
    </div>
  );
}
