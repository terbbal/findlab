import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeJSON, withFallback } from "@/lib/ai";
import { parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { heuristicEnhance } from "@/lib/fallbacks";
import { prompts, schemas } from "@/lib/prompts";
import { CATEGORIES, type Category } from "@/lib/types";

const Body = z.object({
  note: z.string().trim().min(2).max(2000),
  lang: z.enum(["ko", "en"]).default("en"),
  context: z.string().max(500).optional(),
});

const Out = z.object({
  category: z.string(),
  skills: z.array(z.string()).max(8),
});

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const [body, err] = await parseBody(req, Body);
  if (err) return err;

  const result = await withFallback(
    async () => {
      const user = `Diary note:\n"""${body.note}"""${body.context ? `\n\nExtra context: ${body.context}` : ""}`;
      const raw = Out.parse(await callClaudeJSON(prompts.enhance(body.lang), user, schemas.enhance, { maxTokens: 1500 }));
      const category: Category = (CATEGORIES as string[]).includes(raw.category) ? (raw.category as Category) : "Other";
      return { category, skills: raw.skills.slice(0, 5) };
    },
    () => { const h = heuristicEnhance(body.note, body.lang); return { category: h.category, skills: h.skills }; },
    "enhance",
  );
  return NextResponse.json(result);
}
