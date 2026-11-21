"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Chip, SampleBadge, Skeleton } from "@/components/ui";
import { api } from "@/lib/client";
import type { Lab } from "@/lib/types";
import { RecruitingBadge, ScholarBadge } from "./LabCard";

const PAGE = 24;

export function LabBrowser({ currentId }: { currentId?: string }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const [labs, setLabs] = useState<Lab[] | null>(null);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    api<{ labs: Lab[] }>("/api/labs").then((d) => setLabs(d.labs)).catch(() => setLabs([]));
  }, []);

  // Department counts (DGIST Scholar labs), biggest first; sample labs get their own bucket.
  const depts = useMemo(() => {
    const m = new Map<string, number>();
    (labs ?? []).forEach((l) => l.department && m.set(l.department, (m.get(l.department) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [labs]);
  const hasSamples = (labs ?? []).some((l) => l.isSample);

  const shown = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = (labs ?? []).filter((l) => {
      // "Recruiting now" means a real source said so — the fictional sample labs don't count.
      if (openOnly && (l.isSample || l.recruiting.status !== "Recruiting")) return false;
      if (dept === "__sample" ? !l.isSample : dept && l.department !== dept) return false;
      if (!terms.length) return true;
      const hay = [l.name, l.professor ?? "", l.professorKo ?? "", l.department ?? "", l.plainSummary, l.plainSummaryKo ?? "", ...l.researchAreas, ...l.keywords, ...(l.fields ?? [])]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    // Labs you can apply to now come first.
    const rank = (l: Lab) => (l.recruiting.status === "Recruiting" ? 0 : l.recruiting.status === "Unknown" ? 1 : 2);
    return list.sort((a, b) => rank(a) - rank(b));
  }, [labs, q, dept, openOnly]);
  const openCount = useMemo(() => (labs ?? []).filter((l) => !l.isSample && l.recruiting.status === "Recruiting").length, [labs]);

  useEffect(() => setLimit(PAGE), [q, dept, openOnly]);

  return (
    <section id="browse" className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">{L("Browse all labs", "전체 연구실 보기")}</h2>
        {labs && (
          <span className="text-xs text-slate-500">
            {L(`${shown.length} of ${labs.length} labs`, `${labs.length}개 중 ${shown.length}개`)} ·{" "}
            <a href="https://scholar.dgist.ac.kr/browse-researcher" target="_blank" rel="noreferrer" className="text-lab hover:underline">
              {L("Source: DGIST Scholar", "출처: DGIST Scholar")}
            </a>
          </span>
        )}
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder={L("Search labs, topics, professors, departments…", "연구실, 주제, 교수님, 학과 검색…")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-[#0C8F6F]" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
        {L(`Only labs recruiting now (${openCount})`, `지금 신청 가능한 연구실만 (${openCount})`)}
        <a
          href="https://phdkim.net/professor/open-lab"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-normal text-slate-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {L("via 김박사넷 open lab", "김박사넷 오픈랩 기준")}
        </a>
      </label>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip color="lab" active={!dept} onClick={() => setDept(null)}>
          {L("All departments", "전체 학과")}
        </Chip>
        {depts.map(([d, n]) => (
          <Chip key={d} color="lab" active={dept === d} onClick={() => setDept(dept === d ? null : d)}>
            {d} <span className="opacity-60">{n}</span>
          </Chip>
        ))}
        {hasSamples && (
          <Chip color="lab" active={dept === "__sample"} onClick={() => setDept(dept === "__sample" ? null : "__sample")}>
            {L("Sample labs", "샘플 연구실")}
          </Chip>
        )}
      </div>
      {labs === null ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shown.slice(0, limit).map((l) => (
              <Link
                key={l.id}
                href={`/labs/${l.id}`}
                className={`rounded-2xl bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${l.id === currentId ? "ring-2 ring-lab" : ""}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <RecruitingBadge status={l.recruiting.status} />
                  {l.isSample && <SampleBadge />}
                  {l.source === "dgist-scholar" && <ScholarBadge />}
                </div>
                <div className="font-bold">{l.name}</div>
                <div className="mb-2 text-xs text-slate-500">
                  {l.professor ?? "—"}
                  {l.department && <span className="block truncate text-slate-400">{l.department}</span>}
                </div>
                <p className="line-clamp-2 text-sm text-slate-600">{lang === "ko" && l.plainSummaryKo ? l.plainSummaryKo : l.plainSummary}</p>
              </Link>
            ))}
            {shown.length === 0 && <p className="text-sm text-slate-500">{L("No labs found.", "검색 결과가 없어요.")}</p>}
          </div>
          {shown.length > limit && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-lab hover:bg-lab-tint"
              >
                {L(`Show more (${shown.length - limit} left)`, `더 보기 (${shown.length - limit}개 남음)`)}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
