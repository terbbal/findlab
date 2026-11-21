"use client";

import clsx from "clsx";
import { useLang } from "@/components/Providers";
import { Card, CATEGORY_STYLE, Skeleton } from "@/components/ui";
import { DeadlineBadge, DeadlineList, NudgeList, useOpportunities } from "@/components/shared/Nudges";
import { bulletOf, useEntries } from "@/lib/client";

export function TimelineTab() {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { entries } = useEntries();
  const ops = useOpportunities();

  const months = new Map<string, NonNullable<typeof entries>>();
  [...(entries ?? [])].sort((a, b) => b.date.localeCompare(a.date)).forEach((e) => {
    const k = e.date.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), e]);
  });
  const monthLabel = (k: string) =>
    new Date(k + "-01T00:00:00").toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long" });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <Card className="min-w-0">
        <h2 className="mb-5 text-lg font-bold">{L("Semester timeline", "학기 타임라인")}</h2>
        {entries === null ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="relative pl-2">
            <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-slate-200" />
            {Array.from(months.entries()).map(([k, es]) => (
              <div key={k} className="mb-6">
                <div className="relative mb-3 ml-10 text-sm font-bold uppercase tracking-wide text-slate-400">{monthLabel(k)}</div>
                <div className="space-y-3">
                  {es.map((e) => {
                    const s = CATEGORY_STYLE[e.category] ?? CATEGORY_STYLE.Other;
                    return (
                      <div key={e.id} className="relative flex gap-3">
                        <div
                          className={clsx(
                            "relative z-10 grid shrink-0 place-items-center rounded-full ring-4 ring-white",
                            e.highlight ? "h-9 w-9 -ml-1 text-base" : "h-7 w-7 text-xs",
                          )}
                          style={{ background: s.tint, color: s.color }}
                        >
                          {s.emoji}
                        </div>
                        <div
                          className={clsx(
                            "min-w-0 flex-1 rounded-xl border p-3",
                            e.highlight ? "border-amber-300 bg-amber-50/60 shadow-sm" : "border-slate-100",
                          )}
                        >
                          <div className="mb-0.5 flex items-center gap-2 text-xs">
                            <span className="font-bold" style={{ color: s.color }}>
                              {e.category}
                            </span>
                            <span className="text-slate-400">{e.date}</span>
                            {e.highlight && <span>⭐</span>}
                          </div>
                          <p className={clsx("text-navy", e.highlight ? "text-base font-semibold" : "text-sm")}>{bulletOf(e)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="min-w-0 space-y-6">
        <Card>
          <h2 className="mb-3 text-lg font-bold">💡 {L("Gaps & nudges", "빈 곳 & 추천")}</h2>
          <NudgeList entryCount={entries?.length ?? null} />
        </Card>
        <Card id="deadlines" className="scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">⏰ {L("Deadlines", "마감 일정")}</h2>
            <DeadlineBadge />
          </div>
          <DeadlineList ops={ops} withIcs />
        </Card>
      </div>
    </div>
  );
}
