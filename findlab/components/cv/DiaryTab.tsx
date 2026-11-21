"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLang } from "@/components/Providers";
import { Card, Chip, DemoBadge, Skeleton } from "@/components/ui";
import { CATEGORIES } from "@/lib/types";
import { bulletOf, useEntries } from "@/lib/client";
import { DiaryComposer } from "./DiaryComposer";
import { EntryCard } from "./EntryCard";

export function DiaryTab() {
  const { t, lang } = useLang();
  const { entries } = useEntries();
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const [newId, setNewId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (entries ?? []).filter(
      (e) =>
        (cat === "All" || e.category === cat) &&
        (!query || [e.rawNote, bulletOf(e), ...e.skills].join(" ").toLowerCase().includes(query)),
    );
  }, [entries, cat, q]);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("home.prompt")}</h2>
            <DemoBadge show={demo} />
          </div>
          <p className="mb-3 text-sm text-slate-500">{t("home.promptHint")}</p>
          <DiaryComposer
            onSaved={(e, d) => {
              setNewId(e.id);
              setDemo(d);
              setCat("All");
              setQ("");
            }}
          />
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="text-sm text-slate-500">
            {filtered.length} {lang === "ko" ? "개 기록" : "entries"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...CATEGORIES].map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {c === "All" ? t("common.all") : c}
            </Chip>
          ))}
        </div>

        {entries === null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="py-12 text-center text-slate-500">{t("diary.empty")}</Card>
        ) : (
          filtered.map((e) => <EntryCard key={e.id} entry={e} isNew={e.id === newId} />)
        )}
      </div>
    </div>
  );
}
