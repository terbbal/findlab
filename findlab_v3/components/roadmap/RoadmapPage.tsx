"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, Circle, CircleDot, ExternalLink, Laptop, Link2, Route, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card, Skeleton } from "@/components/ui";
import { LabPhoto } from "@/components/labs/LabPhoto";
import { AIBadge } from "@/components/labs/AIBadge";
import { api } from "@/lib/client";
import { deleteRoadmap, saveRoadmap, useDB } from "@/lib/localdb";
import { readiness } from "@/lib/readiness";
import type { Lab, LabIndexItem, Roadmap, RoadmapItem } from "@/lib/types";

const STATUS: RoadmapItem["status"][] = ["todo", "doing", "done"];

export function RoadmapPage() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const [index, setIndex] = useState<LabIndexItem[]>([]);
  const [labId, setLabId] = useState<string | null>(null);
  const [lab, setLab] = useState<Lab | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("lab");
    if (p) setLabId(p);
    api<{ labs: LabIndexItem[] }>("/api/labs").then((d) => setIndex(d.labs));
  }, []);
  useEffect(() => {
    if (!labId && db?.roadmaps[0]) setLabId(db.roadmaps[0].labId);
  }, [db, labId]);
  useEffect(() => {
    if (!labId) return setLab(null);
    setLab(null);
    api<{ lab: Lab }>(`/api/labs/${labId}`).then((d) => setLab(d.lab)).catch(() => toast("Lab not found", "error"));
  }, [labId, toast]);

  const userSkills = useMemo(() => Array.from(new Set((db?.entries ?? []).flatMap((e) => e.skills))), [db]);
  const ready = lab ? readiness(lab, userSkills) : null;
  const roadmap = db?.roadmaps.find((r) => r.labId === labId) ?? null;

  const create = () => {
    if (!lab || !ready) return;
    const r: Roadmap = {
      labId: lab.id,
      createdAt: new Date().toISOString(),
      items: ready.missing.map((m) => ({ id: `${lab.id}-${m.name}`, skill: m.name, status: "todo", note: "", linkedEntryIds: [] })),
    };
    saveRoadmap(r);
    toast(L("Roadmap created 🗺️", "로드맵을 만들었어요 🗺️"));
  };

  const update = (itemId: string, patch: Partial<RoadmapItem>) => {
    if (!roadmap) return;
    saveRoadmap({ ...roadmap, items: roadmap.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
  };

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return index
      .filter((l) => l.matchable && [l.nameEn, l.nameKo, l.labName, ...l.interests].join(" ").toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, index]);

  const savedLabs = index.filter((l) => db?.savedLabs.includes(l.id));
  const name = lab ? ((lang === "ko" ? lab.professor.nameKo || lab.professor.nameEn : lab.professor.nameEn || lab.professor.nameKo) ?? "—") : "";
  const done = roadmap ? roadmap.items.filter((i) => i.status === "done").length : 0;

  // LMS items that look related to a roadmap skill (student confirms by linking)
  const lmsFor = (skill: string) => {
    const words = skill.toLowerCase().split(/[\s/&]+/).filter((w) => w.length > 2);
    return (db?.lms ?? []).filter((x) => words.some((w) => `${x.title} ${x.course ?? ""} ${x.description ?? ""}`.toLowerCase().includes(w))).slice(0, 2);
  };

  return (
    <div>
      <PageHeader step="mail" title={L("Your skill roadmap to a lab", "연구실까지의 스킬 로드맵")} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{L("Choose a lab", "연구실 선택")}</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder={L("Search a professor or topic", "교수님 또는 주제 검색")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {results.length > 0 && (
              <ul className="mt-2 max-h-72 space-y-1 overflow-auto">
                {results.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => {
                        setLabId(l.id);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-slate-50"
                    >
                      <LabPhoto src={l.photoUrl} alt="" size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{(lang === "ko" ? l.nameKo || l.nameEn : l.nameEn || l.nameKo) ?? "—"}</span>
                        <span className="block truncate text-[11px] text-slate-500">{l.labName ?? l.department}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {(savedLabs.length > 0 || (db?.roadmaps.length ?? 0) > 0) && (
              <div className="mt-4 space-y-1">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{L("Your roadmaps & saved labs", "내 로드맵 & 저장한 연구실")}</div>
                {Array.from(new Set([...(db?.roadmaps.map((r) => r.labId) ?? []), ...savedLabs.map((l) => l.id)])).map((id) => {
                  const l = index.find((x) => x.id === id);
                  if (!l) return null;
                  const has = db?.roadmaps.some((r) => r.labId === id);
                  return (
                    <button key={id} onClick={() => setLabId(id)} className={clsx("flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-sm", id === labId ? "bg-mail-tint" : "hover:bg-slate-50")}>
                      <LabPhoto src={l.photoUrl} alt="" size={28} />
                      <span className="flex-1 truncate">{(lang === "ko" ? l.nameKo || l.nameEn : l.nameEn || l.nameKo) ?? "—"}</span>
                      {has && <Route className="h-3.5 w-3.5 text-mail" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
          <p className="px-1 text-xs text-slate-500">
            {L("Skills are inferred from each lab's public papers — not official requirements. You write your own plan.", "스킬은 연구실의 공개 논문에서 추론한 것이며 공식 요구사항이 아니에요. 계획은 직접 작성해요.")}
          </p>
        </div>

        <div className="min-w-0">
          {!labId ? (
            <Card className="grid min-h-[300px] place-items-center text-center text-slate-500">
              <div>
                <Route className="mx-auto mb-2 h-8 w-8 text-mail/60" />
                {L("Pick a lab — or tap “Build my roadmap” on any lab page.", "연구실을 고르거나 연구실 페이지에서 “로드맵 만들기”를 누르세요.")}
                <div className="mt-3">
                  <Link href="/find" className="font-semibold text-lab hover:underline">
                    {L("Not sure? Find My Lab →", "잘 모르겠다면? Find My Lab →")}
                  </Link>
                </div>
              </div>
            </Card>
          ) : !lab || !ready ? (
            <Skeleton className="h-[420px]" />
          ) : (
            <div className="space-y-5">
              <Card className="flex flex-wrap items-center gap-4">
                <LabPhoto src={lab.professor.photoUrl} alt={name} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500">{lab.department}</div>
                  <Link href={`/labs/${lab.id}`} className="text-xl font-bold hover:underline">
                    {name}
                  </Link>
                  <div className="text-sm font-semibold text-navy/80">{lab.labName ?? L("Lab not listed", "연구실 정보 없음")}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase text-mail">{L("Readiness", "준비도")}</div>
                  <div className="text-3xl font-extrabold text-mail">{ready.pct ?? "–"}%</div>
                </div>
              </Card>

              {lab.inferredSkills.length === 0 ? (
                <Card className="text-center text-slate-500">{L("This lab has too little public paper data to infer skills.", "이 연구실은 스킬을 추론할 공개 논문 데이터가 부족해요.")}</Card>
              ) : (
                <Card>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{L("Skills this lab uses", "이 연구실이 쓰는 스킬")}</h2>
                    <AIBadge label={lab.inferredSkills[0]?.method === "ai" ? "AI" : L("auto-extracted", "자동 추출")} />
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {lab.inferredSkills.map((s) => {
                      const have = ready.have.includes(s.name);
                      return (
                        <li key={s.name} className={clsx("rounded-xl border p-3 text-sm", have ? "border-lab/40 bg-lab-tint/50" : "border-slate-100")}>
                          <div className="flex items-center gap-2">
                            {have ? <CheckCircle2 className="h-4 w-4 text-lab" /> : <Circle className="h-4 w-4 text-slate-300" />}
                            <span className="font-semibold">{s.name}</span>
                            <span className={clsx("ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold", s.importance === "core" ? "bg-mail text-white" : "bg-mail-tint text-mail")}>{s.importance}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{s.evidence}</p>
                          {s.sourcePapers[0] && (
                            <a href={s.sourcePapers[0]} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-dgist hover:underline">
                              <ExternalLink className="h-3 w-3" /> {L("Read the paper", "논문 보기")}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!roadmap && ready.missing.length > 0 && (
                    <Button color="mail" className="mt-4" onClick={create}>
                      <Route className="h-4 w-4" /> {L(`Make a roadmap for ${ready.missing.length} missing skills`, `부족한 스킬 ${ready.missing.length}개로 로드맵 만들기`)}
                    </Button>
                  )}
                  {!roadmap && ready.missing.length === 0 && <p className="mt-4 text-sm font-semibold text-lab">{L("You already show every skill we found 🎉", "찾은 스킬을 모두 갖추고 있어요 🎉")}</p>}
                </Card>
              )}

              {roadmap && (
                <Card>
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="text-lg font-bold">{L("My roadmap", "나의 로드맵")}</h2>
                    <span className="text-sm text-slate-500">
                      {done}/{roadmap.items.length} {L("done", "완료")}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(L("Delete this roadmap?", "이 로드맵을 삭제할까요?"))) deleteRoadmap(roadmap.labId);
                      }}
                      className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete roadmap"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-mail-tint">
                    <div className="h-full rounded-full bg-mail transition-all" style={{ width: `${roadmap.items.length ? (done / roadmap.items.length) * 100 : 0}%` }} />
                  </div>
                  <ol className="space-y-3">
                    {roadmap.items.map((it, i) => {
                      const lms = lmsFor(it.skill);
                      return (
                        <li key={it.id} className="rounded-xl border border-slate-100 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-mail-tint text-xs font-bold text-mail">{i + 1}</span>
                            <span className="font-semibold">{it.skill}</span>
                            <div className="ml-auto flex rounded-lg bg-slate-100 p-0.5 text-xs">
                              {STATUS.map((st) => (
                                <button
                                  key={st}
                                  onClick={() => update(it.id, { status: st })}
                                  className={clsx("flex items-center gap-1 rounded-md px-2 py-1 font-semibold", it.status === st ? "bg-white text-mail shadow-sm" : "text-slate-500")}
                                >
                                  {st === "done" ? <CheckCircle2 className="h-3 w-3" /> : st === "doing" ? <CircleDot className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                                  {st === "todo" ? L("To do", "할 일") : st === "doing" ? L("Doing", "진행 중") : L("Done", "완료")}
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea
                            className="input mt-2 text-sm"
                            rows={2}
                            placeholder={L("Your plan (e.g. which course or project you'll use to learn this)", "나의 계획 (예: 어떤 수업이나 프로젝트로 배울지)")}
                            value={it.note}
                            onChange={(e) => update(it.id, { note: e.target.value })}
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <Link2 className="h-3.5 w-3.5 text-slate-400" />
                            <select
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1"
                              value=""
                              onChange={(e) => e.target.value && update(it.id, { linkedEntryIds: Array.from(new Set([...it.linkedEntryIds, e.target.value])) })}
                            >
                              <option value="">{L("Link a diary entry as proof…", "증거로 다이어리 기록 연결…")}</option>
                              {(db?.entries ?? []).map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.date} · {e.rawNote.slice(0, 50)}
                                </option>
                              ))}
                            </select>
                            {it.linkedEntryIds.map((id) => {
                              const e = db?.entries.find((x) => x.id === id);
                              return e ? (
                                <button key={id} onClick={() => update(it.id, { linkedEntryIds: it.linkedEntryIds.filter((x) => x !== id) })} className="rounded-full bg-cv-tint px-2 py-0.5 font-semibold text-cv" title={L("Click to unlink", "클릭해서 연결 해제")}>
                                  📓 {e.date} ✕
                                </button>
                              ) : null;
                            })}
                          </div>
                          {lms.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                              <Laptop className="h-3.5 w-3.5" /> {L("Related LMS item?", "관련 LMS 과제?")}
                              {lms.map((x) => (
                                <span key={x.uid} className="font-semibold">
                                  {x.title}
                                </span>
                              ))}
                              <Link href="/cv?tab=courses" className="font-semibold text-cv hover:underline">
                                {L("Add it to your diary, then link it →", "다이어리에 추가한 뒤 연결하세요 →")}
                              </Link>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
