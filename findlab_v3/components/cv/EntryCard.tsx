"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Mic, Pencil, Star, Trash2, X, BookOpen, Laptop, Type } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { CategoryChip, Chip } from "@/components/ui";
import { bulletOf } from "@/lib/client";
import { deleteEntry, updateEntry } from "@/lib/localdb";
import type { DiaryEntry } from "@/lib/types";

const SOURCE_ICON = { text: Type, voice: Mic, course: BookOpen, lms: Laptop };

export function EntryCard({ entry, isNew }: { entry: DiaryEntry; isNew?: boolean }) {
  const { t, lang } = useLang();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bulletOf(entry));
  const [busy, setBusy] = useState(false);
  const SourceIcon = SOURCE_ICON[entry.source] ?? Type;

  const patch = async (json: Partial<DiaryEntry>) => {
    setBusy(true);
    updateEntry(entry.id, json);
    setBusy(false);
    return true;
  };

  const remove = async () => {
    if (!confirm(lang === "ko" ? "이 기록을 삭제할까요?" : "Delete this entry?")) return;
    deleteEntry(entry.id);
    toast(lang === "ko" ? "삭제했어요" : "Deleted");
  };

  return (
    <article
      id={`entry-${entry.id}`}
      className={clsx(
        "group rounded-2xl bg-white p-4 shadow-soft transition md:p-5",
        isNew && "ring-2 ring-cv ring-offset-2 ring-offset-cream",
        entry.highlight && "border-l-4 border-amber-400",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-500">{entry.date}</span>
        <CategoryChip category={entry.category} />
        <span className="inline-flex items-center gap-1 text-xs text-slate-400" title={entry.source}>
          <SourceIcon className="h-3.5 w-3.5" /> {entry.source}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => patch({ highlight: !entry.highlight })}
            disabled={busy}
            className={clsx("rounded-lg p-1.5 transition hover:bg-amber-50", entry.highlight ? "text-amber-500" : "text-slate-300")}
            aria-label="Highlight"
            title="Highlight"
          >
            <Star className="h-4 w-4" fill={entry.highlight ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => {
              setDraft(bulletOf(entry));
              setEditing(true);
            }}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
            aria-label={t("common.edit")}
            title={t("common.edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={remove}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label={t("common.delete")}
            title={t("common.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("diary.original")}</div>
          <p className="text-sm leading-relaxed text-slate-600">{entry.rawNote}</p>
        </div>
        <div className="rounded-xl bg-cv-tint p-3">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-cv">
            {lang === "ko" ? "CV 문장 (내가 쓴 글)" : "CV line (your words)"} {entry.cvBulletEdited && <span className="font-medium normal-case">(edited)</span>}
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea className="input text-sm" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
              <div className="flex justify-end gap-1">
                <button onClick={() => setEditing(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (await patch({ cvBulletEdited: draft.trim() })) {
                      setEditing(false);
                      toast(t("common.saved"));
                    }
                  }}
                  disabled={busy || !draft.trim()}
                  className="rounded-lg bg-cv p-1.5 text-white"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium leading-relaxed text-navy">{bulletOf(entry)}</p>
          )}
        </div>
      </div>

      {entry.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.skills.map((s) => (
            <Chip key={s} color="cv">
              {s}
            </Chip>
          ))}
        </div>
      )}
    </article>
  );
}
