import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody } from "@/lib/api";
import { deleteEntry, getEntry, saveEntry } from "@/lib/storage";
import { CATEGORIES, type DiaryEntry } from "@/lib/types";

const Patch = z.object({
  rawNote: z.string().trim().min(1).max(2000).optional(),
  cvBulletEdited: z.string().trim().max(500).optional(),
  category: z.enum(CATEGORIES as [string, ...string[]]).optional(),
  skills: z.array(z.string().max(40)).max(8).optional(),
  highlight: z.boolean().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const existing = await getEntry(params.id);
  if (!existing) return jsonError("Entry not found.", 404);
  const [body, err] = await parseBody(req, Patch);
  if (err) return err;
  const updated: DiaryEntry = { ...existing, ...(body as Partial<DiaryEntry>) };
  if (body.cvBulletEdited !== undefined && (body.cvBulletEdited === "" || body.cvBulletEdited === existing.cvBullet)) {
    delete updated.cvBulletEdited;
  }
  await saveEntry(updated);
  return NextResponse.json({ entry: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await deleteEntry(params.id);
  return NextResponse.json({ ok: true });
}
