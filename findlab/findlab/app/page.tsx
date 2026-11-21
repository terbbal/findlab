"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileDown, FileText, FlaskConical, Mail, Search } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Card, Chip, DemoBadge } from "@/components/ui";
import { DiaryComposer } from "@/components/cv/DiaryComposer";
import { EntryCard } from "@/components/cv/EntryCard";
import { SkillDots } from "@/components/namecard/NamecardView";
import { DeadlineBadge, DeadlineList, NudgeList, useOpportunities } from "@/components/shared/Nudges";
import { api, useEntries } from "@/lib/client";
import type { DiaryEntry, MailRecord, Profile } from "@/lib/types";

export default function Dashboard() {
  const { lang, t } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { entries } = useEntries();
  const ops = useOpportunities();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mails, setMails] = useState<MailRecord[]>([]);
  const [labsMatched, setLabsMatched] = useState(0);
  const [justSaved, setJustSaved] = useState<{ entry: DiaryEntry; demo: boolean } | null>(null);

  const loadProfile = () => api<{ profile: Profile }>("/api/profile").then((d) => setProfile(d.profile));
  useEffect(() => {
    loadProfile();
    api<{ mails: MailRecord[] }>("/api/mails").then((d) => setMails(d.mails));
    try {
      setLabsMatched(Number(localStorage.getItem("findlab.labsMatched") ?? 0));
    } catch {}
  }, []);
  // Namecard refreshes in the background after a save — reload it shortly after.
  useEffect(() => {
    if (!justSaved) return;
    const id = setTimeout(loadProfile, 1200);
    return () => clearTimeout(id);
  }, [justSaved]);

  const first = (profile?.name ?? "Minji").split(" ")[0];
  const displayName = lang === "ko" && profile?.nameKo ? profile.nameKo : first;
  const dateStr = new Date().toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { weekday: "long", month: "long", day: "numeric" });
  const sent = mails.filter((m) => m.status !== "draft").length;

  const progress = [
    { n: "①", label: t("step.cv"), value: L(`${entries?.length ?? "–"} entries`, `기록 ${entries?.length ?? "–"}개`), pct: Math.min(100, ((entries?.length ?? 0) / 15) * 100), color: "#3B5BDB", tint: "#EEF2FF", href: "/cv", icon: FileText },
    { n: "②", label: t("step.lab"), value: L(`${labsMatched} labs matched`, `연구실 ${labsMatched}곳 매칭`), pct: labsMatched ? 100 : 0, color: "#0C8F6F", tint: "#E7F7F1", href: "/labs", icon: FlaskConical },
    { n: "③", label: t("step.mail"), value: L(`${sent} mail${sent === 1 ? "" : "s"} sent`, `메일 ${sent}통 보냄`), pct: Math.min(100, sent * 34), color: "#D9480F", tint: "#FFF1E8", href: "/mail", icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{dateStr}</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("home.hi", { name: displayName })}</h1>
          <p className="mt-1 text-slate-500">{t("tagline")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/labs" className="inline-flex items-center gap-1.5 rounded-xl bg-lab px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-110">
            <Search className="h-4 w-4" /> {L("Find my lab", "내 연구실 찾기")} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/cv?tab=export" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-cv hover:bg-cv-tint">
            <FileDown className="h-4 w-4" /> {L("Export CV", "CV 내보내기")}
          </Link>
        </div>
      </div>

      {/* Progress strip */}
      <div className="grid gap-3 md:grid-cols-3">
        {progress.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.n} href={p.href} className="group rounded-2xl bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: p.tint, color: p.color }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold" style={{ color: p.color }}>
                    {p.n} {p.label}
                  </div>
                  <div className="font-bold">{p.value}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: p.tint }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.pct}%`, background: p.color }} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card className="border-t-4 border-cv">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("home.prompt")} ✍️</h2>
              <DemoBadge show={justSaved?.demo} />
            </div>
            <p className="mb-3 text-sm text-slate-500">{t("home.promptHint")}</p>
            <DiaryComposer compact onSaved={(entry, demo) => setJustSaved({ entry, demo })} />
            {justSaved && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-cv">✨ {L("Just added to your CV", "방금 CV에 추가됐어요")}</div>
                <EntryCard entry={entries?.find((e) => e.id === justSaved.entry.id) ?? justSaved.entry} isNew />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-bold">💡 {L("Nudges for you", "이런 건 어때요?")}</h2>
            <NudgeList entryCount={entries?.length ?? null} max={2} />
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">⏰ {L("Upcoming deadlines", "다가오는 마감")}</h2>
              <DeadlineBadge />
            </div>
            <DeadlineList ops={ops} limit={3} />
          </Card>

          <Link href="/cv?tab=namecard" className="block">
            <Card className="relative overflow-hidden transition hover:-translate-y-0.5">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-dgist via-lab to-mail" />
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{L("My namecard", "내 명함")}</span>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="text-xl font-extrabold">{profile?.name}</div>
              <div className="mb-2 text-xs text-slate-500">DGIST · {profile?.year}</div>
              <p className="mb-3 line-clamp-2 text-sm">{profile?.oneLineIntro}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {profile?.topSkills.slice(0, 4).map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{s.name}</span>
                    <SkillDots level={s.level} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {profile?.interests.map((i) => (
                  <Chip key={i} color="lab">
                    #{i}
                  </Chip>
                ))}
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
