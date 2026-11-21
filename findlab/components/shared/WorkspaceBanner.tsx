"use client";

import { FlaskConical, RotateCcw, UserRound } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { readDB, resetWorkspace, setWorkspace, useDB } from "@/lib/localdb";

/** Guest mode switcher: Minji's sample data vs. your own (stored only in this browser). */
export function WorkspaceBanner() {
  const db = useDB();
  const { lang } = useLang();
  const toast = useToast();
  const router = useRouter();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  if (!db) return null;
  if (db.workspace === "demo")
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <FlaskConical className="h-5 w-5 shrink-0 text-amber-600" />
        <span className="flex-1 text-amber-900">
          {L("You're looking at demo data (Minji, sample student).", "지금은 데모 데이터(샘플 학생 민지)를 보고 있어요.")}{" "}
          <span className="text-amber-700">{L("Start your own — it stays in this browser only.", "내 기록을 시작해 보세요 — 이 브라우저에만 저장돼요.")}</span>
        </span>
        <button
          onClick={() => {
            setWorkspace("me");
            if (!readDB("me").profile.name) router.push("/welcome");
            else toast(L("Switched to your own space ✨", "내 공간으로 바꿨어요 ✨"));
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 font-bold text-white"
        >
          <UserRound className="h-4 w-4" /> {L("Start my own", "내 기록 시작하기")}
        </button>
        <button onClick={() => resetWorkspace("demo")} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline" title="Reset demo">
          <RotateCcw className="h-3.5 w-3.5" /> {L("Reset demo", "데모 초기화")}
        </button>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-sm shadow-soft">
      <UserRound className="h-4 w-4 text-cv" />
      <span className="flex-1 text-slate-600">
        {L("Your space — saved only in this browser.", "내 공간 — 이 브라우저에만 저장돼요.")}{" "}
        {!db.profile.name && <a href="/welcome" className="font-semibold text-cv hover:underline">{L("Set up your profile →", "프로필 설정하기 →")}</a>}
      </span>
      <button onClick={() => setWorkspace("demo")} className="text-xs font-semibold text-slate-500 hover:underline">
        {L("View demo (Minji)", "데모 보기 (민지)")}
      </button>
    </div>
  );
}
