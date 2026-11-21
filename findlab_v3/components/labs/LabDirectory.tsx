"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Heart, Search, SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLang } from "@/components/Providers";
import { Skeleton } from "@/components/ui";
import { api } from "@/lib/client";
import { useDB } from "@/lib/localdb";
import type { LabIndexItem } from "@/lib/types";
import { LabGridCard } from "./LabGridCard";

type Sort = "az" | "pubs" | "recent";
const THIS_YEAR = new Date().getFullYear();

export function LabDirectory({ savedOnly = false }: { savedOnly?: boolean }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const [labs, setLabs] = useState<LabIndexItem[] | null>(null);
  const [crawledAt, setCrawledAt] = useState<string>("");
  const [q, setQ] = useState("");
  const [depts, setDepts] = useState<string[]>([]);
  const [chip, setChip] = useState<string | null>(null);
  const [hasSite, setHasSite] = useState(false);
  const [recent, setRecent] = useState(false);
  const [sort, setSort] = useState<Sort>("az");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
  }, []);

  useEffect(() => {
    api<{ labs: LabIndexItem[]; meta: { crawledAt: string } }>("/api/labs")
      .then((d) => {
        setLabs(d.labs);
        setCrawledAt(d.meta.crawledAt);
      })
      .catch(() => setLabs([]));
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(labs ?? [], {
        keys: [
          { name: "nameEn", weight: 3 },
          { name: "nameKo", weight: 3 },
          { name: "labName", weight: 2.5 },
          { name: "interests", weight: 2 },
          { name: "keywords", weight: 1.5 },
          { name: "department", weight: 1 },
          { name: "paperTitles", weight: 1 },
        ],
        threshold: 0.33,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [labs],
  );

  const deptCounts = useMemo(() => {
    const m = new Map<string, number>();
    (labs ?? []).forEach((l) => m.set(l.department ?? "Not listed", (m.get(l.department ?? "Not listed") ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [labs]);

  const topChips = useMemo(() => {
    const m = new Map<string, number>();
    (labs ?? []).forEach((l) => l.interests.forEach((i) => m.set(i.toLowerCase(), (m.get(i.toLowerCase()) ?? 0) + 1)));
    return Array.from(m.entries())
      .filter(([k]) => k.length < 28)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([k]) => k);
  }, [labs]);

  const shown = useMemo(() => {
    if (!labs) return [];
    const query = [q.trim(), chip ?? ""].filter(Boolean).join(" ");
    let list = query ? fuse.search(query).map((r) => r.item) : [...labs];
    if (savedOnly) list = list.filter((l) => db?.savedLabs.includes(l.id));
    if (depts.length) list = list.filter((l) => depts.includes(l.department ?? "Not listed"));
    if (hasSite) list = list.filter((l) => l.hasWebsite);
    if (recent) list = list.filter((l) => (l.latestYear ?? 0) >= THIS_YEAR - 1);
    if (!query || sort !== "az") {
      const name = (l: LabIndexItem) => (lang === "ko" ? l.nameKo || l.nameEn : l.nameEn || l.nameKo) ?? "";
      list.sort((a, b) =>
        sort === "pubs"
          ? (b.publicationCount ?? 0) - (a.publicationCount ?? 0)
          : sort === "recent"
            ? (b.latestYear ?? 0) - (a.latestYear ?? 0)
            : name(a).localeCompare(name(b), lang === "ko" ? "ko" : "en"),
      );
    }
    return list;
  }, [labs, q, chip, fuse, savedOnly, db, depts, hasSite, recent, sort, lang]);

  const activeFilters = depts.length + (hasSite ? 1 : 0) + (recent ? 1 : 0) + (chip ? 1 : 0);

  return (
    <div>
      <PageHeader step="labs" title={savedOnly ? L("Saved labs", "저장한 연구실") : L("Every DGIST lab, in one place", "DGIST의 모든 연구실")}>
        {savedOnly ? (
          <Link href="/labs" className="text-sm font-semibold text-navy hover:underline">
            {L("← All labs", "← 전체 연구실")}
          </Link>
        ) : (
          <Link href="/labs/saved" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-500 hover:underline">
            <Heart className="h-4 w-4" fill="currentColor" /> {L("Saved", "저장함")} ({db?.savedLabs.length ?? 0})
          </Link>
        )}
      </PageHeader>

      <div className="sticky top-[60px] z-20 -mx-4 mb-4 overflow-hidden bg-cream/95 px-4 pb-3 pt-1 backdrop-blur md:top-[64px]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input h-12 pl-11 text-base"
              placeholder={L("Search professors, labs, topics, papers… (e.g. robot, 배터리, CRISPR)", "교수님, 연구실, 주제, 논문 검색… (예: robot, 배터리, CRISPR)")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search labs"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Clear">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={clsx("inline-flex h-12 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold lg:hidden", activeFilters ? "border-navy bg-navy text-white" : "border-slate-200 bg-white")}
          >
            <SlidersHorizontal className="h-4 w-4" /> {activeFilters || ""}
          </button>
          <select className="input hidden h-12 w-44 sm:block" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
            <option value="az">{L("A–Z", "이름순")}</option>
            <option value="pubs">{L("Most publications", "논문 많은 순")}</option>
            <option value="recent">{L("Most recent paper", "최근 논문 순")}</option>
          </select>
        </div>
        <div className="mt-2 flex w-full max-w-full gap-1.5 overflow-x-auto pb-1">
          {topChips.map((c) => (
            <button
              key={c}
              onClick={() => setChip(chip === c ? null : c)}
              className={clsx("shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition", chip === c ? "bg-navy text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50")}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
        <aside className={clsx("space-y-5 lg:block", showFilters ? "block" : "hidden")}>
          <div className="sm:hidden">
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{L("Sort", "정렬")}</div>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="az">{L("A–Z", "이름순")}</option>
              <option value="pubs">{L("Most publications", "논문 많은 순")}</option>
              <option value="recent">{L("Most recent paper", "최근 논문 순")}</option>
            </select>
          </div>
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-soft">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={hasSite} onChange={(e) => setHasSite(e.target.checked)} className="accent-[#1F2430]" />
              {L("Has lab website", "연구실 홈페이지 있음")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={recent} onChange={(e) => setRecent(e.target.checked)} className="accent-[#1F2430]" />
              {L("Published in the last 2 years", "최근 2년 내 논문")}
            </label>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{L("Department", "학과")}</span>
              {depts.length > 0 && (
                <button onClick={() => setDepts([])} className="text-xs font-semibold text-slate-500 hover:underline">
                  {L("Clear", "초기화")}
                </button>
              )}
            </div>
            <div className="max-h-80 space-y-1 overflow-auto pr-1">
              {deptCounts.map(([d, n]) => (
                <label key={d} className="flex cursor-pointer items-start gap-2 rounded-lg p-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-[#1F2430]"
                    checked={depts.includes(d)}
                    onChange={() => setDepts((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]))}
                  />
                  <span className="flex-1 leading-snug">{d.replace(/^Department of /, "")}</span>
                  <span className="text-xs text-slate-400">{n}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 text-sm text-slate-500">
            {labs ? L(`${shown.length} of ${labs.length} researchers`, `${labs.length}명 중 ${shown.length}명`) : ""}
            {crawledAt && <span className="text-slate-400"> · {L("data from DGIST Scholar", "DGIST Scholar 데이터")} ({crawledAt})</span>}
          </div>
          {labs === null ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-soft">
              {savedOnly ? L("No saved labs yet — tap ♡ on any lab.", "아직 저장한 연구실이 없어요 — ♡를 눌러 저장하세요.") : L("No labs match. Try fewer filters.", "결과가 없어요. 필터를 줄여 보세요.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((l) => (
                <LabGridCard key={l.id} lab={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
