import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { parseBody } from "@/lib/api";
import { fallbacks } from "@/lib/fallbacks";
import { prompts, schemas } from "@/lib/prompts";
import type { Lang } from "@/lib/types";

const Body = z.object({
  replyText: z.string().trim().min(5).max(8000),
  lang: z.enum(["ko", "en"]).default("en"),
  originalSubject: z.string().max(300).optional(),
});

const Out = z.object({
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  nextSteps: z.array(z.string()).max(6),
});

function heuristic(text: string, lang: Lang) {
  const t = text.toLowerCase();
  const neg = /unfortunately|not able|no position|full|cannot|어렵|죄송|자리가 없/.test(t);
  const pos = /happy to|glad|welcome|let's meet|available|interview|meeting|좋습니다|환영|면담|만나/.test(t);
  if (pos && !neg) return fallbacks().summarize[lang];
  const sentiment = neg ? ("negative" as const) : ("neutral" as const);
  const first = text.split(/(?<=[.!?。])\s+/).slice(0, 2).join(" ");
  return {
    summary: first.length > 220 ? first.slice(0, 220) + "…" : first,
    sentiment,
    nextSteps:
      lang === "ko"
        ? neg
          ? ["감사 인사로 정중히 답장하기", "다른 추천 연구실에 연락해 보기"]
          : ["요청받은 정보로 답장하기"]
        : neg
          ? ["Send a short thank-you reply", "Reach out to your next matched lab"]
          : ["Reply with the information they asked for"],
  };
}

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Body);
  if (err) return err;
  const result = await withFallback(
    async () => {
      const user = `${body.originalSubject ? `Original subject: ${body.originalSubject}\n\n` : ""}Reply email:\n"""${body.replyText}"""`;
      return Out.parse(await callClaudeJSON(prompts.summarize(body.lang), user, schemas.summarize, { maxTokens: 1500 }));
    },
    () => heuristic(body.replyText, body.lang),
    "summarize",
  );
  return NextResponse.json(result);
}
