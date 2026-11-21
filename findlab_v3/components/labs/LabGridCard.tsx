"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useLang } from "@/components/Providers";
import type { LabIndexItem } from "@/lib/types";
import { LabPhoto } from "./LabPhoto";
import { SaveButton } from "./SaveButton";

export function LabGridCard({ lab }: { lab: LabIndexItem }) {
  const { lang } = useLang();
  const primary = (lang === "ko" ? lab.nameKo || lab.nameEn : lab.nameEn || lab.nameKo) ?? "—";
  const secondary = lang === "ko" ? (lab.nameKo ? lab.nameEn : null) : lab.nameEn ? lab.nameKo : null;
  return (
    <Link href={`/labs/${lab.id}`} className="group flex min-w-0 flex-col rounded-2xl bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <LabPhoto src={lab.photoUrl} alt={primary} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">
            {primary} {secondary && <span className="text-sm font-medium text-slate-400">{secondary}</span>}
          </div>
          <div className="truncate text-sm font-semibold text-navy/80">{lab.labName ?? <span className="font-normal text-slate-400">{lang === "ko" ? "연구실 정보 없음" : "Lab not listed"}</span>}</div>
          <div className="truncate text-xs text-slate-500">{lab.department ?? "—"}</div>
        </div>
        <SaveButton labId={lab.id} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {lab.interests.slice(0, 3).map((i) => (
          <span key={i} className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {i}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" /> {lab.publicationCount ?? 0} {lang === "ko" ? "편" : "papers"}
        </span>
        {lab.latestYear && <span>· {lang === "ko" ? `최근 ${lab.latestYear}` : `latest ${lab.latestYear}`}</span>}
      </div>
    </Link>
  );
}
