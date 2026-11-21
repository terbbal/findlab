"use client";

import { useLang } from "@/components/Providers";

const STEP = {
  cv: { n: "①", color: "#3B5BDB", tint: "#EEF2FF", en: "My Diary", ko: "My Diary", subEn: "Record what you do", subKo: "내 활동 기록" },
  labs: { n: "②", color: "#1F2430", tint: "#EEF0F4", en: "Labs", ko: "Labs", subEn: "Every DGIST lab", subKo: "DGIST 전체 연구실" },
  lab: { n: "③", color: "#0C8F6F", tint: "#E7F7F1", en: "Find My Lab", ko: "Find My Lab", subEn: "Labs that fit you", subKo: "나에게 맞는 연구실" },
  mail: { n: "④", color: "#D9480F", tint: "#FFF1E8", en: "Skill Roadmap", ko: "Skill Roadmap", subEn: "Close the gap", subKo: "부족한 스킬 채우기" },
} as const;

export function PageHeader({ step, title, children }: { step: keyof typeof STEP; title?: string; children?: React.ReactNode }) {
  const { lang } = useLang();
  const s = STEP[step];
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div
          className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ color: s.color, background: s.tint }}
        >
          {s.n} {lang === "ko" ? s.ko : s.en} · {lang === "ko" ? s.subKo : s.subEn}
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title ?? (lang === "ko" ? s.ko : s.en)}</h1>
      </div>
      {children}
    </div>
  );
}
