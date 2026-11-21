"use client";

import { useLang } from "@/components/Providers";

const STEP = {
  cv: { n: "①", color: "#3B5BDB", tint: "#EEF2FF", key: "step.cv", sub: "step.cv.sub" },
  lab: { n: "②", color: "#0C8F6F", tint: "#E7F7F1", key: "step.lab", sub: "step.lab.sub" },
  mail: { n: "③", color: "#D9480F", tint: "#FFF1E8", key: "step.mail", sub: "step.mail.sub" },
} as const;

export function PageHeader({ step, title, children }: { step: keyof typeof STEP; title?: string; children?: React.ReactNode }) {
  const { t } = useLang();
  const s = STEP[step];
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div
          className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ color: s.color, background: s.tint }}
        >
          {s.n} {t(s.key)} · {t(s.sub)}
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title ?? t(s.key)}</h1>
      </div>
      {children}
    </div>
  );
}
