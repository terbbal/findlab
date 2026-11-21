"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Card, CATEGORY_STYLE } from "@/components/ui";
import { useOpportunities } from "@/components/shared/Nudges";
import { todayISO, useEntries } from "@/lib/client";
import { useDB } from "@/lib/localdb";
import { EntryCard } from "./EntryCard";

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
        </div>
      </Card>
      <div className="space-y-3">
        <h3 className="font-bold">{selected}</h3>
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
        {byDate(selected).length === 0 && opsOn(selected).length === 0 && lmsOn(selected).length === 0 && (
          <Card className="text-center text-sm text-slate-500">{L("Nothing on this day.", "이 날은 기록이 없어요.")}</Card>
        )}
      </div>
    </div>
  );
}
