"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Copy, Mail, Minimize2, RefreshCw, Send, Sparkles, Wand2 } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { AIThinking, Button, Card, DemoBadge } from "@/components/ui";
import { api } from "@/lib/client";
import type { Lab, Lang, MailRecord } from "@/lib/types";

const PURPOSES = ["Undergrad internship", "UGRP advising", "Grad school inquiry", "Ask a question"] as const;
const PURPOSE_KO: Record<string, string> = {
  "Undergrad internship": "학부 인턴십",
  "UGRP advising": "UGRP 지도 요청",
  "Grad school inquiry": "대학원 진학 문의",
  "Ask a question": "질문하기",
};

export function MailComposer({ labs, onSent }: { labs: Lab[]; onSent: (m: MailRecord) => void }) {
  const params = useSearchParams();
  const { lang: uiLang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (uiLang === "ko" ? ko : en);

  const [labId, setLabId] = useState<string>(params.get("lab") ?? "");
  const lab = useMemo(() => labs.find((l) => l.id === labId), [labs, labId]);
  const [contactName, setContactName] = useState("");
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>("Undergrad internship");
  const [mailLang, setMailLang] = useState<Lang>("ko");
  const [tone, setTone] = useState<"Formal" | "Warm-formal">("Formal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState<null | string>(null);
  const [demo, setDemo] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  // Default lab and contact
  useEffect(() => {
    if (!labId && labs.length) setLabId(labs[0].id);
  }, [labs, labId]);
  useEffect(() => {
    if (lab) setContactName((lab.contacts.find((c) => c.role === "Professor") ?? lab.contacts[0])?.name ?? "");
  }, [lab]);
  const contact = lab?.contacts.find((c) => c.name === contactName);

  const generate = async (action: "new" | "shorter" | "formal") => {
    if (!lab) return;
    setLoading(action);
    setSentId(null);
    try {
      const data = await api<{ subject: string; body: string; demoMode: boolean }>("/api/mail/generate", {
        method: "POST",
        json: {
          labId: lab.id,
          contactName,
          purpose,
          lang: mailLang,
          tone,
          action,
          current: action === "new" ? undefined : { subject, body },
          namecardUrl: `${window.location.origin}/cv/namecard/minji`,
        },
      });
      setSubject(data.subject);
      setBody(data.body);
      setDemo(data.demoMode);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setLoading(null);
    }
  };

  // Auto-generate when arriving from a lab card ("Write email →")
  const [autoDone, setAutoDone] = useState(false);
  useEffect(() => {
    if (!autoDone && params.get("lab") && lab && contactName) {
      setAutoDone(true);
      generate("new");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab, contactName]);

  const mailto = `mailto:${contact?.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const words = mailLang === "en" ? body.trim().split(/\s+/).filter(Boolean).length : body.replace(/\s/g, "").length;

  const markSent = async () => {
    if (!lab) return;
    try {
      const { mail } = await api<{ mail: MailRecord }>("/api/mails", {
        method: "POST",
        json: { labId: lab.id, contactName, contactEmail: contact?.email ?? null, subject, body, language: mailLang, status: "sent" },
      });
      setSentId(mail.id);
      onSent(mail);
      toast(L("Saved — we'll remind you to follow up in 7 days 📬", "저장했어요 — 7일 후 팔로업을 알려 드릴게요 📬"));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
  };

  const Select = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );

  const Toggle = <T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) => (
    <div className="flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${value === o.v ? "bg-white text-mail shadow-sm" : "text-slate-500"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="space-y-4 self-start">
        <Select label={L("Lab", "연구실")}>
          <select className="input" value={labId} onChange={(e) => setLabId(e.target.value)}>
            {labs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Select>
        <Select label={L("Contact", "받는 사람")}>
          <select className="input" value={contactName} onChange={(e) => setContactName(e.target.value)}>
            {lab?.contacts.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} · {c.role}
              </option>
            ))}
          </select>
        </Select>
        <Select label={L("Purpose", "목적")}>
          <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value as (typeof PURPOSES)[number])}>
            {PURPOSES.map((p) => (
              <option key={p} value={p}>
                {uiLang === "ko" ? PURPOSE_KO[p] : p}
              </option>
            ))}
          </select>
        </Select>
        <Select label={L("Email language", "메일 언어")}>
          <Toggle value={mailLang} onChange={setMailLang} options={[{ v: "ko", label: "한국어" }, { v: "en", label: "English" }]} />
        </Select>
        <Select label={L("Tone", "톤")}>
          <Toggle
            value={tone}
            onChange={setTone}
            options={[
              { v: "Formal", label: L("Formal", "격식") },
              { v: "Warm-formal", label: L("Warm-formal", "따뜻한 격식") },
            ]}
          />
        </Select>
        <Button color="mail" className="w-full py-2.5 text-base" onClick={() => generate("new")} disabled={!lab || Boolean(loading)}>
          <Sparkles className="h-4 w-4" /> {body ? L("Regenerate", "다시 만들기") : L("Draft my email", "메일 초안 만들기")}
        </Button>
      </Card>

      <Card className="flex min-h-[520px] flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">{L("Your draft", "메일 초안")}</h2>
          <DemoBadge show={demo && Boolean(body)} />
          {body && (
            <span className="ml-auto text-xs text-slate-400">
              {words} {mailLang === "en" ? "words" : "자"}
            </span>
          )}
        </div>

        {loading === "new" && !body ? (
          <AIThinking lines={8} className="py-6" />
        ) : !body ? (
          <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
            <div>
              <Mail className="mx-auto mb-2 h-8 w-8 text-mail/60" />
              {L("Pick a lab and contact, then draft your email.", "연구실과 받는 사람을 고르고 초안을 만들어 보세요.")}
              <div className="mt-1 text-xs">{L("Nothing is ever sent automatically.", "메일은 절대 자동으로 보내지지 않아요.")}</div>
            </div>
          </div>
        ) : (
          <div className={`flex flex-1 flex-col gap-3 transition ${loading ? "pointer-events-none opacity-50" : ""}`}>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-14 shrink-0 font-semibold text-slate-400">{L("To", "받는 이")}</span>
              <span className="truncate">
                {contactName}{" "}
                {contact?.email ? (
                  <span className="text-slate-500">&lt;{contact.email}&gt;</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {L("Email not listed — check the lab website", "이메일 미공개 — 연구실 홈페이지에서 확인하세요")}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-sm font-semibold text-slate-400">{L("Subject", "제목")}</span>
              <input className="input font-semibold" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <textarea
              className="input min-h-[340px] flex-1 resize-y font-[inherit] text-[15px] leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" color="mail" onClick={() => generate("new")} disabled={Boolean(loading)}>
                <RefreshCw className={`h-4 w-4 ${loading === "new" ? "animate-spin" : ""}`} /> {L("Regenerate", "다시 만들기")}
              </Button>
              <Button variant="secondary" color="mail" onClick={() => generate("shorter")} disabled={Boolean(loading)}>
                <Minimize2 className={`h-4 w-4 ${loading === "shorter" ? "animate-pulse" : ""}`} /> {L("Make shorter", "더 짧게")}
              </Button>
              <Button variant="secondary" color="mail" onClick={() => generate("formal")} disabled={Boolean(loading)}>
                <Wand2 className={`h-4 w-4 ${loading === "formal" ? "animate-pulse" : ""}`} /> {L("Make more formal", "더 격식 있게")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <a
                href={mailto}
                className="inline-flex items-center gap-1.5 rounded-xl bg-mail px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              >
                <Send className="h-4 w-4" /> {L("Open in mail app", "메일 앱에서 열기")}
              </a>
              <Button
                variant="secondary"
                color="navy"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${subject}\n\n${body}`);
                  toast(L("Copied!", "복사했어요!"));
                }}
              >
                <Copy className="h-4 w-4" /> {L("Copy", "복사")}
              </Button>
              <Button variant="secondary" color="lab" onClick={markSent} disabled={Boolean(sentId)} className="ml-auto">
                <Check className="h-4 w-4" /> {sentId ? L("Marked as sent", "보냄으로 표시됨") : L("Mark as sent", "보냄으로 표시")}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              {L(
                "You send it yourself from your DGIST mail — finD Lab never sends emails automatically.",
                "DGIST 메일에서 직접 보내세요 — finD Lab은 메일을 자동으로 보내지 않아요.",
              )}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
