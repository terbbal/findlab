"use client";

import { useState } from "react";
import clsx from "clsx";
import { useLang } from "@/components/Providers";

/**
 * A delete button that asks "are you sure?" inline instead of window.confirm().
 * Some browsers (in-app / embedded views) block native dialogs and confirm() returns false
 * right away, which made every delete silently do nothing.
 */
export function InlineConfirm({
  question,
  confirmLabel,
  onConfirm,
  children,
  triggerClassName,
  triggerLabel,
  className,
}: {
  question: string;
  confirmLabel?: string;
  onConfirm: () => void;
  /** What the trigger button shows (an icon, or icon + text). */
  children: React.ReactNode;
  triggerClassName?: string;
  /** aria-label / title of the trigger button. */
  triggerLabel?: string;
  className?: string;
}) {
  const { t } = useLang();
  const [asking, setAsking] = useState(false);

  if (!asking)
    return (
      <button type="button" onClick={() => setAsking(true)} className={triggerClassName} aria-label={triggerLabel} title={triggerLabel}>
        {children}
      </button>
    );

  return (
    <span role="alertdialog" className={clsx("inline-flex flex-wrap items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700", className)}>
      {question}
      <button
        type="button"
        autoFocus
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className="rounded-md bg-red-600 px-2 py-0.5 text-white hover:bg-red-700"
      >
        {confirmLabel ?? t("common.delete")}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="rounded-md px-2 py-0.5 text-slate-600 hover:bg-white">
        {t("common.cancel")}
      </button>
    </span>
  );
}
