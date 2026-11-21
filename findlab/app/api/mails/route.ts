import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody } from "@/lib/api";
import { listMails, saveMails } from "@/lib/storage";
import type { MailRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ mails: await listMails() });
}

const Create = z.object({
  labId: z.string(),
  contactName: z.string(),
  contactEmail: z.string().nullable(),
  subject: z.string().min(1),
  body: z.string().min(1),
  language: z.enum(["ko", "en"]),
  status: z.enum(["draft", "sent"]).default("sent"),
});

const DAY = 86400000;

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, Create);
  if (err) return err;
  const now = new Date();
  const record: MailRecord = {
    id: `mail-${now.getTime()}`,
    ...body,
    ...(body.status === "sent" ? { sentAt: now.toISOString(), followUpDueAt: new Date(now.getTime() + 7 * DAY).toISOString() } : {}),
  };
  const mails = await listMails();
  await saveMails([record, ...mails]);
  return NextResponse.json({ mail: record }, { status: 201 });
}

const Patch = z.object({
  id: z.string(),
  status: z.enum(["draft", "sent", "replied"]).optional(),
  replyText: z.string().max(8000).optional(),
  replySummary: z
    .object({ summary: z.string(), sentiment: z.enum(["positive", "neutral", "negative"]), nextSteps: z.array(z.string()) })
    .optional(),
  sentAt: z.string().optional(),
  followUpDueAt: z.string().optional(),
});

export async function PATCH(req: Request) {
  const [body, err] = await parseBody(req, Patch);
  if (err) return err;
  const mails = await listMails();
  const i = mails.findIndex((m) => m.id === body.id);
  if (i < 0) return jsonError("Mail not found.", 404);
  mails[i] = { ...mails[i], ...body };
  await saveMails(mails);
  return NextResponse.json({ mail: mails[i] });
}
