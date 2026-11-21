"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Chip, SampleBadge, Skeleton } from "@/components/ui";
import { api } from "@/lib/client";
import type { Lab } from "@/lib/types";
import { RecruitingBadge } from "./LabCard";

export function LabBrowser({ currentId }: { currentId?: string }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const [labs, setLabs] = useState<Lab[] | null>(null);
  const [q, setQ] = useState("");
  const [area, setArea] = useState<string | null>(null);

  useEffect(() => {
    api<{ labs: Lab[] }>("/api/labs").then((d) => setLabs(d.labs)).catch(() => setLabs([]));
  }, []);

  const areas = useMemo(() => Array.from(new Set((labs ?? []).flatMap((l) => l.researchAreas))).sort(), [labs]);
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (labs ?? []).filter(
      (l) =>
        (!area || l.researchAreas.includes(area)) &&
        (!query || [l.name, l.professor ?? "", l.plainSummary, ...l.researchAreas, ...l.keywords].join(" ").toLowerCase().includes(query)),
    );
  }, [labs, q, area]);

  return (
    <section id="browse" className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-bold">{L("Browse all labs", "전체 연구실 보기")}</h2>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder={L("Search labs, topics, professors…", "연구실, 주제, 교수님 검색…")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip color="lab" active={!area} onClick={() => setArea(null)}>
          {L("All areas", "전체 분야")}
        </Chip>
        {areas.map((a) => (
          <Chip key={a} color="lab" active={area === a} onClick={() => setArea(area === a ? null : a)}>
            {a}
          </Chip>
        ))}
      </div>
      {labs === null ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((l) => (
            <Link
              key={l.id}
              href={`/labs/${l.id}`}
              className={`rounded-2xl bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${l.id === currentId ? "ring-2 ring-lab" : ""}`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <RecruitingBadge status={l.recruiting.status} />
                {l.isSample && <SampleBadge />}
              </div>
              <div className="font-bold">{l.name}</div>
              <div className="mb-2 text-xs text-slate-500">{l.professor ?? "—"}</div>
              <p className="line-clamp-2 text-sm text-slate-600">{lang === "ko" && l.plainSummaryKo ? l.plainSummaryKo : l.plainSummary}</p>
            </Link>
          ))}
          {shown.length === 0 && <p className="text-sm text-slate-500">{L("No labs found.", "검색 결과가 없어요.")}</p>}
        </div>
      )}
    </section>
  );
}
