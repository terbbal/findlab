"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Camera, Check, HandHelping, Lock, Mail, Pencil, Phone, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card, Chip, SampleBadge } from "@/components/ui";
import { InlineConfirm } from "@/components/shared/InlineConfirm";
import { api, todayISO } from "@/lib/client";
import { HELP_TAGS, deleteContact, findHelpers, markContacted, saveContact, useContacts, type ContactCard } from "@/lib/contacts";
import type { LabIndexItem } from "@/lib/types";

type Draft = Omit<ContactCard, "id" | "createdAt"> & { id?: string };
const EMPTY: Draft = { name: "", org: "", role: "", email: "", phone: "", metOn: "", metWhere: "", helpTags: [], memo: "" };

/** Shrink a photo to a small JPEG data URL so a few dozen cards fit in browser storage. */
function shrinkImage(file: File, max = 640, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Not an image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const labLabel = (l: LabIndexItem, lang: "ko" | "en") => {
  const who = (lang === "ko" ? l.nameKo || l.nameEn : l.nameEn || l.nameKo) ?? "—";
  return l.labName ? `${who} · ${l.labName}` : who;
};

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ContactForm({ initial, labs, onDone }: { initial: Draft; labs: LabIndexItem[]; onDone: () => void }) {
  const { lang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const [d, setD] = useState<Draft>(initial);
  const [customTag, setCustomTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  // Same name as a DGIST researcher → offer to link their lab (research topics help "find who can help").
  const nameMatches = useMemo(() => {
    const n = d.name.replace(/\s|\(.*\)/g, "").toLowerCase();
    if (n.length < 2) return [];
    return labs.filter((l) => [l.nameKo, l.nameEn].some((x) => x && x.replace(/[\s,.-]/g, "").toLowerCase() === n.replace(/[,.-]/g, ""))).slice(0, 3);
  }, [d.name, labs]);
  const linked = labs.find((l) => l.id === d.labId);

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    try {
      set({ photo: await shrinkImage(f) });
    } catch {
      toast(L("Couldn't read that image", "사진을 읽지 못했어요"), "error");
    }
  };

  const submit = () => {
    if (!d.name.trim()) return;
    try {
      saveContact({ ...d, name: d.name.trim(), helpTags: d.helpTags, isSample: d.isSample && d.id ? d.isSample : undefined });
      toast(L("Card saved", "명함을 저장했어요"));
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : L("Couldn't save", "저장하지 못했어요"), "error");
    }
  };

  const toggleTag = (t: string) => set({ helpTags: d.helpTags.includes(t) ? d.helpTags.filter((x) => x !== t) : [...d.helpTags, t] });

  return (
    <Card className="space-y-4 border-2 border-cv/30">
      <div className="flex items-center gap-2">
        <h3 className="font-bold">{d.id ? L("Edit card", "명함 수정") : L("Add a card you received", "받은 명함 추가")}</h3>
        <button onClick={onDone} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label={L("Close", "닫기")}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid h-32 w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 hover:border-cv sm:w-52"
          >
            {d.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.photo} alt={L("Card photo", "명함 사진")} className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1">
                <Camera className="h-6 w-6" /> {L("Card photo (optional)", "명함 사진 (선택)")}
              </span>
            )}
          </button>
          {d.photo && (
            <button type="button" onClick={() => set({ photo: undefined })} className="mt-1 text-xs text-slate-500 hover:underline">
              {L("Remove photo", "사진 빼기")}
            </button>
          )}
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label={L("Name *", "이름 *")}>
            <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder={L("e.g. Jiwoo Park", "예: 박지우")} autoFocus />
          </Field>
          <Field label={L("Role", "직책")}>
            <input className="input" value={d.role} onChange={(e) => set({ role: e.target.value })} placeholder={L("e.g. PhD student, professor", "예: 박사과정, 교수, 개발자")} />
          </Field>
          <Field label={L("Affiliation", "소속")} className="sm:col-span-2">
            <input className="input" value={d.org} onChange={(e) => set({ org: e.target.value })} placeholder={L("Lab, department or company", "연구실, 학과, 회사")} />
          </Field>
          <Field label={L("Email", "이메일")}>
            <input className="input" type="email" value={d.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label={L("Phone", "전화")}>
            <input className="input" value={d.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
      </div>

      {nameMatches.length > 0 && !linked && (
        <div className="rounded-xl bg-lab-tint p-3 text-sm">
          <span className="font-semibold text-lab">{L("A DGIST researcher has this name — link their lab?", "같은 이름의 DGIST 연구자가 있어요. 연구실과 연결할까요?")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {nameMatches.map((l) => (
              <Chip key={l.id} color="lab" onClick={() => set({ labId: l.id, org: d.org || l.department || "" })}>
                {labLabel(l, lang)} · {l.department}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {linked && (
        <p className="text-sm text-lab">
          🔗 {labLabel(linked, lang)}{" "}
          <button type="button" onClick={() => set({ labId: undefined })} className="text-xs text-slate-500 hover:underline">
            {L("unlink", "연결 해제")}
          </button>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={L("Met on", "만난 날")}>
          <input className="input" type="date" max={todayISO()} value={d.metOn ?? ""} onChange={(e) => set({ metOn: e.target.value })} />
        </Field>
        <Field label={L("Where / how", "어디서 · 어떻게")}>
          <input className="input" value={d.metWhere ?? ""} onChange={(e) => set({ metWhere: e.target.value })} placeholder={L("e.g. hackathon mentor", "예: 해커톤 멘토, UGRP 설명회")} />
        </Field>
      </div>

      <Field label={L("Can help me with", "도움받을 수 있는 분야")}>
        <div className="flex flex-wrap gap-1.5">
          {HELP_TAGS.map((h) => (
            <Chip key={h.tag} color="cv" active={d.helpTags.includes(h.tag)} onClick={() => toggleTag(h.tag)}>
              {lang === "ko" ? h.tag : h.en}
            </Chip>
          ))}
          {d.helpTags
            .filter((t) => !HELP_TAGS.some((h) => h.tag === t))
            .map((t) => (
              <Chip key={t} color="cv" active onClick={() => toggleTag(t)}>
                {t} ✕
              </Chip>
            ))}
          <span className="inline-flex items-center gap-1">
            <input
              className="input h-7 w-28 px-2 text-xs"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customTag.trim()) {
                  e.preventDefault();
                  if (!d.helpTags.includes(customTag.trim())) set({ helpTags: [...d.helpTags, customTag.trim()] });
                  setCustomTag("");
                }
              }}
              placeholder={L("+ own tag", "+ 직접 입력")}
            />
          </span>
        </div>
      </Field>

      <Field label={L("Memo — what they know, what you talked about", "메모 — 잘 아는 것, 나눈 이야기")}>
        <textarea
          className="input text-sm"
          rows={3}
          value={d.memo}
          onChange={(e) => set({ memo: e.target.value })}
          placeholder={L("e.g. Knows PCR and cell culture well; offered to review my contact email.", "예: PCR·세포 배양 잘 아심. 연구실 컨택 메일 봐 주신다고 함.")}
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" color="navy" onClick={onDone}>
          {L("Cancel", "취소")}
        </Button>
        <Button color="cv" onClick={submit} disabled={!d.name.trim()}>
          <Check className="h-4 w-4" /> {L("Save card", "명함 저장")}
        </Button>
      </div>
    </Card>
  );
}

function ContactItem({ c, lab, reasons, onEdit }: { c: ContactCard; lab?: LabIndexItem; reasons?: string[]; onEdit: () => void }) {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  return (
    <article className="flex gap-3 rounded-2xl bg-white p-4 shadow-soft">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {c.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-300">
            <UserRound className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold">{c.name}</span>
          {c.role && <span className="text-sm text-slate-500">{c.role}</span>}
          {c.isSample && <SampleBadge />}
          <div className="ml-auto flex items-center gap-0.5">
            <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy" aria-label={L("Edit", "수정")} title={L("Edit", "수정")}>
              <Pencil className="h-4 w-4" />
            </button>
            <InlineConfirm
              question={L("Delete this card?", "이 명함을 삭제할까요?")}
              onConfirm={() => deleteContact(c.id)}
              triggerClassName="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              triggerLabel={L("Delete", "삭제")}
            >
              <Trash2 className="h-4 w-4" />
            </InlineConfirm>
          </div>
        </div>
        {c.org && <div className="truncate text-sm text-slate-600">{c.org}</div>}
        {lab && (
          <Link href={`/labs/${lab.id}`} className="block truncate text-xs font-semibold text-lab hover:underline">
            🔗 {labLabel(lab, lang)}
          </Link>
        )}
        {(c.metOn || c.metWhere) && (
          <div className="text-xs text-slate-400">
            {L("Met", "만남")}: {[c.metOn, c.metWhere].filter(Boolean).join(" · ")}
          </div>
        )}
        {c.helpTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {c.helpTags.map((t) => (
              <Chip key={t} color="cv">
                {lang === "ko" ? t : HELP_TAGS.find((h) => h.tag === t)?.en ?? t}
              </Chip>
            ))}
          </div>
        )}
        {c.memo && <p className="mt-1.5 text-sm text-slate-600">{c.memo}</p>}
        {reasons && reasons.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 rounded-lg bg-cv-tint/60 p-2 text-xs text-cv">
            {reasons.map((r) => (
              <li key={r}>✓ {r}</li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {c.email && (
            <a href={`mailto:${c.email}`} onClick={() => markContacted(c.id)} className="inline-flex items-center gap-1 font-semibold text-navy hover:underline">
              <Mail className="h-3.5 w-3.5" /> {c.email}
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} onClick={() => markContacted(c.id)} className="inline-flex items-center gap-1 font-semibold text-navy hover:underline">
              <Phone className="h-3.5 w-3.5" /> {c.phone}
            </a>
          )}
          <button onClick={() => markContacted(c.id)} className="text-slate-500 hover:underline">
            {c.lastContactedOn ? L(`Last contacted ${c.lastContactedOn} · update`, `마지막 연락 ${c.lastContactedOn} · 갱신`) : L("Mark as contacted", "연락함으로 표시")}
          </button>
        </div>
      </div>
    </article>
  );
}

/** "Received cards": people the student met, and who to ask when stuck. My own namecard stays in its own tab. */
export function ContactsTab() {
  const { lang } = useLang();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const contacts = useContacts();
  const [labs, setLabs] = useState<LabIndexItem[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [ask, setAsk] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    api<{ labs: LabIndexItem[] }>("/api/labs").then((d) => setLabs(d.labs)).catch(() => setLabs([]));
  }, []);
  const labById = useMemo(() => new Map(labs.map((l) => [l.id, l])), [labs]);

  const helpers = useMemo(() => (ask.trim() && contacts ? findHelpers(ask, contacts, labs, lang) : null), [ask, contacts, labs, lang]);
  const shown = useMemo(() => (contacts ?? []).filter((c) => !tagFilter || c.helpTags.includes(tagFilter)), [contacts, tagFilter]);
  const usedTags = useMemo(() => Array.from(new Set((contacts ?? []).flatMap((c) => c.helpTags))), [contacts]);

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <HandHelping className="h-5 w-5 text-cv" />
          <h2 className="text-lg font-bold">{L("Who can help me?", "누구에게 도움을 받을까?")}</h2>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder={L("Describe what you're stuck on — e.g. my PCR keeps failing", "고민을 적어 보세요 — 예: PCR 실험이 계속 실패해요, 연구실 컨택 메일이 걱정돼요")}
          />
        </div>
        {helpers &&
          (helpers.length ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{L(`${helpers.length} people might help, best first:`, `도움이 될 만한 사람 ${helpers.length}명 (잘 맞는 순):`)}</p>
              {helpers.slice(0, 5).map((m) => (
                <ContactItem key={m.contact.id} c={m.contact} lab={m.contact.labId ? labById.get(m.contact.labId) : undefined} reasons={m.reasons} onEdit={() => setEditing({ ...m.contact })} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {L(
                "No one in your cards matches yet. Add what people can help with when you save a card — or browse labs for someone new.",
                "아직 맞는 사람이 없어요. 명함을 저장할 때 도움받을 분야를 골라 두거나, 연구실 목록에서 새로운 분을 찾아보세요.",
              )}{" "}
              <Link href="/labs" className="font-semibold text-lab hover:underline">
                {L("Browse labs →", "연구실 보기 →")}
              </Link>
            </p>
          ))}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">
          {L("Received cards", "받은 명함")} <span className="text-sm font-normal text-slate-400">{contacts?.length ?? 0}</span>
        </h2>
        <Button color="cv" className="ml-auto" onClick={() => setEditing({ ...EMPTY })} disabled={Boolean(editing && !editing.id)}>
          <Plus className="h-4 w-4" /> {L("Add a card", "명함 추가")}
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {L(
          "These are other people's details: they stay in this browser only — not in cloud sync, not in any share link. Use them only for what the person agreed to.",
          "다른 사람의 개인정보예요. 이 브라우저에만 저장되고, 클라우드 동기화나 공유 링크에는 들어가지 않아요. 명함 주인이 동의한 범위에서만 사용해 주세요.",
        )}
      </p>

      {editing && <ContactForm key={editing.id ?? "new"} initial={editing} labs={labs} onDone={() => setEditing(null)} />}

      {usedTags.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Chip color="cv" active={!tagFilter} onClick={() => setTagFilter(null)}>
            {L("All", "전체")}
          </Chip>
          {usedTags.map((t) => (
            <Chip key={t} color="cv" active={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)}>
              {lang === "ko" ? t : HELP_TAGS.find((h) => h.tag === t)?.en ?? t}
            </Chip>
          ))}
        </div>
      )}

      {contacts && contacts.length === 0 && !editing && (
        <Card className="text-center text-sm text-slate-500">
          {L(
            "No cards yet. When you meet a professor, senior or mentor, save their card here with what they can help with.",
            "아직 받은 명함이 없어요. 교수님, 선배, 멘토를 만나면 명함과 함께 어떤 도움을 받을 수 있는지 저장해 두세요.",
          )}
        </Card>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((c) => (
          <ContactItem key={c.id} c={c} lab={c.labId ? labById.get(c.labId) : undefined} onEdit={() => setEditing({ ...c })} />
        ))}
      </div>
    </div>
  );
}
