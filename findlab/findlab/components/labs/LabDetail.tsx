"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, Mail } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Card, Chip, SampleBadge } from "@/components/ui";
import type { Lab } from "@/lib/types";
import { LabFacts, RecruitingBadge } from "./LabCard";
import { LabBrowser } from "./LabBrowser";

export function LabDetail({ lab }: { lab: Lab }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  return (
    <div className="space-y-10">
      <div>
        <Link href="/labs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-lab hover:underline">
          <ArrowLeft className="h-4 w-4" /> {L("Back to my matches", "매칭 결과로")}
        </Link>
        <Card className="p-6 md:p-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <RecruitingBadge status={lab.recruiting.status} />
            {lab.isSample && <SampleBadge />}
            {lab.style && <Chip>{lab.style}</Chip>}
            <span className="text-xs text-slate-400">
              {L("Last updated", "업데이트")} {lab.lastUpdated}
            </span>
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">{lab.name}</h1>
          <p className="mb-5 text-slate-500">{lab.professor ?? L("Professor not listed", "교수 정보 없음")}</p>
          <p className="mb-4 max-w-3xl text-lg leading-relaxed">{lang === "ko" && lab.plainSummaryKo ? lab.plainSummaryKo : lab.plainSummary}</p>
          <div className="mb-6 flex flex-wrap gap-1.5">
            {lab.researchAreas.map((a) => (
              <Chip key={a} color="lab">
                {a}
              </Chip>
            ))}
          </div>
          <div className="mb-6 rounded-xl bg-slate-50 p-4 text-sm">
            <span className="font-semibold">{L("Recruiting:", "모집:")}</span>{" "}
            {lab.recruiting.types.length ? lab.recruiting.types.join(" · ") : L("No info", "정보 없음")}
            {lab.recruiting.note && <span className="text-slate-500"> — {lab.recruiting.note}</span>}
          </div>
          <LabFacts lab={lab} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/mail?lab=${lab.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-mail px-5 py-2.5 text-sm font-bold text-white hover:brightness-110"
            >
              <Mail className="h-4 w-4" /> {L("Write email", "메일 쓰기")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/cv?tab=export&lab=${lab.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-cv hover:bg-cv-tint"
            >
              {L("Tailor my CV for this lab", "이 연구실에 맞게 CV 수정")}
            </Link>
            {lab.website && (
              <a
                href={lab.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-lab hover:bg-lab-tint"
              >
                <ExternalLink className="h-4 w-4" /> {L("Lab website", "연구실 홈페이지")}
              </a>
            )}
          </div>
        </Card>
      </div>
      <LabBrowser currentId={lab.id} />
    </div>
  );
}
