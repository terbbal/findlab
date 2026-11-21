"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Link2, Plus, Sparkles, X } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button, Card, DemoBadge, Skeleton } from "@/components/ui";
import { api, bulletOf, useEntries } from "@/lib/client";
import type { Profile } from "@/lib/types";
import { NamecardView } from "./NamecardView";

export function NamecardTab() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { entries } = useEntries();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [origin, setOrigin] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    api<{ profile: Profile }>("/api/profile").then((d) => setProfile(d.profile));
  }, []);

  const url = `${origin}/cv/namecard/${profile?.userId ?? "minji"}`;
  const projects = (profile?.bestProjects ?? []).map((id) => entries?.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => Boolean(e));

  const generate = async () => {
    setLoading(true);
    try {
      const d = await api<{ profile: Profile; demoMode: boolean }>("/api/cv/namecard", { method: "POST", json: { lang } });
      setProfile(d.profile);
      setDemo(d.demoMode);
      setDirty(false);
      toast(L("Namecard updated ✨", "명함을 업데이트했어요 ✨"));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!profile) return;
    const { name, year, email, oneLineIntro, interests, topSkills, bestProjects } = profile;
    await api("/api/profile", { method: "PUT", json: { name, year, email, oneLineIntro, interests, topSkills, bestProjects } });
    setDirty(false);
    toast(L("Saved!", "저장했어요!"));
  };

  const update = (patch: Partial<Profile>) => {
    setProfile((p) => (p ? { ...p, ...patch } : p));
    setDirty(true);
  };

  const downloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true, skipFonts: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${profile?.name ?? "namecard"}-finDLab.png`;
      a.click();
    } catch {
      toast(L("Couldn't create the image", "이미지를 만들지 못했어요"), "error");
    }
  };

  if (!profile || entries === null) return <Skeleton className="h-96" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button color="cv" onClick={generate} disabled={loading}>
            <Sparkles className="h-4 w-4" /> {L("Update from my diary", "다이어리로 업데이트")}
          </Button>
          <Button
            variant="secondary"
            color="navy"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast(L("Link copied!", "링크를 복사했어요!"));
            }}
          >
            <Link2 className="h-4 w-4" /> {L("Copy link", "링크 복사")}
          </Button>
          <Button variant="secondary" color="navy" onClick={downloadPng}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <DemoBadge show={demo} />
        </div>
        <div className="grid place-items-center rounded-2xl bg-gradient-to-br from-cv-tint via-cream to-lab-tint p-6 md:p-10">
          {loading ? (
            <div className="w-full max-w-[700px] rounded-2xl bg-white p-8" style={{ aspectRatio: "3.5/2" }}>
              <AIThinking lines={5} />
            </div>
          ) : (
            <NamecardView ref={cardRef} profile={profile} projects={projects} url={url} />
          )}
        </div>
        <p className="text-center text-xs text-slate-500">
          {L("QR code opens your public namecard:", "QR 코드를 찍으면 공개 명함이 열려요:")}{" "}
          <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-cv hover:underline">
            {url.replace(/^https?:\/\//, "")}
          </a>
        </p>
      </div>

      <Card className="space-y-4 self-start">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{L("Edit namecard", "명함 수정")}</h3>
          <Button color="cv" className="py-1.5 text-xs" onClick={save} disabled={!dirty}>
            {L("Save", "저장")}
          </Button>
        </div>
        <Field label={L("Name", "이름")}>
          <input className="input" value={profile.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <Field label={L("Year", "학년")}>
          <input className="input" value={profile.year} onChange={(e) => update({ year: e.target.value })} />
        </Field>
        <Field label={L("One-line intro", "한 줄 소개")}>
          <textarea className="input" rows={2} value={profile.oneLineIntro} onChange={(e) => update({ oneLineIntro: e.target.value })} />
        </Field>
        <Field label={L("Top skills (level 1–4)", "핵심 스킬 (1–4단계)")}>
          <div className="space-y-1.5">
            {profile.topSkills.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input py-1.5"
                  value={s.name}
                  onChange={(e) => update({ topSkills: profile.topSkills.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                />
                <select
                  className="input w-20 py-1.5"
                  value={s.level}
                  onChange={(e) =>
                    update({ topSkills: profile.topSkills.map((x, j) => (j === i ? { ...x, level: Number(e.target.value) as 1 | 2 | 3 | 4 } : x)) })
                  }
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <button onClick={() => update({ topSkills: profile.topSkills.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {profile.topSkills.length < 5 && (
              <button
                onClick={() => update({ topSkills: [...profile.topSkills, { name: "", level: 2 }] })}
                className="flex items-center gap-1 text-xs font-semibold text-cv"
              >
                <Plus className="h-3.5 w-3.5" /> {L("Add skill", "스킬 추가")}
              </button>
            )}
          </div>
        </Field>
        <Field label={L("Best projects (pick 3)", "대표 프로젝트 (3개)")}>
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {entries.map((e) => {
              const on = profile.bestProjects.includes(e.id);
              return (
                <label key={e.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 text-xs hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && profile.bestProjects.length >= 3}
                    onChange={() => update({ bestProjects: on ? profile.bestProjects.filter((x) => x !== e.id) : [...profile.bestProjects, e.id] })}
                    className="mt-0.5 accent-[#3B5BDB]"
                  />
                  <span className="line-clamp-2">{bulletOf(e)}</span>
                </label>
              );
            })}
          </div>
        </Field>
        <Field label="Email">
          <input className="input" value={profile.email} onChange={(e) => update({ email: e.target.value })} />
        </Field>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
