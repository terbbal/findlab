"use client";

import { useState } from "react";
import clsx from "clsx";
import { CalendarPlus, ChevronDown, Clock, Copy, MessageSquareReply, NotebookPen, Send, Sparkles } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button, Card, DemoBadge } from "@/components/ui";
import { api, daysUntil, notifyEntriesChanged, todayISO } from "@/lib/client";
import { downloadICS } from "@/lib/ics";
import type { Lab, MailRecord } from "@/lib/types";

const SAMPLE_REPLY = {
  en: "Dear Minji,\n\nThank you for your email and for your interest in our lab. Your gesture-recognition project sounds interesting. I'd be happy to meet for 15 minutes next week — please send me two or three times that work for you. Before we meet, it would help if you could skim our two most recent papers on the lab website.\n\nBest,\nProf. Seo",
  ko: "민지 학생에게,\n\n메일 잘 받았습니다. 우리 연구실에 관심을 가져 주어 고맙습니다. 손동작 인식 프로젝트가 흥미롭네요. 다음 주에 15분 정도 면담 가능합니다. 편한 시간 두세 개를 알려 주세요. 만나기 전에 연구실 홈페이지의 최근 논문 두 편을 가볍게 읽어 오면 좋겠습니다.\n\n서하나 드림",
};

function StatusChip({ m }: { m: MailRecord }) {
  const { lang } = useLang();
  const overdue = m.status === "sent" && m.followUpDueAt && new Date(m.followUpDueAt) < new Date();
  const style =
    m.status === "replied"
      ? "bg-lab-tint text-lab"
      : overdue
        ? "bg-mail-tint text-mail"
        : m.status === "sent"
          ? "bg-cv-tint text-cv"
          : "bg-slate-100 text-slate-500";
  const label =
    m.status === "replied"
      ? lang === "ko" ? "답장 받음" : "Replied"
      : overdue
        ? lang === "ko" ? "7일+ 답장 없음" : "No reply · 7d+"
        : m.status === "sent"
          ? lang === "ko" ? "보냄" : "Sent"
          : lang === "ko" ? "초안" : "Draft";
  return <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-bold", style)}>{label}</span>;
}

function MailRow({ m, lab, onUpdate }: { m: MailRecord; lab?: Lab; onUpdate: (m: MailRecord) => void }) {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState(m.replyText ?? "");
  const [busy, setBusy] = useState<null | "summary" | "followup">(null);
  const [demo, setDemo] = useState(false);
  const [followUp, setFollowUp] = useState<{ subject: string; body: string } | null>(null);

  const overdue = m.status === "sent" && m.followUpDueAt && new Date(m.followUpDueAt) < new Date();
  const dueIn = m.followUpDueAt ? daysUntil(m.followUpDueAt.slice(0, 10)) : null;

  const summarize = async () => {
    setBusy("summary");
    try {
      const s = await api<MailRecord["replySummary"] & { demoMode: boolean }>("/api/mail/summarize", {
        method: "POST",
        json: { replyText: reply, lang, originalSubject: m.subject },
      });
      const { demoMode, ...replySummary } = s!;
      setDemo(demoMode);
      const { mail } = await api<{ mail: MailRecord }>("/api/mails", {
        method: "PATCH",
        json: { id: m.id, status: "replied", replyText: reply, replySummary },
      });
      onUpdate(mail);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setBusy(null);
    }
  };

  const makeFollowUp = async () => {
    setBusy("followup");
    setOpen(true);
    try {
      const d = await api<{ subject: string; body: string; demoMode: boolean }>("/api/mail/generate", {
        method: "POST",
        json: { labId: m.labId, contactName: m.contactName, lang: m.language, action: "followup", current: { subject: m.subject, body: m.body } },
      });
      setFollowUp({ subject: d.subject, body: d.body });
      setDemo(d.demoMode);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setBusy(null);
    }
  };

  const saveStepToDiary = async (step: string) => {
    await api("/api/diary", {
      method: "POST",
      json: {
        date: todayISO(),
        rawNote: `${lab?.name ?? m.labId}: ${step}`,
        source: "text",
        category: "Research",
        skills: [],
        cvBullet: `${step} (${lab?.name ?? "lab"})`,
      },
    });
    notifyEntriesChanged();
    toast(L("Added to your diary", "다이어리에 추가했어요"));
  };

  const sentiment = m.replySummary?.sentiment;
  const sentimentStyle = { positive: "bg-lab text-white", neutral: "bg-slate-200 text-slate-700", negative: "bg-red-100 text-red-700" };

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-3">
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className={clsx("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{m.subject}</div>
            <div className="truncate text-xs text-slate-500">
              {lab?.name ?? m.labId} · {m.contactName}
            </div>
          </div>
        </button>
        <span className="text-xs text-slate-500">{m.sentAt?.slice(0, 10)}</span>
        <StatusChip m={m} />
        {m.status === "sent" && !overdue && dueIn !== null && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" /> {L(`follow up in ${dueIn}d`, `${dueIn}일 후 팔로업`)}
          </span>
        )}
        {overdue && (
          <Button color="mail" className="py-1.5 text-xs" onClick={makeFollowUp} disabled={busy === "followup"}>
            <Send className="h-3.5 w-3.5" /> {L("Follow up?", "팔로업 메일?")}
          </Button>
        )}
        {m.status !== "replied" && (
          <Button variant="secondary" color="lab" className="py-1.5 text-xs" onClick={() => setOpen(true)}>
            <MessageSquareReply className="h-3.5 w-3.5" /> {L("Paste reply", "답장 붙여넣기")}
          </Button>
        )}
      </div>

      {open && (
        <div className="mb-4 grid gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-400">{L("Your email", "보낸 메일")}</div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-[inherit] text-sm text-slate-600">{m.body}</pre>
          </div>
          <div className="space-y-3">
            {busy === "followup" && <AIThinking lines={4} />}
            {followUp && (
              <div className="rounded-xl bg-white p-3 ring-2 ring-mail/30">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-mail">
                  {L("Follow-up draft", "팔로업 초안")} <DemoBadge show={demo} />
                </div>
                <div className="mb-1 text-sm font-semibold">{followUp.subject}</div>
                <pre className="whitespace-pre-wrap font-[inherit] text-sm">{followUp.body}</pre>
                <div className="mt-2 flex gap-2">
                  <a
                    className="inline-flex items-center gap-1 rounded-lg bg-mail px-3 py-1.5 text-xs font-bold text-white"
                    href={`mailto:${m.contactEmail ?? ""}?subject=${encodeURIComponent(followUp.subject)}&body=${encodeURIComponent(followUp.body)}`}
                  >
                    <Send className="h-3.5 w-3.5" /> {L("Open in mail app", "메일 앱에서 열기")}
                  </a>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${followUp.subject}\n\n${followUp.body}`);
                      toast(L("Copied!", "복사했어요!"));
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> {L("Copy", "복사")}
                  </button>
                </div>
              </div>
            )}

            {m.replySummary ? (
              <div className="rounded-xl bg-white p-3 ring-2 ring-lab/30">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-lab" />
                  <span className="text-xs font-bold uppercase text-lab">{L("Reply summary", "답장 요약")}</span>
                  {sentiment && <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-bold", sentimentStyle[sentiment])}>{sentiment}</span>}
                  <DemoBadge show={demo} />
                </div>
                <p className="mb-3 text-sm">{m.replySummary.summary}</p>
                <div className="mb-1 text-xs font-bold uppercase text-slate-400">{L("Next steps", "다음 할 일")}</div>
                <ul className="space-y-1.5">
                  {m.replySummary.nextSteps.map((s) => (
                    <li key={s} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="flex-1">☐ {s}</span>
                      <button
                        onClick={() => saveStepToDiary(s)}
                        className="inline-flex items-center gap-1 rounded-lg bg-cv-tint px-2 py-1 text-[11px] font-semibold text-cv"
                      >
                        <NotebookPen className="h-3 w-3" /> {L("Diary", "다이어리")}
                      </button>
                      <button
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 3);
                          downloadICS({ title: s, date: d.toISOString().slice(0, 10), description: m.subject });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-mail-tint px-2 py-1 text-[11px] font-semibold text-mail"
                      >
                        <CalendarPlus className="h-3 w-3" /> {L("Calendar", "캘린더")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">{L("Paste their reply", "받은 답장 붙여넣기")}</span>
                  <button className="text-xs font-semibold text-lab hover:underline" onClick={() => setReply(SAMPLE_REPLY[m.language])}>
                    {L("Use sample reply", "샘플 답장 사용")}
                  </button>
                </div>
                <textarea className="input" rows={6} value={reply} onChange={(e) => setReply(e.target.value)} />
                {busy === "summary" ? (
                  <AIThinking lines={3} className="mt-2" />
                ) : (
                  <Button color="lab" className="mt-2" onClick={summarize} disabled={reply.trim().length < 5}>
                    <Sparkles className="h-4 w-4" /> {L("Summarize reply", "답장 요약하기")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SentMails({ mails, labs, onUpdate }: { mails: MailRecord[]; labs: Lab[]; onUpdate: (m: MailRecord) => void }) {
  const { lang } = useLang();
  return (
    <Card>
      <h2 className="mb-2 text-lg font-bold">{lang === "ko" ? "보낸 메일 & 팔로업" : "Sent mails & follow-ups"}</h2>
      {mails.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {lang === "ko" ? "아직 보낸 메일이 없어요. 초안을 만들고 '보냄으로 표시'를 눌러 보세요." : "No mails yet — draft one above and click “Mark as sent”."}
        </p>
      ) : (
        mails.map((m) => <MailRow key={m.id} m={m} lab={labs.find((l) => l.id === m.labId)} onUpdate={onUpdate} />)
      )}
    </Card>
  );
}
