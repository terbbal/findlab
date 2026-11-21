import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api";
import { listEntries, newEntryId, saveEntry } from "@/lib/storage";
import { CATEGORIES, type DiaryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ entries: await listEntries() });
}

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rawNote: z.string().trim().min(1).max(2000),
  source: z.enum(["text", "voice", "course", "lms"]).default("text"),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  skills: z.array(z.string().max(40)).max(8).default([]),
  cvBullet: z.string().trim().min(1).max(500),
  highlight: z.boolean().optional(),
});

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Body);
  if (err) return err;
  const entry: DiaryEntry = {
    ...body,
    category: body.category as DiaryEntry["category"],
    id: await newEntryId(body.date, body.rawNote),
  };
  await saveEntry(entry);
  return NextResponse.json({ entry }, { status: 201 });
}
