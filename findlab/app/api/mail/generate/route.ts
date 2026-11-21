import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { jsonError, parseBody } from "@/lib/api";
import { fallbacks, fill } from "@/lib/fallbacks";
import { buildProfileText, scoreLab } from "@/lib/matching";
import { prompts, schemas } from "@/lib/prompts";
import { getLab, getProfile, listEntries } from "@/lib/storage";
import type { DiaryEntry, Lab, Lang, Profile } from "@/lib/types";

const PURPOSES = ["Undergrad internship", "UGRP advising", "Grad school inquiry", "Ask a question"] as const;

const Body = z.object({
  labId: z.string(),
  contactName: z.string().optional(),
  purpose: z.enum(PURPOSES).default("Undergrad internship"),
  lang: z.enum(["ko", "en"]).default("en"),
  tone: z.enum(["Formal", "Warm-formal"]).default("Formal"),
  action: z.enum(["new", "shorter", "formal", "followup"]).default("new"),
  current: z.object({ subject: z.string(), body: z.string() }).optional(),
  namecardUrl: z.string().max(300).optional(),
  question: z.string().max(500).optional(),
});

const Out = z.object({ subject: z.string().min(3), body: z.string().min(20) });

function relevantEntries(lab: Lab, entries: DiaryEntry[], n = 2): DiaryEntry[] {
  return entries
    .map((e) => ({ e, s: scoreLab(lab, `${e.rawNote} ${e.cvBullet} ${e.skills.join(" ")}`).score + (e.highlight ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.e);
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const strip = (s: string) => s.replace(/[.。]\s*$/, "");

/** DGIST Scholar contacts look like "강원석 (Prof. Won-Seok Kang)": split them into the Korean and English names. */
function splitName(name: string): { ko: string; en: string } {
  const m = name.match(/^(.+?)\s*\((?:Prof(?:essor)?\.?|Dr\.?)\s+(.+)\)$/);
  if (m) return { ko: m[1], en: m[2] };
  const bare = name.replace(/^(Prof(essor)?|Dr)\.?\s+/i, "");
  return { ko: bare, en: bare };
}

function koName(name: string, role: string) {
  const { ko } = splitName(name);
  return role === "Professor" ? `${ko} 교수님` : `${ko}님`;
}

function enName(name: string, role: string) {
  const { en } = splitName(name);
  if (role === "Professor") return `Professor ${en}`;
  return /\(Dr\.?\s/.test(name) ? `Dr. ${en}` : en;
}

function templateMail(opts: {
  lab: Lab; profile: Profile; entries: DiaryEntry[]; lang: Lang; contactName: string; contactRole: string;
  namecardUrl: string; short: boolean; purpose: string;
}) {
  const { lab, profile, lang } = opts;
  const t = fallbacks().mail[lang];
  const [e1, e2] = relevantEntries(lab, opts.entries);
  const paper = lab.recentPapers[0]?.title;
  const b = (e?: DiaryEntry) => (e ? strip(e.cvBulletEdited || e.cvBullet) : "");
  const pre = fallbacks().mailLinks?.[lab.id]?.[lang];
  const vars: Record<string, string> = {
    studentName: lang === "ko" && profile.nameKo ? profile.nameKo : profile.name,
    studentYear: profile.year,
    studentYearKo: profile.year.includes("2nd") ? "2학년" : profile.year,
    studentEmail: profile.email,
    interests: lang === "ko" && profile.interestsKo?.length ? profile.interestsKo.join(", ") : profile.interests.join(", "),
    contactName: lang === "ko" ? koName(opts.contactName, opts.contactRole) : enName(opts.contactName, opts.contactRole),
    area: lang === "ko" ? lab.researchAreas.slice(0, 2).join("·") : lab.researchAreas.slice(0, 2).join(" and ").toLowerCase(),
    paperClause: paper ? (lang === "ko" ? `(특히 "${paper}")` : ` (especially "${paper}")`) : "",
    link1: pre ? pre[0] : e1 ? (lang === "ko" ? `첫째, 저는 "${b(e1)}" 경험이 있습니다.` : `First, I ${lowerFirst(b(e1))}.`) : "",
    link2: opts.short ? "" : pre ? pre[1] : e2 ? (lang === "ko" ? `둘째, "${b(e2)}" 활동을 통해 관련 역량을 키웠습니다.` : `I also ${lowerFirst(b(e2))}.`) : "",
    namecardUrl: opts.namecardUrl,
  };
  let subject = fill(t.subject, vars);
  const nm = vars.studentName;
  if (opts.purpose === "UGRP advising") subject = lang === "ko" ? `[UGRP 지도 문의] DGIST ${nm} 드림` : `UGRP advising inquiry — ${profile.name}, DGIST`;
  if (opts.purpose === "Grad school inquiry") subject = lang === "ko" ? `[대학원 진학 문의] DGIST ${nm} 드림` : `Graduate school inquiry — ${profile.name}, DGIST`;
  if (opts.purpose === "Ask a question") subject = lang === "ko" ? `[연구 관련 질문] DGIST ${nm} 드림` : `A question about your research — ${profile.name}, DGIST`;
  return { subject, body: fill(t.body, vars).replace(/ \n/g, "\n").replace(/\n{3,}/g, "\n\n") };
}

function templateFollowUp(lang: Lang, current: { subject: string; body: string }, contact: string, role: string, profile: Profile) {
  const subject = current.subject.startsWith("Re:") ? current.subject : `Re: ${current.subject}`;
  const body =
    lang === "ko"
      ? `${koName(contact, role)}께,\n\n안녕하십니까. 지난주 연구실 참여 관련하여 메일을 드렸던 DGIST ${profile.name}입니다. 바쁘신 줄 알기에 조심스럽지만, 혹시 메일을 확인하실 기회가 있으셨을지 여쭙고자 다시 연락드립니다.\n\n편하신 때에 짧게라도 답장 주시면 정말 감사하겠습니다.\n\n${profile.name} 올림\n${profile.email}`
      : `Dear ${role === "Professor" ? `Professor ${contact.replace(/^Prof(essor)?\.?\s+/i, "")}` : contact},\n\nI hope you are doing well. I'm following up on my email from last week about the possibility of joining your lab. I understand you are very busy, so please don't worry if now isn't a good time.\n\nIf you have a moment, even a short reply would mean a lot to me.\n\nThank you again,\n${profile.name}\n${profile.email}`;
  return { subject, body };
}

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Body);
  if (err) return err;
  const lab = await getLab(body.labId);
  if (!lab) return jsonError("Lab not found.", 404);
  const [profile, entries] = await Promise.all([getProfile(), listEntries()]);
  const contact = lab.contacts.find((c) => c.name === body.contactName) ?? lab.contacts.find((c) => c.role === "Professor") ?? lab.contacts[0];
  const contactName = contact?.name ?? lab.professor ?? "Professor";
  const contactRole = contact?.role ?? "Professor";
  const namecardUrl = body.namecardUrl ?? "/cv/namecard/minji";

  if ((body.action === "shorter" || body.action === "formal" || body.action === "followup") && !body.current) {
    return jsonError("Missing current draft.");
  }

  const result = await withFallback(
    async () => {
      if (body.action === "followup") {
        const user = `Original email (no reply after 7 days):\nSubject: ${body.current!.subject}\n\n${body.current!.body}\n\nRecipient: ${contactName} (${contactRole})\nStudent: ${profile.name}, ${profile.email}`;
        return Out.parse(await callClaudeJSON(prompts.followUp(body.lang), user, schemas.mail, { maxTokens: 2000 }));
      }
      if (body.action === "shorter" || body.action === "formal") {
        const instr =
          body.action === "shorter"
            ? "Rewrite this email to be about 30% shorter while keeping the self-intro, the two concrete links, the ask and the closing. Do not add new facts."
            : "Rewrite this email to be more formal and respectful (stronger honorifics in Korean), keeping the same facts and structure. Do not add new facts.";
        const user = `${instr}\n\nSubject: ${body.current!.subject}\n\n${body.current!.body}`;
        return Out.parse(await callClaudeJSON(prompts.mail(body.lang), user, schemas.mail, { maxTokens: 2500 }));
      }
      const rel = relevantEntries(lab, entries, 4);
      const user = `PURPOSE: ${body.purpose}${body.question ? ` — question: ${body.question}` : ""}
TONE: ${body.tone}
RECIPIENT: ${contactName} (${contactRole})
LAB RECORD (JSON): ${JSON.stringify({ name: lab.name, professor: lab.professor, researchAreas: lab.researchAreas, plainSummary: lab.plainSummary, recentPapers: lab.recentPapers.map((p) => p.title), recruiting: lab.recruiting })}

STUDENT
${buildProfileText(profile, entries).split("Entries:")[0]}Email: ${profile.email}
Namecard link: ${namecardUrl}
Most relevant experiences:
${rel.map((e) => `- ${e.cvBulletEdited || e.cvBullet}`).join("\n")}`;
      return Out.parse(await callClaudeJSON(prompts.mail(body.lang), user, schemas.mail, { maxTokens: 3000 }));
    },
    () =>
      body.action === "followup"
        ? templateFollowUp(body.lang, body.current!, contactName, contactRole, profile)
        : templateMail({
            lab, profile, entries, lang: body.lang, contactName, contactRole, namecardUrl,
            short: body.action === "shorter", purpose: body.purpose,
          }),
    "mail",
  );
  return NextResponse.json(result);
}
