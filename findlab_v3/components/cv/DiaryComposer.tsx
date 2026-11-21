"use client";

import { useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button } from "@/components/ui";
import { addDiaryEntry, todayISO } from "@/lib/client";
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
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [usedVoice, setUsedVoice] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (note.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      const { entry, demoMode } = await addDiaryEntry({ note: note.trim(), date, source: usedVoice ? "voice" : "text", lang });
      setNote("");
      setUsedVoice(false);
      toast(t("common.saved") + " ✨");
      onSaved?.(entry, demoMode);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-[96px] resize-y text-base"
        rows={compact ? 3 : 4}
        placeholder={t("diary.placeholder")}
        value={note}
        autoFocus={autoFocus}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
        disabled={saving}
      />
      {saving ? (
        <AIThinking lines={2} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <VoiceButton
            onTranscript={(text) => {
              setNote(text);
              setUsedVoice(true);
            }}
          />
          <label className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4" />
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent outline-none"
            />
          </label>
          <Button color="cv" onClick={save} disabled={note.trim().length < 2} className="ml-auto h-10">
            <Sparkles className="h-4 w-4" /> {t("diary.saveAI")}
          </Button>
        </div>
      )}
    </div>
  );
}
