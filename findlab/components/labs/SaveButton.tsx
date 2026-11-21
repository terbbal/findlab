"use client";

import clsx from "clsx";
import { Heart } from "lucide-react";
import { toggleSavedLab, useDB } from "@/lib/localdb";
import { useLang } from "@/components/Providers";

export function SaveButton({ labId, withLabel }: { labId: string; withLabel?: boolean }) {
  const db = useDB();
  const { lang } = useLang();
  const saved = Boolean(db?.savedLabs.includes(labId));
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSavedLab(labId);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Unsave lab" : "Save lab"}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold transition",
        withLabel ? "border border-slate-200 px-3 py-2 hover:bg-rose-50" : "p-1.5 hover:bg-rose-50",
        saved ? "text-rose-500" : "text-slate-400",
      )}
    >
      <Heart className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
      {withLabel && (saved ? (lang === "ko" ? "저장됨" : "Saved") : lang === "ko" ? "저장" : "Save")}
    </button>
  );
}
