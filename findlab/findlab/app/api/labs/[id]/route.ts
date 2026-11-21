import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getLab } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const lab = await getLab(params.id);
  if (!lab) return jsonError("Lab not found.", 404);
  return NextResponse.json({ lab });
}
