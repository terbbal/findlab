"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, Compass, ExternalLink, GraduationCap, Mail, Route, Sparkles } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Card } from "@/components/ui";
import type { Lab } from "@/lib/types";
import { LabPhoto } from "./LabPhoto";
import { SaveButton } from "./SaveButton";
import { AIBadge } from "./AIBadge";

const NL = (lang: string) => (lang === "ko" ? "정보 없음" : "Not listed");

function Section({ title, icon: Icon, children, right }: { title: string; icon: React.ElementType; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-navy" />
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </Card>
  );
}

export function PaperItem({ p }: { p: Lab["recentPapers"][number] }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();
  return (
    <li className="rounded-xl border border-slate-100 p-3">
      <a href={p.url} target="_blank" rel="noreferrer" className="font-semibold text-navy hover:text-dgist hover:underline">
        {p.title}
      </a>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
        {p.year && <span>{p.year}</span>}
        {p.journal && <span>· {p.journal}</span>}
        {p.doi && (
          <a href={p.doi} target="_blank" rel="noreferrer" className="text-dgist hover:underline">
            · DOI
          </a>
        )}
      </div>
      {p.abstract && (
        <>
          <button onClick={() => setOpen(!open)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy">
            <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} /> {lang === "ko" ? "초록" : "Abstract"}
          </button>
          {open && <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.abstract}</p>}
        </>
      )}
    </li>
  );
}

export function LabDetail({ lab }: { lab: Lab }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const name = (lang === "ko" ? lab.professor.nameKo || lab.professor.nameEn : lab.professor.nameEn || lab.professor.nameKo) ?? NL(lang);
  const other = lang === "ko" ? (lab.professor.nameKo ? lab.professor.nameEn : null) : lab.professor.nameEn ? lab.professor.nameKo : null;
  const ext = lab.externalIds;
  const summary = lang === "ko" && lab.plainSummaryKo ? lab.plainSummaryKo : lab.plainSummary;

  return (
    <div className="space-y-5">
      <Link href="/labs" className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline">
        <ArrowLeft className="h-4 w-4" /> {L("All labs", "전체 연구실")}
      </Link>

      <Card className="p-5 md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <LabPhoto src={lab.professor.photoUrl} alt={name} size={104} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-500">{lab.department ?? NL(lang)}</div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {name} {other && <span className="text-lg font-medium text-slate-400">{other}</span>}
            </h1>
            <div className="mt-1 text-lg font-semibold text-navy/80">
              {lab.labName ? (
                lab.labScholarUrl ? (
                  <a href={lab.labScholarUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    {lab.labName}
                  </a>
                ) : (
                  lab.labName
                )
              ) : (
                <span className="text-base font-normal text-slate-400">{L("Lab not listed", "연구실 정보 없음")}</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {lab.professor.email ? (
                <a href={`mailto:${lab.professor.email}`} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-medium hover:bg-slate-200">
                  <Mail className="h-4 w-4" /> {lab.professor.email}
                </a>
              ) : (
                <span className="rounded-xl bg-slate-50 px-3 py-1.5 text-slate-400">{L("Email not listed", "이메일 정보 없음")}</span>
              )}
              {lab.labWebsite && (
                <a href={lab.labWebsite} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-medium hover:bg-slate-200">
                  <ExternalLink className="h-4 w-4" /> {L("Lab website", "연구실 홈페이지")}
                </a>
              )}
              <a href={lab.scholarUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-medium hover:bg-slate-200">
                <ExternalLink className="h-4 w-4" /> DGIST Scholar
              </a>
              {ext.orcid && (
                <a href={ext.orcid} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 px-3 py-1.5 font-medium hover:bg-slate-200">
                  ORCID
                </a>
              )}
              {ext.googleScholar && (
                <a href={ext.googleScholar} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 px-3 py-1.5 font-medium hover:bg-slate-200">
                  Google Scholar
                </a>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/find?lab=${lab.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-lab px-4 py-2 text-sm font-bold text-white hover:brightness-110">
                <Compass className="h-4 w-4" /> {L("Check my fit", "내 적합도 보기")}
              </Link>
              <Link href={`/roadmap?lab=${lab.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-mail px-4 py-2 text-sm font-bold text-white hover:brightness-110">
                <Route className="h-4 w-4" /> {L("Build my roadmap", "로드맵 만들기")} <ArrowRight className="h-4 w-4" />
              </Link>
              <SaveButton labId={lab.id} withLabel />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Section title={L("About the lab", "연구실 소개")} icon={BookOpen}>
            {summary && (
              <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <AIBadge label={L("AI summary", "AI 요약")} />
                  <span className="text-[11px] text-slate-500">{L("Plain-language summary of the text below", "아래 원문을 쉽게 요약")}</span>
                </div>
                <p className="text-sm leading-relaxed">{summary}</p>
              </div>
            )}
            {lab.labDescription ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{lab.labDescription}</p>
            ) : (
              <p className="text-sm text-slate-400">{L("No lab description on DGIST Scholar.", "DGIST Scholar에 연구실 소개가 없어요.")}</p>
            )}
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{L("Research interests", "연구 분야")}</div>
              <div className="flex flex-wrap gap-1.5">
                {lab.researchInterests.length ? (
                  lab.researchInterests.map((i) => (
                    <Link key={i} href={`/labs?q=${encodeURIComponent(i)}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {i}
                    </Link>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">{NL(lang)}</span>
                )}
              </div>
            </div>
          </Section>

          <Section
            title={L("Recent papers", "최근 논문")}
            icon={BookOpen}
            right={<span className="text-xs text-slate-400">{lab.publicationCount ?? 0} {L("journal papers total", "편 (전체 저널 논문)")}</span>}
          >
            {lab.recentPapers.length ? (
              <ul className="space-y-2">
                {lab.recentPapers.map((p) => (
                  <PaperItem key={p.url} p={p} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">{L("No papers listed.", "논문 정보가 없어요.")}</p>
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-5">
          <Section title={L("Skills this lab uses", "이 연구실에서 쓰는 스킬")} icon={Sparkles}>
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {L("Inferred from public papers — not official requirements.", "공개 논문에서 추론한 것 — 공식 요구사항이 아니에요.")}
            </p>
            {lab.inferredSkills.length ? (
              <ul className="space-y-2.5">
                {lab.inferredSkills.map((s) => (
                  <li key={s.name} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.importance === "core" ? "bg-mail text-white" : "bg-mail-tint text-mail"}`}>{s.importance}</span>
                      <AIBadge label={s.method === "ai" ? "AI" : L("auto", "자동")} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{s.evidence}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">{L("Not enough paper data to infer skills.", "스킬을 추론할 논문 데이터가 부족해요.")}</p>
            )}
          </Section>

          <Section title={L("Education & career", "학력 & 경력")} icon={GraduationCap}>
            {[...lab.education, ...lab.career].length ? (
              <ul className="space-y-1 text-sm text-slate-700">
                {lab.education.map((e) => (
                  <li key={e}>🎓 {e}</li>
                ))}
                {lab.career.map((e) => (
                  <li key={e}>💼 {e}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">{NL(lang)}</p>
            )}
          </Section>

          <Card className="text-sm">
            <div className="font-semibold">{L("Recruiting", "모집 여부")}</div>
            <p className="text-slate-500">{lab.recruiting.status === "Unknown" ? L("Unknown — ask the lab directly.", "알 수 없음 — 연구실에 직접 문의하세요.") : lab.recruiting.status}</p>
          </Card>

          <p className="text-xs text-slate-400">
            {L("Source:", "출처:")}{" "}
            <a href={lab.scholarUrl} target="_blank" rel="noreferrer" className="underline">
              DGIST Scholar
            </a>{" "}
            · {L("crawled", "수집일")} {lab.lastCrawled}
          </p>
        </div>
      </div>
    </div>
  );
}
