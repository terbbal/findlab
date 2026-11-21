"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileDown, Printer, Sparkles, Wand2 } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button, Card, DemoBadge } from "@/components/ui";
import { api } from "@/lib/client";
import type { Lab, Lang } from "@/lib/types";

type CV = {
  header: { name: string; email: string; year: string; namecard: string };
  education: { school: string; detail: string; courses: string[] };
  summary: string[];
  researchProjects: string[];
  courses: string[];
  activitiesAwards: string[];
  skills: { group: string; items: string[] }[];
  changes: string[];
  targetLab: { id: string; name: string } | null;
  template: string;
  demoMode: boolean;
};

const TEMPLATES = ["Undergrad research intern", "UGRP application", "General"] as const;

export function CVExportTab() {
  const params = useSearchParams();
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]>("Undergrad research intern");
  const [labId, setLabId] = useState(params.get("lab") ?? "");
  const [cvLang, setCvLang] = useState<Lang>("en");
  const [cv, setCv] = useState<CV | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ labs: Lab[] }>("/api/labs").then((d) => setLabs(d.labs));
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      setCv(await api<CV>("/api/cv/generate", { method: "POST", json: { lang: cvLang, template, targetLabId: labId || null } }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 className="mb-1.5 mt-5 border-b-2 border-navy pb-0.5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-navy">{children}</h2>
  );
  const List = ({ items }: { items: string[] }) => (
    <ul className="list-disc space-y-1 pl-5 text-[12.5px] leading-snug">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
  const T = (en: string, ko: string) => (cvLang === "ko" ? ko : en);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] print:block">
      <div className="space-y-4 print:hidden">
        <Card className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-400">{L("Template", "템플릿")}</span>
            <select className="input" value={template} onChange={(e) => setTemplate(e.target.value as (typeof TEMPLATES)[number])}>
              {TEMPLATES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-400">{L("Tailor for a lab", "연구실 맞춤")}</span>
            <select className="input" value={labId} onChange={(e) => setLabId(e.target.value)}>
              <option value="">{L("— No tailoring —", "— 맞춤 없음 —")}</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-400">{L("CV language", "CV 언어")}</span>
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(["en", "ko"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setCvLang(l)}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${cvLang === l ? "bg-white text-cv shadow-sm" : "text-slate-500"}`}
                >
                  {l === "en" ? "English" : "한국어"}
                </button>
              ))}
            </div>
          </label>
          <Button color="cv" className="w-full" onClick={generate} disabled={loading}>
            {labId ? <Wand2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} {labId ? L("Tailor my CV", "맞춤 CV 만들기") : L("Generate CV", "CV 만들기")}
          </Button>
          <Button variant="secondary" color="navy" className="w-full" onClick={() => window.print()} disabled={!cv || loading}>
            <Printer className="h-4 w-4" /> {L("Export PDF", "PDF로 내보내기")}
          </Button>
        </Card>

        {cv && cv.changes.length > 0 && (
          <Card className="border-l-4 border-lab">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-bold">{L("What changed", "바뀐 점")}</h3>
              <DemoBadge show={cv.demoMode} />
            </div>
            <p className="mb-2 text-xs text-slate-500">
              {L("Tailored for", "맞춤 대상:")} <b>{cv.targetLab?.name}</b>
            </p>
            <ul className="space-y-1.5 text-sm">
              {cv.changes.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-lab">↕</span> {c}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="mb-2 flex items-center gap-2 print:hidden">
          <FileDown className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-500">{L("A4 preview", "A4 미리보기")}</span>
          {cv && <DemoBadge show={cv.demoMode} />}
        </div>
        <div className="cv-page mx-auto w-[794px] min-h-[1123px] bg-white px-14 py-12 text-navy shadow-soft print:w-auto print:min-h-0 print:p-0 print:shadow-none">
          {loading || !cv ? (
            <AIThinking lines={12} />
          ) : (
            <>
              <header className="flex items-end justify-between border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-[28px] font-extrabold leading-tight">{cv.header.name}</h1>
                  <p className="text-[13px] text-slate-600">
                    {cv.header.year} · DGIST
                  </p>
                </div>
                <div className="text-right text-[12px] text-slate-600">
                  <div>{cv.header.email}</div>
                  <div className="text-slate-400">
                    fin<b className="text-dgist">D</b> Lab namecard: {cv.header.namecard}
                  </div>
                </div>
              </header>
              <H>{T("Summary", "요약")}</H>
              <div className="space-y-0.5 text-[12.5px]">
                {cv.summary.map((s, i) => (
                  <p key={i}>{s}</p>
                ))}
              </div>
              <H>{T("Education", "학력")}</H>
              <div className="text-[12.5px]">
                <div className="font-bold">{cv.education.school}</div>
                <div className="text-slate-600">{cv.education.detail}</div>
              </div>
              {cv.researchProjects.length > 0 && (
                <>
                  <H>{T("Research & Projects", "연구 & 프로젝트")}</H>
                  <List items={cv.researchProjects} />
                </>
              )}
              {cv.courses.length > 0 && (
                <>
                  <H>{T("Courses", "수업")}</H>
                  <List items={cv.courses} />
                </>
              )}
              {cv.activitiesAwards.length > 0 && (
                <>
                  <H>{T("Activities & Awards", "활동 & 수상")}</H>
                  <List items={cv.activitiesAwards} />
                </>
              )}
              <H>{T("Skills", "스킬")}</H>
              <div className="space-y-0.5 text-[12.5px]">
                {cv.skills.map((g) => (
                  <div key={g.group}>
                    <b>{g.group}:</b> {g.items.join(", ")}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
