"use client";

import { useRef } from "react";
import Link from "next/link";
import JSZip from "jszip";
import matter from "gray-matter";
import { Download, FlaskConical, Trash2, Upload, UserRound } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card } from "@/components/ui";
import { addEntry, deleteAllData, setWorkspace, useDB } from "@/lib/localdb";
import { CATEGORIES, type Category, type DiaryEntry } from "@/lib/types";

function toMd(e: DiaryEntry) {
  return matter.stringify(`## Note\n${e.rawNote}\n\n## CV line\n${e.cvBulletEdited || e.cvBullet}\n`, {
    id: e.id,
    date: e.date,
    source: e.source,
    category: e.category,
    skills: e.skills,
    highlight: Boolean(e.highlight),
  });
}

export function DataControls() {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const db = useDB();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportZip = async () => {
    if (!db) return;
    const zip = new JSZip();
    db.entries.forEach((e) => zip.file(`${e.id}.md`, toMd(e)));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `findlab-diary-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
  };

  const importMd = async (files: FileList) => {
    let n = 0;
    for (const f of Array.from(files)) {
      try {
        const { data, content } = matter(await f.text());
        const sec: Record<string, string> = {};
        content.split(/^## /m).slice(1).forEach((c) => {
          const i = c.indexOf("\n");
          sec[c.slice(0, i).trim()] = c.slice(i + 1).trim();
        });
        const note = sec["Note"] || content.trim();
        if (!note) continue;
        const cat = (CATEGORIES as string[]).includes(String(data.category)) ? (data.category as Category) : "Other";
        addEntry({
          date: data.date ? String(data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date) : new Date().toISOString().slice(0, 10),
          rawNote: note,
          source: "text",
          category: cat,
          skills: Array.isArray(data.skills) ? data.skills.map(String) : [],
          cvBullet: sec["CV line"] || sec["CV bullet"] || note,
          highlight: Boolean(data.highlight),
        });
        n++;
      } catch {}
    }
    toast(L(`Imported ${n} entries`, `${n}개 기록을 가져왔어요`));
  };

  return (
    <Card className="space-y-4">
      <h2 className="flex items-center gap-2 font-bold">
        <UserRound className="h-5 w-5 text-mail" /> {L("Your data", "내 데이터")}
      </h2>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">{L("Workspace:", "작업 공간:")}</span>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(["me", "demo"] as const).map((w) => (
            <button key={w} onClick={() => setWorkspace(w)} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold ${db?.workspace === w ? "bg-white shadow-sm" : "text-slate-500"}`}>
              {w === "me" ? <UserRound className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
              {w === "me" ? L("My data", "내 데이터") : L("Demo (Minji)", "데모 (민지)")}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {L("Your diary, roadmaps, saved labs and LMS items are stored only in this browser — no account needed.", "다이어리, 로드맵, 저장한 연구실, LMS 항목은 이 브라우저에만 저장돼요 — 계정이 필요 없어요.")}{" "}
        <Link href="/privacy" className="underline">
          {L("Privacy", "개인정보")}
        </Link>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" color="navy" onClick={exportZip} disabled={!db?.entries.length}>
          <Download className="h-4 w-4" /> {L("Download my diary (.zip of .md)", "다이어리 다운로드 (.md zip)")}
        </Button>
        <input ref={fileRef} type="file" accept=".md,text/markdown" multiple className="hidden" onChange={(e) => e.target.files && importMd(e.target.files)} />
        <Button variant="secondary" color="navy" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> {L("Import .md files", ".md 파일 가져오기")}
        </Button>
        <Button
          variant="ghost"
          color="mail"
          onClick={() => {
            if (confirm(L("Delete ALL finD Lab data in this browser? This can't be undone.", "이 브라우저의 finD Lab 데이터를 모두 삭제할까요? 되돌릴 수 없어요."))) {
              deleteAllData();
              toast(L("All data deleted", "모든 데이터를 삭제했어요"));
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> {L("Delete all my data", "내 데이터 모두 삭제")}
        </Button>
      </div>
    </Card>
  );
}
