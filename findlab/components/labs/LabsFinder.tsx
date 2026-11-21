"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { FileUp, Lock, MessageCircleHeart, Search, Sparkles, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card, Chip, DemoBadge, Skeleton } from "@/components/ui";
import { api, useEntries } from "@/lib/client";
import { LabCard, type MatchWithLab } from "./LabCard";

type Mode = "profile" | "cv" | "interests";
const TYPES = ["Undergrad intern", "UGRP", "Grad student"] as const;
const STYLES = ["Any", "Computational", "Experimental", "Both"] as const;
const EXAMPLES = {
  en: ["robots + healthcare", "brain science + coding", "batteries", "AI for biology"],
  ko: ["로봇 + 헬스케어", "뇌과학 + 코딩", "배터리", "생물학을 위한 AI"],
};
const STORE_KEY = "findlab.lastMatch";

export function LabsFinder() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { entries } = useEntries();

  const [mode, setMode] = useState<Mode>("profile");
  const [interests, setInterests] = useState("");
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvName, setCvName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Any");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchWithLab[] | null>(null);
  const [demo, setDemo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Restore last results when coming back to this page.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) {
        const { results, demo } = JSON.parse(saved);
        setResults(results);
        setDemo(demo);
      }
    } catch {}
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCvText(data.text);
      setCvName(file.name);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const canRun = mode === "profile" || (mode === "interests" ? interests.trim().length > 1 : Boolean(cvText));

  const run = async () => {
    if (!canRun) return;
    setLoading(true);
    setResults(null);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    try {
      const data = await api<{ matches: MatchWithLab[]; demoMode: boolean }>("/api/labs/match", {
        method: "POST",
        json: {
          mode,
          text: mode === "interests" ? interests : mode === "cv" ? cvText : undefined,
          lang,
          filters: { types, style },
        },
      });
      setResults(data.matches);
      setDemo(data.demoMode);
      try {
        sessionStorage.setItem(STORE_KEY, JSON.stringify({ results: data.matches, demo: data.demoMode }));
        localStorage.setItem("findlab.labsMatched", String(data.matches.length));
      } catch {}
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const MODES: { id: Mode; icon: React.ElementType; label: string }[] = [
    { id: "profile", icon: UserRound, label: L("Use my finD Lab profile", "내 finD Lab 프로필 사용") },
    { id: "cv", icon: FileUp, label: L("Upload CV (PDF)", "CV 업로드 (PDF)") },
    { id: "interests", icon: MessageCircleHeart, label: L("Just tell me your interests", "관심사만 말하기") },
  ];

  return (
    <div>
      <PageHeader step="lab" title={L("Find labs that fit you", "나에게 맞는 연구실 찾기")}>
        <Link href="/labs/browse" className="text-sm font-semibold text-lab hover:underline">
          {L("Browse all labs →", "전체 연구실 보기 →")}
        </Link>
      </PageHeader>

      <Card className="mb-6">
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={clsx(
                  "flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition",
                  mode === m.id ? "border-lab bg-lab-tint text-lab" : "border-slate-100 text-slate-600 hover:border-lab/40",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {m.label}
              </button>
            );
          })}
        </div>

        {mode === "profile" && (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {entries === null ? (
              <Skeleton className="h-5 w-64" />
            ) : (
              <>
                {L(
                  `We'll use your ${entries.length} diary entries, skills and interests.`,
                  `다이어리 기록 ${entries.length}개와 스킬, 관심사를 사용해요.`,
                )}{" "}
                {entries.length === 0 && (
                  <Link href="/cv" className="font-semibold text-cv">
                    {L("Add an entry first →", "먼저 기록을 추가하세요 →")}
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {mode === "cv" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-6 text-sm text-slate-500 transition hover:border-lab hover:bg-lab-tint/40"
            >
              <FileUp className="h-6 w-6 text-lab" />
              {uploading ? L("Reading your PDF…", "PDF 읽는 중…") : cvName ? `✅ ${cvName}` : L("Choose a PDF CV", "PDF CV 선택")}
            </button>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              {L("Your CV is used only for this match and isn't stored.", "CV는 이번 매칭에만 사용되고 저장되지 않아요.")}
            </p>
          </div>
        )}

        {mode === "interests" && (
          <div className="space-y-2">
            <textarea
              className="input"
              rows={2}
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder={L("What are you curious about?", "어떤 것에 관심이 있나요?")}
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES[lang].map((ex) => (
                <Chip key={ex} color="lab" onClick={() => setInterests(ex)}>
                  {ex}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase text-slate-400">{L("Looking for", "찾는 것")}</span>
            {TYPES.map((t) => (
              <Chip
                key={t}
                color="lab"
                active={types.includes(t)}
                onClick={() => setTypes((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]))}
              >
                {t}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase text-slate-400">{L("Style", "연구 형태")}</span>
            {STYLES.map((s) => (
              <Chip key={s} color="lab" active={style === s} onClick={() => setStyle(s)}>
                {s}
              </Chip>
            ))}
          </div>
          <Button color="lab" onClick={run} disabled={!canRun || loading} className="ml-auto px-6 py-2.5 text-base">
            <Search className="h-4 w-4" /> {L("Find my top 3 labs", "TOP 3 연구실 찾기")}
          </Button>
        </div>
      </Card>

      <div ref={resultsRef} className="scroll-mt-24">
        {loading && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Sparkles className="h-4 w-4 animate-pulse text-lab" />
              {L("Reading lab pages and comparing them with your profile…", "연구실 정보를 읽고 프로필과 비교하는 중…")}
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[560px]" />
              ))}
            </div>
          </div>
        )}
        {results && !loading && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xl font-bold">{L("Your top matches", "추천 연구실 TOP 3")}</h2>
              <DemoBadge show={demo} />
            </div>
            {results.length === 0 ? (
              <Card className="py-10 text-center text-slate-500">
                {L("No labs match these filters — try loosening them.", "필터에 맞는 연구실이 없어요. 조건을 줄여 보세요.")}
              </Card>
            ) : (
              <div className="grid items-start gap-5 lg:grid-cols-3">
                {results.map((m, i) => (
                  <LabCard key={m.labId} match={m} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
