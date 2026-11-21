import { NextResponse } from "next/server";
import { listLabs } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ labs: await listLabs() });
}
