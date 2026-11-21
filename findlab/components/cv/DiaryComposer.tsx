"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarPlus, Sparkles } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button } from "@/components/ui";
import { addDiaryEntry, todayISO } from "@/lib/client";
import { addPlan } from "@/lib/localdb";
import { findFutureDate, type DateHit } from "@/lib/schedule";
import type { DiaryEntry } from "@/lib/types";
import { VoiceButton } from "./VoiceButton";

export function DiaryComposer({
  onSaved,
  compact,
  autoFocus,
}: {
  onSaved?: (entry: DiaryEntry, demoMode: boolean) => void;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const { lang, t } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [usedVoice, setUsedVoice] = useState(false);
  const [saving, setSaving] = useState(false);
  // A note about the future ("다음주 월요일에 수학 시험"): offer to put it on the calendar instead.
  const [plan, setPlan] = useState<(DateHit & { titleDraft: string; dateDraft: string }) | null>(null);
  const [lastPlanDate, setLastPlanDate] = useState<string | null>(null);

  const reset = () => {
    setNote("");
    setUsedVoice(false);
    setPlan(null);
  };

  const saveRecord = async () => {
    if (note.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      const { entry, demoMode } = await addDiaryEntry({ note: note.trim(), date, source: usedVoice ? "voice" : "text", lang });
      reset();
      toast(t("common.saved") + " ✨");
      onSaved?.(entry, demoMode);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (note.trim().length < 2 || saving) return;
    const hit = findFutureDate(note.trim());
    if (hit && !plan) {
      setPlan({ ...hit, titleDraft: hit.title, dateDraft: hit.date });
      return;
    }
    saveRecord();
  };

  const savePlan = () => {
    if (!plan || !plan.titleDraft.trim()) return;
    addPlan({
      date: plan.dateDraft,
      title: plan.titleDraft.trim(),
      rawNote: note.trim(),
      // Picking a different day means the student chose an exact date.
      ...(plan.approx && plan.dateDraft === plan.date ? { approx: plan.approx } : {}),
    });
    setLastPlanDate(plan.dateDraft);
    reset();
    toast(L("Added to your schedule 📅", "일정에 추가했어요 📅"));
  };

  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-[96px] resize-y text-base"
        rows={compact ? 3 : 4}
        placeholder={t("diary.placeholder")}
        value={note}
        autoFocus={autoFocus}
        onChange={(e) => {
          setNote(e.target.value);
          setPlan(null);
          setLastPlanDate(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
        disabled={saving}
      />

      {plan && (
        <div className="space-y-2 rounded-xl border border-cv/30 bg-cv-tint p-3 text-sm" role="dialog" aria-label={L("Save as a plan?", "일정으로 저장할까요?")}>
          <div className="flex items-center gap-1.5 font-semibold text-cv">
            <CalendarPlus className="h-4 w-4" />
            {L(`"${plan.phrase}" sounds like a plan — save it to your schedule?`, `"${plan.phrase}" — 앞으로의 일정 같아요. 일정으로 저장할까요?`)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input h-9 min-w-[160px] flex-1 text-sm"
              value={plan.titleDraft}
              onChange={(e) => setPlan({ ...plan, titleDraft: e.target.value })}
              aria-label={L("Plan", "일정")}
            />
            <input
              type="date"
              className="input h-9 w-auto text-sm"
              value={plan.dateDraft}
              min={todayISO()}
              onChange={(e) => setPlan({ ...plan, dateDraft: e.target.value || plan.dateDraft })}
              aria-label={L("Date", "날짜")}
            />
          </div>
          <p className="text-xs text-slate-500">
            {fmt(plan.dateDraft)}
            {plan.approx && plan.dateDraft === plan.date && (plan.approx === "week" ? L(" · sometime that week (pick a day if you know it)", " · 그 주 중 (요일을 알면 날짜를 바꿔 주세요)") : L(" · sometime that month", " · 그 달 중"))}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button color="cv" className="h-9" onClick={savePlan} disabled={!plan.titleDraft.trim()}>
              <CalendarPlus className="h-4 w-4" /> {L("Save as a plan", "일정으로 저장")}
            </Button>
            <Button variant="secondary" color="navy" className="h-9" onClick={saveRecord}>
              {L("No, save as a record", "아니요, 기록으로 저장")}
            </Button>
          </div>
        </div>
      )}

      {lastPlanDate && !plan && !note && (
        <p className="text-xs text-slate-500">
          📅 {L("Saved for", "저장한 날짜:")} {fmt(lastPlanDate)} ·{" "}
          <Link href="/cv?tab=calendar" className="font-semibold text-cv hover:underline">
            {L("See it on the calendar", "캘린더에서 보기")}
          </Link>
        </p>
      )}

      {saving ? (
        <AIThinking lines={2} />
      ) : (
        !plan && (
          <div className="flex flex-wrap items-center gap-2">
            <VoiceButton
              onTranscript={(text) => {
                setNote(text);
                setUsedVoice(true);
                setPlan(null);
              }}
            />
            <label className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600">
              <CalendarDays className="h-4 w-4" />
              <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none" />
            </label>
            <Button color="cv" onClick={save} disabled={note.trim().length < 2} className="ml-auto h-10">
              <Sparkles className="h-4 w-4" /> {t("diary.saveAI")}
            </Button>
          </div>
        )
      )}
    </div>
  );
}
