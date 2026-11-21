"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ClipboardCopy, Compass, ListChecks, Printer, Target } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card, CategoryChip, Chip, Skeleton } from "@/components/ui";
import { api } from "@/lib/client";
import { useDB } from "@/lib/localdb";
import {
  ELEMENT_LABEL,
  SECTIONS,
  SECTION_OF,
  TEMPLATES,
  TEMPLATE_LABEL,
  entryGuide,
  ownSentence,
  recordsForLab,
  type SectionId,
  type Template,
} from "@/lib/cvguide";
import type { DiaryEntry, LabIndexItem } from "@/lib/types";
import { ElementChecklist } from "./EntryCard";

const labLabel = (l: LabIndexItem, lang: "ko" | "en") => {
  const who = (lang === "ko" ? l.nameKo || l.nameEn : l.nameEn || l.nameKo) ?? "—";
  return l.labName ? `${who} · ${l.labName}` : who;
};

/**
 * CV writing guide: the student's archive sorted into CV sections, with tips per section,
 * what each record still needs, records to emphasize for a chosen lab, and an outline of
 * the lines the student wrote themselves. Nothing here writes the CV for them.
 */
export function CVExportTab() {
  const params = useSearchParams();
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const entries = db?.entries ?? null;
  const profile = db?.profile ?? null;
  const saved = useMemo(() => new Set(db?.savedLabs ?? []), [db?.savedLabs]);
  const [labs, setLabs] = useState<LabIndexItem[]>([]);
  const [template, setTemplate] = useState<Template>("Undergrad research intern");
  const [labId, setLabId] = useState(params.get("lab") ?? "");

  useEffect(() => {
    api<{ labs: LabIndexItem[] }>("/api/labs").then((d) => setLabs(d.labs)).catch(() => setLabs([]));
  }, []);

  const lab = labs.find((l) => l.id === labId) ?? null;
  // Saved labs first, then by name.
  const labOptions = useMemo(
    () => [...labs].sort((a, b) => Number(saved.has(b.id)) - Number(saved.has(a.id)) || labLabel(a, lang).localeCompare(labLabel(b, lang), lang)),
    [labs, saved, lang],
  );

  const bySection = useMemo(() => {
    const m = new Map<SectionId, DiaryEntry[]>();
    (entries ?? []).forEach((e) => {
      const s = SECTION_OF[e.category];
      m.set(s, [...(m.get(s) ?? []), e]);
    });
    m.forEach((list) => list.sort((a, b) => Number(Boolean(b.highlight)) - Number(Boolean(a.highlight)) || b.date.localeCompare(a.date)));
    return m;
  }, [entries]);

  const skills = useMemo(() => {
    const c = new Map<string, number>();
    (entries ?? []).forEach((e) => e.skills.forEach((s) => c.set(s, (c.get(s) ?? 0) + 1)));
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const total = entries?.length ?? 0;
  const written = (entries ?? []).filter((e) => ownSentence(e)).length;
  const focus = lab && entries ? recordsForLab(lab, entries) : [];

  const outline = useMemo(() => {
    if (!entries) return "";
    const lines: string[] = [];
    if (profile) lines.push(`${profile.nameKo && lang === "ko" ? profile.nameKo : profile.name} · ${profile.year} · DGIST · ${profile.email}`, "");
    for (const s of SECTIONS) {
      if (s.id === "summary") {
        lines.push(`## ${s.title[lang]}`, L("(write last, in 2 lines)", "(마지막에 2줄로 직접 작성)"), "");
        continue;
      }
      if (s.id === "skills") {
        lines.push(`## ${s.title[lang]}`, skills.map(([n, c]) => `${n} (${c})`).join(", ") || "-", "");
        continue;
      }
      const list = bySection.get(s.id) ?? [];
      if (!list.length) continue;
      lines.push(`## ${s.title[lang]}`);
      for (const e of list) lines.push(`- ${ownSentence(e) ?? `${L("[TO WRITE]", "[작성 필요]")} ${e.rawNote}`} (${e.date})`);
      lines.push("");
    }
    return lines.join("\n").trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, bySection, skills, profile, lang]);

  const copyOutline = async () => {
    try {
      await navigator.clipboard.writeText(outline);
      toast(L("Outline copied", "개요를 복사했어요"));
    } catch {
      toast(L("Couldn't copy", "복사하지 못했어요"), "error");
    }
  };

  if (!entries) return <Skeleton className="h-96" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] print:block">
      {/* Left: settings + progress */}
      <div className="space-y-4 print:hidden">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-cv">
            <Compass className="h-5 w-5" />
            <h2 className="font-bold">{L("CV writing guide", "CV 작성 가이드")}</h2>
          </div>
          <p className="text-sm text-slate-500">
            {L(
              "Your records, sorted into CV sections. You write each line — we show what to include.",
              "모아 둔 기록을 CV 항목별로 정리했어요. 문장은 직접 쓰고, 무엇을 넣으면 좋을지 안내해 드려요.",
            )}
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-400">{L("Applying for", "지원 유형")}</span>
            <select className="input" value={template} onChange={(e) => setTemplate(e.target.value as Template)}>
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {TEMPLATE_LABEL[t][lang]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-400">{L("Target lab (optional)", "지원할 연구실 (선택)")}</span>
            <select className="input" value={labId} onChange={(e) => setLabId(e.target.value)}>
              <option value="">{L("— None —", "— 선택 안 함 —")}</option>
              {labOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {saved.has(l.id) ? "♡ " : ""}
                  {labLabel(l, lang)}
                </option>
              ))}
            </select>
          </label>
        </Card>

        <Card>
          <div className="mb-2 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-cv" />
            <h3 className="font-bold">{L("Progress", "작성 현황")}</h3>
          </div>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span>{L("Lines you wrote", "직접 쓴 CV 문장")}</span>
            <b className="text-cv">
              {written} / {total}
            </b>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-cv transition-all" style={{ width: `${total ? (written / total) * 100 : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {total === 0
              ? L("No records yet — start in the Diary tab.", "아직 기록이 없어요. 다이어리 탭에서 시작해 보세요.")
              : written < total
                ? L("Open a record below and write its line in your own words.", "아래 기록을 눌러 내 말로 한 줄씩 써 보세요.")
                : L("Every record has your own line. Now write the 2-line summary.", "모든 기록에 문장을 썼어요. 이제 맨 위 요약 2줄을 써 보세요.")}
          </p>
        </Card>

        <Card className="space-y-2">
          <h3 className="font-bold">{L("Your outline", "내 CV 개요")}</h3>
          <p className="text-xs text-slate-500">
            {L(
              "Only your own lines; records you haven't written are marked [TO WRITE]. Paste into your CV template.",
              "직접 쓴 문장만 담겨요. 아직 안 쓴 기록은 [작성 필요]로 표시돼요. CV 양식에 붙여 넣어 쓰세요.",
            )}
          </p>
          <Button color="cv" className="w-full" onClick={copyOutline} disabled={!total}>
            <ClipboardCopy className="h-4 w-4" /> {L("Copy outline", "개요 복사")}
          </Button>
          <Button variant="secondary" color="navy" className="w-full" onClick={() => window.print()} disabled={!total}>
            <Printer className="h-4 w-4" /> {L("Print guide", "가이드 인쇄")}
          </Button>
        </Card>
      </div>

      {/* Right: lab focus + sections */}
      <div className="space-y-5">
        {lab && (
          <Card className="border-l-4 border-lab">
            <div className="mb-1 flex items-center gap-2 text-lab">
              <Target className="h-4 w-4" />
              <h3 className="font-bold">{L("Emphasize for this lab", "이 연구실에 강조할 기록")}</h3>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              <Link href={`/labs/${lab.id}`} className="font-bold hover:underline">
                {labLabel(lab, lang)}
              </Link>{" "}
              — {lab.interests.slice(0, 3).join(", ")}
            </p>
            {focus.length ? (
              <ul className="space-y-2 text-sm">
                {focus.map(({ entry, hits }) => (
                  <li key={entry.id} className="rounded-xl bg-lab-tint/60 p-3">
                    <Link href={`/cv?tab=diary#entry-${entry.id}`} className="font-medium text-navy hover:underline">
                      {ownSentence(entry) ?? entry.rawNote}
                    </Link>
                    <div className="mt-1 text-xs text-slate-600">
                      {L("Connects to", "연결 고리")}: {hits.slice(0, 4).join(", ")} —{" "}
                      {L("put this line near the top and name the connection.", "이 문장을 위쪽에 두고, 연구실 분야와의 연결을 드러내 보세요.")}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                {L(
                  "None of your records mention this lab's topics yet. In the summary, say why the field interests you — and consider a small project in it.",
                  "아직 이 연구실 분야와 겹치는 기록이 없어요. 요약에 이 분야에 관심을 가진 이유를 쓰고, 관련된 작은 프로젝트를 해 보는 것도 좋아요.",
                )}
              </p>
            )}
          </Card>
        )}

        {SECTIONS.map((s) => {
          const list = s.id === "skills" || s.id === "summary" ? [] : (bySection.get(s.id) ?? []);
          const focusTip = s.focus[template]?.[lang];
          return (
            <Card key={s.id} className="break-inside-avoid">
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <h3 className="text-lg font-bold">{s.title[lang]}</h3>
                {list.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {L(`${list.filter((e) => ownSentence(e)).length} of ${list.length} written`, `${list.length}개 중 ${list.filter((e) => ownSentence(e)).length}개 작성`)}
                  </span>
                )}
              </div>
              <ul className="mb-3 space-y-1 text-sm text-slate-600">
                {s.tips[lang].map((tip) => (
                  <li key={tip}>💡 {tip}</li>
                ))}
                {focusTip && <li className="font-semibold text-cv">🎯 {focusTip}</li>}
              </ul>

              {s.id === "skills" && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.length ? (
                    skills.map(([n, c]) => (
                      <Chip key={n} color="cv">
                        {n} <span className="opacity-60">×{c}</span>
                      </Chip>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">{L("No skills in your records yet.", "아직 기록에 스킬이 없어요.")}</p>
                  )}
                </div>
              )}

              {list.length > 0 && (
                <ul className="space-y-2">
                  {list.map((e) => {
                    const g = entryGuide(e, lang);
                    const own = ownSentence(e);
                    return (
                      <li key={e.id} className={clsx("rounded-xl border p-3", own ? "border-slate-100" : "border-dashed border-amber-300 bg-amber-50/40")}>
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{e.date}</span>
                          <CategoryChip category={e.category} />
                          {e.highlight && <span>⭐</span>}
                          <Link href={`/cv?tab=diary#entry-${e.id}`} className="ml-auto font-semibold text-cv hover:underline">
                            {own ? L("Edit", "수정") : L("Write →", "쓰러 가기 →")}
                          </Link>
                        </div>
                        <p className={clsx("text-sm", own ? "font-medium text-navy" : "text-slate-600")}>{own ?? e.rawNote}</p>
                        <ElementChecklist text={own ?? e.rawNote} skills={e.skills} className="mt-1.5" />
                        {!own && g.missing.length > 0 && (
                          <p className="mt-1 text-xs text-amber-700">
                            {L("Still missing", "빠진 내용")}: {g.missing.map((m) => ELEMENT_LABEL[m][lang]).join(", ")}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {s.id !== "skills" && s.id !== "summary" && list.length === 0 && (
                <p className="text-sm text-slate-400">{L("No records in this section yet.", "이 항목에 해당하는 기록이 아직 없어요.")}</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
