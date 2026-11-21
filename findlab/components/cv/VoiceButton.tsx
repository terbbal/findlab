"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Mic, Square } from "lucide-react";
import { useLang } from "@/components/Providers";

type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};

/** Web Speech API voice capture. Calls onTranscript live; onDone when stopped. */
export function VoiceButton({
  onTranscript,
  onDone,
  className,
}: {
  onTranscript: (text: string) => void;
  onDone?: (text: string) => void;
  className?: string;
}) {
  const { lang, t } = useLang();
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");
  const latestRef = useRef("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.abort();
  }, []);

  const start = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang === "ko" ? "ko-KR" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      latestRef.current = (finalRef.current + interim).trim();
      onTranscript(latestRef.current);
    };
    rec.onend = () => {
      setListening(false);
      onDone?.(latestRef.current);
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => recRef.current?.stop();

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      disabled={!supported}
      title={supported ? t("diary.voice") : t("diary.voiceUnsupported")}
      aria-label={t("diary.voice")}
      className={clsx(
        "relative inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition",
        listening ? "bg-red-500 text-white" : "bg-cv-tint text-cv hover:brightness-95",
        !supported && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {listening && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-red-400" />}
      {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      <span className="hidden sm:inline">{listening ? (lang === "ko" ? "중지" : "Stop") : lang === "ko" ? "음성" : "Voice"}</span>
    </button>
  );
}
