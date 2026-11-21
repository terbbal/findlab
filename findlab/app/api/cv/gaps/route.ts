import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { prompts, schemas } from "@/lib/prompts";
import { listOpportunities } from "@/lib/storage";
import { CATEGORIES, type DiaryEntry, type Lang, type Opportunity } from "@/lib/types";

const Body = z.object({
  lang: z.enum(["ko", "en"]).default("en"),
  entries: z.array(z.object({ date: z.string(), category: z.string(), skills: z.array(z.string()) }).passthrough()).max(500).default([]),
});

const Nudge = z.object({
  title: z.string(),
  message: z.string(),
  suggestedAction: z.string(),
  relatedOpportunityId: z.string().nullable().optional(),
});
const Out = z.object({ nudges: z.array(Nudge).max(3) });

function today() {
  return new Date().toISOString().slice(0, 10);
}
const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);

function summarize(entries: DiaryEntry[], ops: Opportunity[]) {
  const t = today();
  const byCat = Object.fromEntries(
    CATEGORIES.map((c) => {
      const es = entries.filter((e) => e.category === c);
      const last = es.map((e) => e.date).sort().pop() ?? null;
      return [c, { count: es.length, lastDate: last, daysSinceLast: last ? daysBetween(last, t) : null }];
    }),
  );
  const skills = Array.from(new Set(entries.flatMap((e) => e.skills)));
  const upcoming = ops
    .map((o) => ({ id: o.id, name: o.name, description: o.description, daysLeft: daysBetween(t, o.deadline) }))
    .filter((o) => o.daysLeft >= 0);
  return { today: t, totalEntries: entries.length, firstEntry: entries.map((e) => e.date).sort()[0] ?? null, byCategory: byCat, skills, upcoming };
}

type Summary = ReturnType<typeof summarize>;

function heuristic(s: Summary, lang: Lang) {
  const ko = lang === "ko";
  const nudges: z.infer<typeof Nudge>[] = [];
  const ugrp = s.upcoming.find((o) => o.id === "ugrp");
  const intern = s.upcoming.find((o) => /intern/i.test(o.id));
  if (s.byCategory.Research.count === 0) {
    const op = ugrp ?? intern;
    nudges.push({
      title: ko ? "아직 연구 경험이 없어요" : "No research experience yet",
      message: op
        ? ko
          ? `프로젝트는 많지만 연구실 경험이 아직 없어요. ${op.name} 마감까지 ${op.daysLeft}일 남았어요.`
          : `Great projects so far, but no lab research yet. ${op.name} deadline is in ${op.daysLeft} days.`
        : ko
          ? "학부 연구 인턴으로 첫 연구 경험을 쌓아 보세요."
          : "Consider an undergraduate research internship for your first lab experience.",
      suggestedAction: op ? (ko ? `${op.name} 지원하기` : `Apply for ${op.name}`) : ko ? "연구실 찾기" : "Find a lab",
      relatedOpportunityId: op?.id ?? null,
    });
  }
  if (intern && nudges.length < 3 && s.byCategory.Research.count === 0)
    nudges.push({
      title: ko ? "겨울 인턴 모집 중" : "Winter internships are open",
      message: ko
        ? `로봇·헬스케어·ML 경험이 쌓였어요. ${intern.name} 마감까지 ${intern.daysLeft}일 남았어요.`
        : `Your robotics, healthcare and ML entries are a strong start. ${intern.name} closes in ${intern.daysLeft} days.`,
      suggestedAction: ko ? "맞는 연구실 찾기" : "Find matching labs",
      relatedOpportunityId: intern.id,
    });
  const stale = (["Project", "Club", "Volunteer", "Award"] as const)
    .map((c) => ({ c, ...s.byCategory[c] }))
    .filter((x) => x.count > 0 && (x.daysSinceLast ?? 0) > 120)
    .sort((a, b) => (b.daysSinceLast ?? 0) - (a.daysSinceLast ?? 0))[0];
  if (stale)
    nudges.push({
      title: ko ? `${stale.c} 기록이 뜸해요` : `Quiet on ${stale.c} lately`,
      message: ko
        ? `마지막 ${stale.c} 기록이 ${Math.round((stale.daysSinceLast ?? 0) / 30)}개월 전이에요. 최근 활동을 기록해 보세요.`
        : `Your last ${stale.c} entry was ${Math.round((stale.daysSinceLast ?? 0) / 30)} months ago. Anything new to log?`,
      suggestedAction: ko ? "오늘 기록하기" : "Log an entry",
      relatedOpportunityId: null,
    });
  if (!nudges.length)
    nudges.push({
      title: ko ? "균형 잡힌 기록이에요 👏" : "Nicely balanced record 👏",
      message: ko ? "연구, 프로젝트, 활동이 고르게 쌓이고 있어요. 이대로 꾸준히!" : "Research, projects and activities are all growing. Keep it up!",
      suggestedAction: ko ? "CV 내보내기" : "Export CV",
      relatedOpportunityId: null,
    });
  return { nudges: nudges.slice(0, 3) };
}

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const [body, err] = await parseBody(req, Body);
  if (err) return err;
  const entries = body.entries as unknown as DiaryEntry[];
  const ops = await listOpportunities();
  const s = summarize(entries, ops);
  const validOps = new Set(ops.map((o) => o.id));
  const result = await withFallback(
    async () => {
      const out = Out.parse(await callClaudeJSON(prompts.gaps(body.lang), `ACTIVITY SUMMARY (JSON):\n${JSON.stringify(s, null, 1)}`, schemas.gaps, { maxTokens: 1500 }));
      return {
        nudges: out.nudges.map((n) => ({ ...n, relatedOpportunityId: n.relatedOpportunityId && validOps.has(n.relatedOpportunityId) ? n.relatedOpportunityId : null })),
      };
    },
    () => heuristic(s, body.lang),
    "gaps",
  );
  return NextResponse.json(result);
}
