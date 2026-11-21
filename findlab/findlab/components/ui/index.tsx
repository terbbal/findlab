"use client";

import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { useLang } from "@/components/Providers";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("rounded-2xl bg-white p-5 shadow-soft", className)} {...rest}>
      {children}
    </div>
  );
}

export function SampleBadge({ text }: { text?: string }) {
  const { t } = useLang();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
      {text ?? t("common.sampleData")}
    </span>
  );
}

export function DemoBadge({ show }: { show?: boolean }) {
  const { t } = useLang();
  if (!show) return null;
  return (
    <span
      title={t("common.demoMode.tip")}
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800"
    >
      ⚡ {t("common.demoMode")}
    </span>
  );
}

/** "AI is thinking…" shimmer block */
export function AIThinking({ lines = 3, className }: { lines?: number; className?: string }) {
  const { t } = useLang();
  return (
    <div className={clsx("space-y-2", className)} aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Sparkles className="h-4 w-4 animate-pulse text-dgist" /> {t("common.aiThinking")}
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="shimmer h-3 rounded-full" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("shimmer rounded-xl", className)} />;
}

export function Chip({
  children,
  color = "slate",
  active,
  onClick,
  className,
}: {
  children: React.ReactNode;
  color?: "slate" | "cv" | "lab" | "mail";
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const palette = {
    slate: active ? "bg-navy text-white" : "bg-slate-100 text-slate-700",
    cv: active ? "bg-cv text-white" : "bg-cv-tint text-cv",
    lab: active ? "bg-lab text-white" : "bg-lab-tint text-lab",
    mail: active ? "bg-mail text-white" : "bg-mail-tint text-mail",
  }[color];
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        palette,
        onClick && "transition hover:opacity-80",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  color?: "cv" | "lab" | "mail" | "navy";
};

export function Button({ variant = "primary", color = "navy", className, children, ...rest }: BtnProps) {
  const bg = { cv: "bg-cv", lab: "bg-lab", mail: "bg-mail", navy: "bg-navy" }[color];
  const text = { cv: "text-cv", lab: "text-lab", mail: "text-mail", navy: "text-navy" }[color];
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && `${bg} text-white shadow-sm hover:brightness-110`,
        variant === "secondary" && `border border-slate-200 bg-white ${text} hover:bg-slate-50`,
        variant === "ghost" && `${text} hover:bg-slate-100`,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export const CATEGORY_STYLE: Record<string, { color: string; tint: string; emoji: string }> = {
  Research: { color: "#7048E8", tint: "#F3F0FF", emoji: "🔬" },
  Project: { color: "#3B5BDB", tint: "#EEF2FF", emoji: "🛠" },
  Course: { color: "#1098AD", tint: "#E3FAFC", emoji: "📚" },
  Club: { color: "#F08C00", tint: "#FFF4E6", emoji: "🤝" },
  Award: { color: "#E8590C", tint: "#FFF4E6", emoji: "🏆" },
  Volunteer: { color: "#0C8F6F", tint: "#E7F7F1", emoji: "💚" },
  Other: { color: "#868E96", tint: "#F1F3F5", emoji: "✨" },
};

export function CategoryChip({ category }: { category: string }) {
  const s = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.Other;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: s.color, background: s.tint }}
    >
      {s.emoji} {category}
    </span>
  );
}
