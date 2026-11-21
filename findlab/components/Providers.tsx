"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/types";
import { translate, type I18nKey } from "@/lib/i18n";

/* ---------- Language ---------- */

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: I18nKey, vars?: Record<string, string | number>) => string };
const LangContext = createContext<LangCtx | null>(null);

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be inside <Providers>");
  return ctx;
}

/* ---------- Toasts ---------- */

type Toast = { id: number; text: string; tone: "ok" | "error" };
type ToastCtx = { toast: (text: string, tone?: Toast["tone"]) => void };
const ToastContext = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside <Providers>");
  return ctx.toast;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("findlab.lang");
      if (saved === "ko" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("findlab.lang", l);
    } catch {}
  }, []);

  const t = useCallback((k: I18nKey, vars?: Record<string, string | number>) => translate(lang, k, vars), [lang]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2600);
  }, []);

  const langValue = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  const toastValue = useMemo(() => ({ toast }), [toast]);

  return (
    <LangContext.Provider value={langValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4 print:hidden">
          {toasts.map((x) => (
            <div
              key={x.id}
              className={`pointer-events-auto rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-soft ${
                x.tone === "ok" ? "bg-navy" : "bg-red-600"
              }`}
            >
              {x.text}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </LangContext.Provider>
  );
}
