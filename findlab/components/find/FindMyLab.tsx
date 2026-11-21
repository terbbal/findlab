"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Compass, ExternalLink, FileText, FileUp, Loader2, Mail, MessageCircleHeart, NotebookPen, Route, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card, Chip, DemoBadge, Skeleton } from "@/components/ui";
import { LabPhoto } from "@/components/labs/LabPhoto";
import { SaveButton } from "@/components/labs/SaveButton";
import { AIBadge } from "@/components/labs/AIBadge";
import { api } from "@/lib/client";
import { useDB } from "@/lib/localdb";
import type { Lab } from "@/lib/types";

type Readiness = { pct: number | null; level: string; have: string[]; missing: { name: string; importance: string }[] };
type Match = {
  fitScore: number;
  whyItFits: string[];
  citedEntries: { id: string; date: string; text: string }[];
  readiness: Readiness;
  lab: Pick<Lab, "id" | "professor" | "department" | "labName" | "labWebsite" | "researchInterests" | "recruiting"> & { recentPapers: { title: string; year: number | null; url: string }[] };
};
type More = { id: string; name: string | null; nameKo: string | null; labName: string | null; department: string | null; photoUrl: string | null };

const PURPOSES = ["Undergrad intern", "UGRP", "Grad school"] as const;
const EXAMPLES = { en: ["robots + healthcare", "brain science + coding", "batteries", "AI for biology", "semiconductors"], ko: ["로봇 + 헬스케어", "뇌과학 + 코딩", "배터리", "생물학을 위한 AI", "반도체"] };

function FitRing({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg width={76} height={76} className="-rotate-90">
        <circle cx={38} cy={38} r={r} stroke="#E7F7F1" strokeWidth={8} fill="none" />
        <circle cx={38} cy={38} r={r} stroke="#0C8F6F" strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className="text-xl font-extrabold text-lab">{score}</div>
          <div className="text-[9px] font-bold uppercase text-slate-400">fit</div>
        </div>
      </div>
    </div>
  );
}

function ReadinessBar({ r }: { r: Readiness }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const levelKo: Record<string, string> = { Ready: "준비됨", "Almost there": "거의 준비됨", Stretch: "도전", Unknown: "알 수 없음" };
  return (
    <div className="rounded-xl bg-mail-tint/60 p-3">
      <div className="mb-1 flex items-center justify-between text-xs font-bold">
        <span className="uppercase tracking-wide text-mail">{L("Readiness", "준비도")}</span>
        <span className="text-mail">{lang === "ko" ? levelKo[r.level] ?? r.level : r.level}{r.pct !== null && ` · ${r.pct}%`}</span>
      </div>
      {r.pct !== null && (
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-mail" style={{ width: `${r.pct}%` }} />
        </div>
      )}
      <div className="flex flex-wrap gap-1 text-[11px]">
        {r.have.slice(0, 4).map((s) => (
          <span key={s} className="rounded-full bg-lab-tint px-2 py-0.5 font-semibold text-lab">✓ {s}</span>
        ))}
        {r.missing.slice(0, 4).map((s) => (
          <span key={s.name} className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-500">+ {s.name}</span>
        ))}
        {r.pct === null && <span className="text-slate-500">{L("Not enough paper data for skills.", "스킬을 판단할 논문 데이터가 부족해요.")}</span>}
      </div>
    </div>
  );
}

export function MatchCard({ m, rank }: { m: Match; rank?: number }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const name = (lang === "ko" ? m.lab.professor.nameKo || m.lab.professor.nameEn : m.lab.professor.nameEn || m.lab.professor.nameKo) ?? "—";
  return (
    <article className="flex flex-col rounded-2xl bg-white shadow-soft">
      <div className="flex items-start gap-3 border-b border-slate-100 p-5">
        <FitRing score={m.fitScore} />
        <div className="min-w-0 flex-1">
          {rank && <span className="rounded-full bg-lab-tint px-2 py-0.5 text-[11px] font-bold text-lab">#{rank}</span>}
          <div className="mt-1 flex items-center gap-2">
            <LabPhoto src={m.lab.professor.photoUrl} alt={name} size={36} />
            <div className="min-w-0">
              <div className="truncate font-bold">{name}</div>
              <div className="truncate text-xs text-slate-500">{m.lab.department}</div>
            </div>
          </div>
          <div className="mt-1 text-sm font-semibold text-navy/80">{m.lab.labName ?? L("Lab not listed", "연구실 정보 없음")}</div>
        </div>
        <SaveButton labId={m.lab.id} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="rounded-xl bg-lab-tint/70 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-lab">
            <Sparkles className="h-3.5 w-3.5" /> {L("Why it fits you", "나와 맞는 이유")} <AIBadge />
          </div>
          <ul className="space-y-1.5 text-sm">
            {m.whyItFits.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-lab">✓</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          {m.citedEntries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {m.citedEntries.map((e) => (
                <Link key={e.id} href={`/cv?tab=diary#entry-${e.id}`} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-cv" title={e.text}>
                  <NotebookPen className="h-3 w-3" /> {e.date}
                </Link>
              ))}
            </div>
          )}
        </div>
        <ReadinessBar r={m.readiness} />
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{L("Recent papers", "최근 논문")}</div>
          <ul className="space-y-1 text-sm">
            {m.lab.recentPapers.slice(0, 3).map((p) => (
              <li key={p.url} className="line-clamp-2">
                <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-dgist hover:underline">
                  {p.title}
                </a>
                {p.year && <span className="text-slate-400"> · {p.year}</span>}
              </li>
            ))}
            {!m.lab.recentPapers.length && <li className="text-slate-400">{L("Not listed", "정보 없음")}</li>}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{L("Recruiting:", "모집:")} {m.lab.recruiting.status === "Unknown" ? L("Unknown — ask them", "알 수 없음 — 문의하세요") : m.lab.recruiting.status}</span>
          {m.lab.professor.email && (
            <a href={`mailto:${m.lab.professor.email}`} className="inline-flex items-center gap-1 hover:text-navy">
              <Mail className="h-3.5 w-3.5" /> {m.lab.professor.email}
            </a>
          )}
          {m.lab.labWebsite && (
            <a href={m.lab.labWebsite} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-navy">
              <ExternalLink className="h-3.5 w-3.5" /> {L("Website", "홈페이지")}
            </a>
          )}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Link href={`/roadmap?lab=${m.lab.id}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-mail px-3 py-2.5 text-sm font-bold text-white hover:brightness-110">
            <Route className="h-4 w-4" /> {L("Build my roadmap", "로드맵 만들기")}
          </Link>
          <Link href={`/labs/${m.lab.id}`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50">
            {L("Details", "상세")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function FindMyLab() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const [mode, setMode] = useState<"diary" | "interests" | "cv">("diary");
  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState<{ name: string; pages: number } | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>("Undergrad intern");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ matches: Match[]; more: More[]; demoMode: boolean } | null>(null);
  const [single, setSingle] = useState<{ single: Match; percentile: number; demoMode: boolean } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [labParam, setLabParam] = useState<string | null>(null);

  useEffect(() => {
    setLabParam(new URLSearchParams(window.location.search).get("lab"));
    fetch("/api/labs")
      .then((r) => r.json())
      .then((d: { labs: { department: string | null }[] }) => setDepartments(Array.from(new Set(d.labs.map((l) => l.department).filter((x): x is string => Boolean(x)))).sort()));
  }, []);

  const payload = () => ({
    mode,
    text: mode === "interests" ? text : undefined,
    cvText: mode === "cv" ? cvText : undefined,
    interests: db?.profile.interests ?? [],
    entries: mode === "diary" ? (db?.entries ?? []).map(({ id, date, category, skills, rawNote }) => ({ id, date, category, skills, rawNote })) : [],
    department: department || null,
    purpose,
    lang,
  });

  // "Check my fit" from a lab page → single-lab analysis
  useEffect(() => {
    if (!labParam || !db) return;
    setLoading(true);
    api<{ single: Match; percentile: number; demoMode: boolean }>("/api/find", { method: "POST", json: { ...payload(), mode: db.entries.length ? "diary" : "interests", text: db.profile.interests.join(", ") || "science", labId: labParam } })
      .then(setSingle)
      .catch((e) => toast(e instanceof Error ? e.message : "Error", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labParam, Boolean(db)]);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    try {
      const d = await api<{ matches: Match[]; more: More[]; demoMode: boolean }>("/api/find", { method: "POST", json: payload() });
      setResult(d);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const uploadCv = async (file: File) => {
    if (file.type && file.type !== "application/pdf") return toast(L("Please choose a PDF file.", "PDF 파일을 선택해 주세요."), "error");
    setCvUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { text?: string; pages?: number; error?: string };
      if (!res.ok || !d.text) throw new Error(d.error ?? L("Couldn't read this PDF.", "PDF를 읽지 못했어요."));
      setCvText(d.text);
      setCvFile({ name: file.name, pages: d.pages ?? 1 });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setCvUploading(false);
      if (cvInputRef.current) cvInputRef.current.value = "";
    }
  };

  const canRun =
    mode === "diary" ? (db?.entries.length ?? 0) > 0 || (db?.profile.interests.length ?? 0) > 0 : mode === "cv" ? cvText.trim().length > 20 : text.trim().length > 1;

  return (
    <div>
      <PageHeader step="lab" title={L("Find the labs that fit you", "나에게 맞는 연구실 찾기")} />

      {(labParam || single) && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-bold">{L("Your fit with this lab", "이 연구실과의 적합도")}</h2>
            <DemoBadge show={single?.demoMode} />
          </div>
          {loading && !single ? (
            <Skeleton className="h-96 max-w-xl" />
          ) : single ? (
            <div className="max-w-xl">
              <MatchCard m={single.single} />
              <p className="mt-2 text-xs text-slate-500">
                {L(`Keyword similarity: closer than ${single.percentile}% of DGIST labs to your profile.`, `키워드 유사도: DGIST 연구실 중 상위 ${100 - single.percentile}% 수준이에요.`)}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <Card className="mb-6">
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              { id: "diary", icon: NotebookPen, label: L("Use my diary", "내 다이어리 사용") },
              { id: "cv", icon: FileText, label: L("Use my CV", "내 CV 사용") },
              { id: "interests", icon: MessageCircleHeart, label: L("Tell me your interests", "관심사 말하기") },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx("flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition", mode === m.id ? "border-lab bg-lab-tint text-lab" : "border-slate-100 text-slate-600 hover:border-lab/40")}
            >
              <m.icon className="h-5 w-5" /> {m.label}
            </button>
          ))}
        </div>
        {mode === "diary" ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {db
              ? L(`Uses your ${db.entries.length} diary entries and your interests (${db.profile.interests.join(", ") || "none yet"}).`, `다이어리 기록 ${db.entries.length}개와 관심사(${db.profile.interests.join(", ") || "아직 없음"})를 사용해요.`)
              : "…"}{" "}
            {db && !db.entries.length && (
              <Link href="/cv" className="font-semibold text-cv">
                {L("Add an entry →", "기록 추가 →")}
              </Link>
            )}
          </p>
        ) : mode === "cv" ? (
          <div className="space-y-2">
            <input ref={cvInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCv(e.target.files[0])} />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) uploadCv(f);
              }}
              className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-4"
            >
              {cvFile ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <FileText className="h-5 w-5 shrink-0 text-lab" />
                  <span className="truncate font-semibold">{cvFile.name}</span>
                  <span className="shrink-0 text-slate-400">· {cvFile.pages}{L(cvFile.pages === 1 ? " page" : " pages", "쪽")}</span>
                  <button
                    onClick={() => {
                      setCvFile(null);
                      setCvText("");
                    }}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-navy"
                    aria-label={L("Remove CV", "CV 지우기")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="flex-1 text-sm text-slate-500">{L("Drop your CV (PDF) here, or paste its text below.", "CV(PDF)를 여기에 끌어다 놓거나, 아래에 내용을 붙여넣으세요.")}</p>
              )}
              <Button variant="secondary" color="lab" onClick={() => cvInputRef.current?.click()} disabled={cvUploading}>
                {cvUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {cvFile ? L("Replace PDF", "PDF 바꾸기") : L("Upload PDF", "PDF 업로드")}
              </Button>
            </div>
            <textarea
              className="input font-mono text-xs"
              rows={6}
              value={cvText}
              onChange={(e) => setCvText(e.target.value.slice(0, 12000))}
              placeholder={L("…or paste your CV text here. You can also edit the extracted text.", "…또는 CV 내용을 여기에 붙여넣으세요. 추출된 내용도 직접 고칠 수 있어요.")}
            />
            <p className="text-xs text-slate-400">
              {L("Your PDF is read in memory only and never saved. The text stays in this page until you leave.", "PDF는 메모리에서만 읽고 저장하지 않아요. 내용은 이 페이지를 떠나면 사라져요.")} {cvText.length.toLocaleString()}/12,000
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={L("What are you curious about?", "어떤 것에 관심이 있나요?")} />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES[lang].map((ex) => (
                <Chip key={ex} color="lab" onClick={() => setText(ex)}>
                  {ex}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <select className="input w-auto" value={purpose} onChange={(e) => setPurpose(e.target.value as (typeof PURPOSES)[number])} aria-label="Purpose">
            {PURPOSES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select className="input w-auto max-w-[260px]" value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
            <option value="">{L("All departments", "전체 학과")}</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d.replace(/^Department of /, "")}
              </option>
            ))}
          </select>
          <Button color="lab" onClick={run} disabled={!canRun || loading} className="ml-auto px-6 py-2.5 text-base">
            <Compass className="h-4 w-4" /> {L("Find my top 3 labs", "TOP 3 연구실 찾기")}
          </Button>
        </div>
      </Card>

      <div ref={resultsRef} className="scroll-mt-24">
        {loading && !labParam && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="h-4 w-4 animate-pulse text-lab" /> {L("Comparing you with every DGIST lab…", "DGIST 모든 연구실과 비교하는 중…")}
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[520px]" />
              ))}
            </div>
          </div>
        )}
        {result && !loading && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{L("Your top 3", "나의 TOP 3")}</h2>
              <DemoBadge show={result.demoMode} />
            </div>
            {result.matches.length === 0 ? (
              <Card className="py-10 text-center text-slate-500">{L("No matches — try different interests or remove the department filter.", "결과가 없어요 — 다른 관심사를 입력하거나 학과 필터를 해제해 보세요.")}</Card>
            ) : (
              <div className="grid items-start gap-5 lg:grid-cols-3">
                {result.matches.map((m, i) => (
                  <MatchCard key={m.lab.id} m={m} rank={i + 1} />
                ))}
              </div>
            )}
            {result.more.length > 0 && (
              <Card>
                <h3 className="mb-3 font-bold">{L("See 10 more similar labs", "비슷한 연구실 10곳 더 보기")}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {result.more.map((x) => (
                    <Link key={x.id} href={`/labs/${x.id}`} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2 hover:bg-slate-50">
                      <LabPhoto src={x.photoUrl} alt={x.name ?? ""} size={36} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{(lang === "ko" ? x.nameKo || x.name : x.name || x.nameKo) ?? "—"}</div>
                        <div className="truncate text-[11px] text-slate-500">{x.labName ?? x.department}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
