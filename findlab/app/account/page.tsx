"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Cloud, CloudOff, LogOut, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card } from "@/components/ui";
import { ALLOWED_DOMAIN } from "@/lib/supabase";

export default function AccountPage() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const { enabled, session, email, sync, lastSynced, sendLink, signOut, deleteCloudData } = useAuth();
  const [addr, setAddr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!enabled)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CloudOff className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <h1 className="text-xl font-bold">{L("Sign-in isn't set up on this server", "이 서버에는 로그인이 설정되지 않았어요")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {L("You can use everything as a guest — your data stays in this browser.", "게스트로 모든 기능을 쓸 수 있어요 — 데이터는 이 브라우저에 저장돼요.")}
        </p>
      </Card>
    );

  if (session)
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Card>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-dgist to-lab text-lg font-bold text-white">{email?.[0]?.toUpperCase()}</span>
            <div>
              <div className="text-xs font-semibold text-lab">● {L("Signed in", "로그인됨")}</div>
              <div className="font-bold">{email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
            {sync === "error" ? <CloudOff className="h-4 w-4 text-red-500" /> : <Cloud className="h-4 w-4 text-lab" />}
            {sync === "syncing"
              ? L("Syncing…", "동기화 중…")
              : sync === "error"
                ? L("Sync failed — check the Supabase table/policy (see README).", "동기화 실패 — Supabase 테이블/정책을 확인하세요 (README).")
                : L("Your diary, roadmaps, saved labs, courses and LMS items are saved to your account.", "다이어리, 로드맵, 저장한 연구실, 수업, LMS 항목이 계정에 저장돼요.")}
          </div>
          {lastSynced && <p className="mt-1 text-xs text-slate-400">{L("Last synced", "마지막 동기화")}: {new Date(lastSynced).toLocaleString()}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
              {L("Go to my dashboard", "내 대시보드로")}
            </Link>
            <Button variant="secondary" color="navy" onClick={() => signOut().then(() => toast(L("Signed out", "로그아웃했어요")))}>
              <LogOut className="h-4 w-4" /> {L("Sign out", "로그아웃")}
            </Button>
          </div>
        </Card>
        <Card className="text-sm">
          <h2 className="mb-1 font-bold">{L("Delete my account data", "내 계정 데이터 삭제")}</h2>
          <p className="mb-3 text-slate-500">{L("Removes everything finD Lab saved to your account (cloud copy). Data in this browser stays until you delete it in Settings.", "계정에 저장된 finD Lab 데이터(클라우드)를 모두 삭제해요. 이 브라우저의 데이터는 설정에서 따로 삭제할 수 있어요.")}</p>
          <Button
            variant="ghost"
            color="mail"
            onClick={async () => {
              if (!confirm(L("Delete all your data from your account?", "계정의 모든 데이터를 삭제할까요?"))) return;
              try {
                await deleteCloudData();
                await signOut();
                toast(L("Account data deleted", "계정 데이터를 삭제했어요"));
              } catch (e) {
                toast(e instanceof Error ? e.message : "Error", "error");
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> {L("Delete my account data", "계정 데이터 삭제")}
          </Button>
        </Card>
      </div>
    );

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">{L("Sign in to finD Lab", "finD Lab 로그인")}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {L("Keep your diary and roadmap on every device. We email you a sign-in link — no password.", "모든 기기에서 다이어리와 로드맵을 이어서 써요. 로그인 링크를 메일로 보내드려요 — 비밀번호 없음.")}
      </p>
      {sent ? (
        <div className="mt-5 rounded-xl bg-lab-tint p-4 text-sm text-lab">
          <CheckCircle2 className="mb-1 h-5 w-5" />
          {L(`Check ${addr} — click the link in the email to sign in.`, `${addr} 메일함을 확인하고 링크를 눌러 로그인하세요.`)}
          <button onClick={() => setSent(false)} className="mt-2 block text-xs font-semibold underline">
            {L("Use a different email", "다른 이메일 사용")}
          </button>
        </div>
      ) : (
        <form
          className="mt-5 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await sendLink(addr);
              setSent(true);
            } catch (err) {
              toast(err instanceof Error ? err.message : "Error", "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" type="email" required placeholder={ALLOWED_DOMAIN ? `you@${ALLOWED_DOMAIN}` : "you@example.com"} value={addr} onChange={(e) => setAddr(e.target.value)} />
          </div>
          <Button color="cv" className="w-full py-2.5" disabled={busy}>
            {busy ? L("Sending…", "보내는 중…") : L("Email me a sign-in link", "로그인 링크 받기")}
          </Button>
        </form>
      )}
      <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {ALLOWED_DOMAIN ? L(`Only @${ALLOWED_DOMAIN} accounts. `, `@${ALLOWED_DOMAIN} 계정만 가능해요. `) : ""}
        {L("Without signing in, everything still works as a guest (saved in this browser).", "로그인하지 않아도 게스트로 모두 쓸 수 있어요 (이 브라우저에 저장).")}{" "}
        <Link href="/privacy" className="underline">
          {L("Privacy", "개인정보")}
        </Link>
      </p>
    </Card>
  );
}
