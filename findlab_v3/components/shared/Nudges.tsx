"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarPlus, Lightbulb } from "lucide-react";
import clsx from "clsx";
import { useLang } from "@/components/Providers";
import { AIThinking, DemoBadge, SampleBadge } from "@/components/ui";
import { api, daysUntil } from "@/lib/client";
import { useDB } from "@/lib/localdb";
import { downloadICS } from "@/lib/ics";
import type { Opportunity } from "@/lib/types";

type Nudge = { title: string; message: string; suggestedAction: string; relatedOpportunityId?: string | null };

export function useOpportunities() {
  const [ops, setOps] = useState<Opportunity[] | null>(null);
  useEffect(() => {
    api<{ opportunities: Opportunity[] }>("/api/opportunities").then((d) => setOps(d.opportunities)).catch(() => setOps([]));
  }, []);
  return ops;
}

/** AI gap nudges; cached per (entry count, language) for the session to avoid repeat calls. */
export function useNudges(entryCount: number | null) {
  const db = useDB();
  const { lang } = useLang();
  const [state, setState] = useState<{ nudges: Nudge[]; demoMode: boolean } | null>(null);
  useEffect(() => {
    if (entryCount === null || !db) return;
    const key = `findlab.gaps.${db.workspace}.${lang}.${entryCount}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) return setState(JSON.parse(cached));
    } catch {}
    setState(null);
    api<{ nudges: Nudge[]; demoMode: boolean }>("/api/cv/gaps", { method: "POST", json: { lang, entries: db.entries } })
      .then((d) => {
        setState(d);
        try {
          sessionStorage.setItem(key, JSON.stringify(d));
        } catch {}
      })
      .catch(() => setState({ nudges: [], demoMode: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryCount, lang, db?.workspace]);
  return state;
}

function actionHref(n: Nudge) {
  if (/lab|연구실/i.test(n.suggestedAction)) return "/labs";
  if (/cv|export|내보내/i.test(n.suggestedAction)) return "/cv?tab=export";
  if (/log|entry|기록/i.test(n.suggestedAction)) return "/cv?tab=diary";
  if (n.relatedOpportunityId) return "/cv?tab=timeline#deadlines";
  return "/labs";
}

export function NudgeList({ entryCount, max = 3 }: { entryCount: number | null; max?: number }) {
  const { lang } = useLang();
  const state = useNudges(entryCount);
  if (!state) return <AIThinking lines={3} />;
  return (
    <div className="space-y-3">
      <DemoBadge show={state.demoMode} />
      {state.nudges.slice(0, max).map((n, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <div className="font-bold">{n.title}</div>
            <p className="text-sm text-slate-600">{n.message}</p>
            <Link href={actionHref(n)} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-mail hover:underline">
              {n.suggestedAction} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ))}
      {state.nudges.length === 0 && <p className="text-sm text-slate-500">{lang === "ko" ? "지금은 추천이 없어요." : "No nudges right now."}</p>}
    </div>
  );
}

export function urgency(days: number) {
  return days <= 7 ? "bg-red-100 text-red-700" : days <= 21 ? "bg-mail-tint text-mail" : "bg-lab-tint text-lab";
}

export function DeadlineList({ ops, limit, withIcs }: { ops: Opportunity[] | null; limit?: number; withIcs?: boolean }) {
  const { lang, t } = useLang();
  if (!ops) return <AIThinking lines={3} />;
  const upcoming = ops.filter((o) => daysUntil(o.deadline) >= 0).slice(0, limit ?? ops.length);
  return (
    <ul className="space-y-2">
      {upcoming.map((o) => {
        const d = daysUntil(o.deadline);
        return (
          <li key={o.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <CalendarClock className="h-5 w-5 shrink-0 text-mail" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{o.name}</div>
              <div className="truncate text-xs text-slate-500">
                {o.deadline} · {o.description}
              </div>
            </div>
            <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", urgency(d))}>
              {d === 0 ? t("common.today") : `D-${d}`}
            </span>
            {withIcs && (
              <button
                onClick={() => downloadICS({ title: `${o.name} deadline`, date: o.deadline, description: o.description })}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-mail"
                title={lang === "ko" ? "캘린더에 추가 (.ics)" : "Add to calendar (.ics)"}
                aria-label="Add to calendar"
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DeadlineBadge() {
  const { lang } = useLang();
  return <SampleBadge text={lang === "ko" ? "샘플 — DGIST 메일 연동은 추후 작업" : "Sample — DGIST mail connection is future work"} />;
}

/** Upcoming LMS deadlines, e.g. "HW3 for Intro to ML — due tomorrow". */
export function LmsReminders({ limit = 3 }: { limit?: number }) {
  const db = useDB();
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const upcoming = (db?.lms ?? []).filter((x) => x.due && daysUntil(x.due.slice(0, 10)) >= 0).slice(0, limit);
  if (!upcoming.length) return null;
  return (
    <ul className="mb-2 space-y-2">
      {upcoming.map((x) => {
        const d = daysUntil(x.due!.slice(0, 10));
        const when = d === 0 ? L("due today", "오늘 마감") : d === 1 ? L("due tomorrow", "내일 마감") : L(`due in ${d} days`, `${d}일 후 마감`);
        return (
          <li key={x.uid} className="flex items-center gap-3 rounded-xl bg-cv-tint/70 p-3">
            <span className="rounded bg-cv px-1.5 py-0.5 text-[10px] font-bold text-white">LMS</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">
                {x.title}
                {x.course && <span className="font-normal text-slate-500"> {L("for", "·")} {x.course}</span>}
              </div>
            </div>
            <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", urgency(d))}>{when}</span>
          </li>
        );
      })}
    </ul>
  );
}
