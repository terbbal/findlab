"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Mic, Pencil, Star, Trash2, X, BookOpen, Laptop, Type } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { CategoryChip, Chip } from "@/components/ui";
import { deleteEntry, updateEntry } from "@/lib/localdb";
import { ELEMENTS, ELEMENT_LABEL, checkElements, entryGuide, ownSentence } from "@/lib/cvguide";
import type { DiaryEntry } from "@/lib/types";
import { InlineConfirm } from "@/components/shared/InlineConfirm";

const SOURCE_ICON = { text: Type, voice: Mic, course: BookOpen, lms: Laptop };

/** The four things a good CV line has, ticked off for the given text. */
export function ElementChecklist({ text, skills, className }: { text: string; skills?: string[]; className?: string }) {
  const { lang } = useLang();
  const has = checkElements(text, skills);
  return (
    <div className={clsx("flex flex-wrap gap-1", className)}>
      {ELEMENTS.map((k) => (
        <span
          key={k}
          className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", has[k] ? "bg-cv text-white" : "border border-dashed border-slate-300 text-slate-400")}
        >
          {has[k] ? "✓" : "○"} {ELEMENT_LABEL[k][lang]}
        </span>
      ))}
    </div>
  );
}

export function EntryCard({ entry, isNew }: { entry: DiaryEntry; isNew?: boolean }) {
  const { t, lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const own = ownSentence(entry);
  const guide = entryGuide(entry, lang);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(own ?? "");
  const SourceIcon = SOURCE_ICON[entry.source] ?? Type;

  const startEditing = () => {
    setDraft(own ?? "");
    setEditing(true);
  };

  // Editing the original note (the archive record itself).
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(entry.rawNote);
  const startEditingNote = () => {
    setNoteDraft(entry.rawNote);
    setEditingNote(true);
  };
  const saveNote = () => {
    const note = noteDraft.trim();
    if (!note) return;
    // A new record's cvBullet is just a copy of the note ("not written yet"); keep that copy in sync
    // so editing the note doesn't make it look like the student wrote a CV line.
    const bulletWasNote = !entry.cvBulletEdited && entry.cvBullet.trim() === entry.rawNote.trim();
    updateEntry(entry.id, { rawNote: note, ...(bulletWasNote ? { cvBullet: note } : {}) });
    setEditingNote(false);
    toast(t("common.saved"));
  };

  const remove = () => {
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
            onClick={() => updateEntry(entry.id, { highlight: !entry.highlight })}
            className={clsx("rounded-lg p-1.5 transition hover:bg-amber-50", entry.highlight ? "text-amber-500" : "text-slate-300")}
            aria-label="Highlight"
            title="Highlight"
          >
            <Star className="h-4 w-4" fill={entry.highlight ? "currentColor" : "none"} />
          </button>
          <button
            onClick={startEditingNote}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
            aria-label={L("Edit note", "메모 수정")}
            title={L("Edit note", "메모 수정")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <InlineConfirm
            question={L("Delete this entry?", "이 기록을 삭제할까요?")}
            onConfirm={remove}
            triggerClassName="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            triggerLabel={t("common.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </InlineConfirm>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="mb-1 flex items-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {t("diary.original")}
            {!editingNote && (
              <button onClick={startEditingNote} className="ml-auto font-semibold normal-case text-slate-500 hover:text-navy hover:underline">
                {t("common.edit")}
              </button>
            )}
          </div>
          {editingNote ? (
            <div className="space-y-2">
              <textarea
                className="input text-sm"
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote();
                  if (e.key === "Escape") setEditingNote(false);
                }}
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <button onClick={() => setEditingNote(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label={t("common.cancel")}>
                  <X className="h-4 w-4" />
                </button>
                <button onClick={saveNote} disabled={!noteDraft.trim()} className="rounded-lg bg-navy p-1.5 text-white disabled:opacity-50" aria-label={t("common.save")}>
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600">{entry.rawNote}</p>
          )}
        </div>
        <div className="rounded-xl bg-cv-tint p-3">
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-cv">
            ✍️ {L("CV line (your words)", "CV 문장 (내가 쓴 글)")}
            {own && !editing && (
              <button onClick={startEditing} className="ml-auto font-semibold normal-case text-cv hover:underline">
                {t("common.edit")}
              </button>
            )}
            {!own && !editing && (
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold normal-case text-amber-600">{L("Not written yet", "아직 안 썼어요")}</span>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              {guide.questions.length > 0 && (
                <ul className="space-y-0.5 text-xs text-slate-600">
                  {guide.questions.map((q) => (
                    <li key={q}>• {q}</li>
                  ))}
                </ul>
              )}
              <textarea
                className="input text-sm"
                rows={3}
                value={draft}
                placeholder={L("In your own words — verb + what + tool + result", "내 말로 써 보세요 — 동사 + 무엇을 + 어떤 도구로 + 결과")}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <ElementChecklist text={draft} skills={entry.skills} />
              <div className="flex justify-end gap-1">
                <button onClick={() => setEditing(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label={t("common.cancel")}>
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    updateEntry(entry.id, { cvBulletEdited: draft.trim() });
                    setEditing(false);
                    toast(t("common.saved"));
                  }}
                  disabled={!draft.trim()}
                  className="rounded-lg bg-cv p-1.5 text-white"
                  aria-label={t("common.save")}
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : own ? (
            <>
              <p className="text-sm font-medium leading-relaxed text-navy">{own}</p>
              <ElementChecklist text={own} skills={entry.skills} className="mt-2" />
            </>
          ) : (
            <div className="space-y-2">
              <ElementChecklist text={entry.rawNote} skills={entry.skills} />
              {guide.questions.length > 0 ? (
                <div className="text-xs text-slate-600">
                  <div className="mb-0.5 font-semibold text-slate-500">{L("Add these to your record:", "이런 내용을 더 남겨 두면 좋아요:")}</div>
                  <ul className="space-y-0.5">
                    {guide.questions.map((q) => (
                      <li key={q}>• {q}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-slate-600">{L("This record has everything you need — write your line!", "필요한 내용이 다 있어요. 이제 문장으로 써 보세요!")}</p>
              )}
              <button onClick={startEditing} className="rounded-lg bg-cv px-3 py-1.5 text-xs font-bold text-white hover:brightness-110">
                {L("Write my CV line", "CV 문장 직접 쓰기")}
              </button>
            </div>
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
