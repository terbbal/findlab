"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useLang } from "./Providers";
import { DiaryComposer } from "./cv/DiaryComposer";
import { todayISO } from "@/lib/client";

export const ALARM_KEY = "findlab.alarmTime";
const SHOWN_KEY = "findlab.alarmShown";
export const TRIGGER_EVENT = "findlab:trigger-alarm";

export function getAlarmTime(): string {
  try {
    return localStorage.getItem(ALARM_KEY) || "21:00";
  } catch {
    return "21:00";
  }
}

/** Client-side daily reminder: banner/modal + browser notification (if allowed) once the chosen time passes. */
export function DailyAlarm() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fire = (force = false) => {
      const today = todayISO();
      let shown: string | null = null;
      try {
        shown = localStorage.getItem(SHOWN_KEY);
      } catch {}
      if (!force && shown === today) return;
      const [h, m] = getAlarmTime().split(":").map(Number);
      const now = new Date();
      if (!force && now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
      try {
        localStorage.setItem(SHOWN_KEY, today);
      } catch {}
      setOpen(true);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("finD Lab", { body: lang === "ko" ? "오늘 무엇을 했나요? 한 줄만 기록해요 ✍️" : "What did you do today? Log one line ✍️" });
        } catch {}
      }
    };
    fire();
    const id = setInterval(() => fire(), 30_000);
    const onTrigger = () => fire(true);
    window.addEventListener(TRIGGER_EVENT, onTrigger);
    return () => {
      clearInterval(id);
      window.removeEventListener(TRIGGER_EVENT, onTrigger);
    };
  }, [lang]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-navy/40 p-4 backdrop-blur-sm print:hidden" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 animate-bounce place-items-center rounded-2xl bg-cv-tint text-cv">
            <BellRing className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{t("home.prompt")} 🌙</h2>
            <p className="text-sm text-slate-500">
              {lang === "ko" ? "오늘의 작은 일도 나중에 멋진 CV 한 줄이 돼요." : "Today's small wins become tomorrow's CV lines."}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <DiaryComposer compact autoFocus onSaved={() => setTimeout(() => setOpen(false), 600)} />
      </div>
    </div>
  );
}
