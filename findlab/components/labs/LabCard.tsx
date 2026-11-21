"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, BookOpenCheck, ExternalLink, FileText, GraduationCap, Mail, Sparkles, Users, Wrench } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Chip, SampleBadge } from "@/components/ui";
import type { Lab, LabMatch } from "@/lib/types";

export type MatchWithLab = LabMatch & { lab: Lab; citedEntries: { id: string; date: string; bullet: string }[] };

export function FitRing({ score, size = 76 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Fit score ${score}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E7F7F1" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#0C8F6F"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-xl font-extrabold text-lab">{score}</div>
          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">fit</div>
        </div>
      </div>
    </div>
  );
}

export function RecruitingBadge({ status }: { status: Lab["recruiting"]["status"] }) {
  const { lang } = useLang();
  if (status === "Recruiting")
    return <span className="rounded-full bg-lab px-2.5 py-0.5 text-xs font-bold text-white">● {lang === "ko" ? "모집 중" : "Recruiting"}</span>;
  if (status === "Not recruiting")
    return <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">{lang === "ko" ? "모집 안 함" : "Not recruiting"}</span>;
  return (
    <span className="rounded-full border border-lab px-2.5 py-0.5 text-xs font-bold text-lab">
      {lang === "ko" ? "미확인 — 물어보세요!" : "Unknown — ask them!"}
    </span>
  );
}

/** Marks labs imported from the public DGIST Scholar researcher directory. */
export function ScholarBadge() {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600" title="scholar.dgist.ac.kr">
      DGIST Scholar
    </span>
  );
}

/**
 * Where the recruiting status comes from, with a link to check it yourself.
 * Labs not on 김박사넷 open lab get a link to search there (not listed ≠ not recruiting).
 */
export function RecruitingSource({ lab, className }: { lab: Lab; className?: string }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const src = lab.recruitingSource;
  if (src)
    return (
      <p className={clsx("text-xs text-slate-500", className)}>
        {L("Source:", "출처:")}{" "}
        <a href={src.url} target="_blank" rel="noreferrer" className="font-semibold text-lab hover:underline">
          {src.name} {L("open lab", "오픈랩")} ↗
        </a>{" "}
        · {L("checked", "확인")} {src.checkedAt}
      </p>
    );
  if (lab.source !== "dgist-scholar") return null;
  return (
    <p className={clsx("text-xs text-slate-500", className)}>
      {L("Not listed on 김박사넷 open lab — ask the lab directly.", "김박사넷 오픈랩에 모집 정보가 없어요. 연구실에 직접 물어보세요.")}{" "}
      {lab.phdkimUrl && (
        <a href={lab.phdkimUrl} target="_blank" rel="noreferrer" className="font-semibold text-lab hover:underline">
          {L("김박사넷 profile", "김박사넷 프로필")} ↗
        </a>
      )}
    </p>
  );
}

/** Professor name + department line used on cards and the detail page. */
export function LabPI({ lab, className }: { lab: Lab; className?: string }) {
  const { lang } = useLang();
  return (
    <p className={clsx("text-sm text-slate-500", className)}>
      {lab.professor ?? (lang === "ko" ? "교수 정보 없음" : "Professor not listed")}
      {lab.department && <span className="block text-xs text-slate-400">{lab.department}</span>}
    </p>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

export function LabFacts({ lab, stacked }: { lab: Lab; stacked?: boolean }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  return (
    <div className={clsx("grid gap-4", !stacked && "md:grid-cols-2")}>
      <Section icon={FileText} title={L("Recent papers", "최근 논문")}>
        {lab.recentPapers.length ? (
          <ul className="space-y-1 text-sm">
            {lab.recentPapers.slice(0, 3).map((p) =>
              p.url ? (
                <li key={p.title}>
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-lab underline-offset-2 hover:underline">
                    {p.title}
                  </a>
                  {p.year && <span className="text-slate-400"> · {p.year}</span>}
                </li>
              ) : (
                <li key={p.title} className="text-slate-700">
                  {p.title}
                  {p.year && <span className="text-slate-400"> · {p.year}</span>}
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">{L("Not listed", "정보 없음")}</p>
        )}
      </Section>
      <Section icon={Users} title={L("Contacts", "연락처")}>
        <ul className="space-y-1 text-sm">
          {lab.contacts.map((c) => (
            <li key={c.name} className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-slate-400">{c.role}</span>
              <span className="text-xs text-slate-500">{c.email ?? L("Email not listed", "이메일 미공개")}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export function LabCard({ match, rank }: { match: MatchWithLab; rank: number }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { lab } = match;

  return (
    <article className="flex flex-col rounded-2xl bg-white shadow-soft">
      <div className="flex items-start gap-4 border-b border-slate-100 p-5">
        <FitRing score={match.fitScore} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-lab-tint px-2 py-0.5 text-[11px] font-bold text-lab">#{rank}</span>
            <RecruitingBadge status={lab.recruiting.status} />
            {lab.isSample && <SampleBadge />}
            {lab.source === "dgist-scholar" && <ScholarBadge />}
          </div>
          <h3 className="text-lg font-bold leading-tight">{lab.name}</h3>
          <LabPI lab={lab} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <Section icon={BookOpenCheck} title={L("What they do", "어떤 연구를 하나요")}>
          <p className="text-sm leading-relaxed text-slate-700">{lang === "ko" && lab.plainSummaryKo ? lab.plainSummaryKo : lab.plainSummary}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {lab.researchAreas.map((a) => (
              <Chip key={a} color="lab">
                {a}
              </Chip>
            ))}
          </div>
        </Section>

        <div className="rounded-xl bg-lab-tint/70 p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-lab">
            <Sparkles className="h-3.5 w-3.5" /> {L("Why it fits you", "나와 맞는 이유")}
          </div>
          <ul className="space-y-1.5 text-sm">
            {match.whyItFits.map((w, i) => {
              const cited = match.citedEntries[i];
              return (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 text-lab">✓</span>
                  <span>
                    {w}
                    {cited && (
                      <Link
                        href={`/cv?tab=diary#entry-${cited.id}`}
                        className="ml-1 whitespace-nowrap text-xs font-semibold text-cv hover:underline"
                        title={cited.bullet}
                      >
                        📓 {cited.date}
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {lab.recruiting.note && <p className="text-xs text-slate-500">ℹ️ {lab.recruiting.note}</p>}
        <RecruitingSource lab={lab} className="-mt-2" />

        <LabFacts lab={lab} stacked />

        {(match.prepare.courses.length > 0 || match.prepare.skills.length > 0) && (
          <Section icon={GraduationCap} title={L("Prepare", "준비하면 좋은 것")}>
            <div className="flex flex-wrap gap-1.5">
              {match.prepare.courses.map((c) => (
                <Chip key={c} color="cv">
                  📚 {c}
                </Chip>
              ))}
              {match.prepare.skills.map((s) => (
                <Chip key={s}>
                  <Wrench className="h-3 w-3" /> {s}
                </Chip>
              ))}
            </div>
          </Section>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Link
            href={`/mail?lab=${lab.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-mail px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          >
            <Mail className="h-4 w-4" /> {L("Write email", "메일 쓰기")} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/cv?tab=export&lab=${lab.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-cv hover:bg-cv-tint"
          >
            {L("Tailor my CV", "CV 맞춤화")}
          </Link>
          <Link
            href={`/labs/${lab.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-lab hover:bg-lab-tint"
          >
            {L("Details", "상세")}
          </Link>
          {lab.website && (
            <a
              href={lab.website}
              target="_blank"
              rel="noreferrer"
              className={clsx("inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100")}
            >
              <ExternalLink className="h-4 w-4" /> Web
            </a>
          )}
          {lab.scholarUrl && (
            <a
              href={lab.scholarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              <ExternalLink className="h-4 w-4" /> Scholar
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-2 text-[11px] text-slate-400">
        {L("Last updated", "업데이트")} {lab.lastUpdated}
      </div>
    </article>
  );
}
