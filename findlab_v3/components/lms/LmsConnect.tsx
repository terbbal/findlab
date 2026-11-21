"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarSync, FileUp, Laptop, Lock, RefreshCw, Unplug } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card } from "@/components/ui";
import { useDB } from "@/lib/localdb";
import { connectLms, disconnectLms, getLmsUrl, loadSampleLms, uploadIcs } from "./lms";

export function LmsConnect() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSaved(getLmsUrl()), [db?.lmsSyncedAt]);

  const run = async (fn: () => Promise<unknown[]>, ok: string) => {
    setBusy(true);
    try {
      const items = await fn();
      toast(`${ok} (${items.length})`);
      setSaved(getLmsUrl());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setBusy(false);
    }
  };

  const count = db?.lms.length ?? 0;
  const isSample = db?.lms.some((x) => x.uid.startsWith("sample-"));

  return (
    <Card className="space-y-4">
      <h2 className="flex items-center gap-2 font-bold">
        <Laptop className="h-5 w-5 text-cv" /> {L("Connect LMS (lms.dgist.ac.kr)", "LMS 연결 (lms.dgist.ac.kr)")}
      </h2>
      {count > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-lab-tint/70 px-3 py-2 text-sm text-lab">
          <CalendarSync className="h-4 w-4" />
          {isSample ? L(`Sample data: ${count} items`, `샘플 데이터: ${count}개`) : L(`${count} items imported`, `${count}개 가져옴`)}
          {db?.lmsSyncedAt && <span className="text-xs text-slate-500">· {L("synced", "동기화")} {new Date(db.lmsSyncedAt).toLocaleString()}</span>}
        </div>
      )}
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>{L("Log in to lms.dgist.ac.kr in your browser.", "브라우저에서 lms.dgist.ac.kr에 로그인하세요.")}</li>
        <li>{L("Open Calendar → Share / Get external calendar link.", "캘린더 → 공유 / 외부 캘린더 링크 받기를 여세요.")}</li>
        <li>{L("Copy the iCal URL and paste it below.", "iCal 주소를 복사해 아래에 붙여넣으세요.")}</li>
      </ol>
      <div className="grid h-24 place-items-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400">{L("[Screenshot: Blackboard calendar share button]", "[스크린샷: 블랙보드 캘린더 공유 버튼]")}</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="https://lms.dgist.ac.kr/…/calendar.ics" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button color="cv" disabled={busy || !url.trim()} onClick={() => run(() => connectLms(url.trim()), L("LMS connected", "LMS 연결됨"))}>
          {L("Connect", "연결")}
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {L(
          "We never ask for your LMS password. The calendar link is saved only in this browser; our server just reads the calendar to import it and keeps nothing.",
          "LMS 비밀번호는 절대 묻지 않아요. 캘린더 링크는 이 브라우저에만 저장되고, 서버는 가져오기 위해 읽기만 하고 아무것도 저장하지 않아요.",
        )}
      </p>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={(e) => e.target.files?.[0] && run(() => uploadIcs(e.target.files![0]), L("Calendar imported", "캘린더를 가져왔어요"))} />
        <Button variant="secondary" color="navy" disabled={busy} onClick={() => fileRef.current?.click()}>
          <FileUp className="h-4 w-4" /> {L("Upload .ics file", ".ics 파일 업로드")}
        </Button>
        <Button variant="secondary" color="navy" disabled={busy} onClick={() => run(async () => loadSampleLms(), L("Sample data loaded", "샘플 데이터를 불러왔어요"))}>
          {L("Try with sample data", "샘플 데이터로 체험")}
        </Button>
        {saved && (
          <Button variant="secondary" color="cv" disabled={busy} onClick={() => run(() => connectLms(saved), L("Synced", "동기화됨"))}>
            <RefreshCw className="h-4 w-4" /> {L("Sync now", "지금 동기화")}
          </Button>
        )}
        {(count > 0 || saved) && (
          <Button
            variant="ghost"
            color="mail"
            onClick={() => {
              disconnectLms();
              setSaved(null);
              toast(L("LMS disconnected — link and items deleted", "LMS 연결 해제 — 링크와 항목을 삭제했어요"));
            }}
          >
            <Unplug className="h-4 w-4" /> {L("Disconnect LMS", "LMS 연결 해제")}
          </Button>
        )}
      </div>
    </Card>
  );
}
