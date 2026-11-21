import { NextResponse } from "next/server";
import { labIndex, labsMeta } from "@/lib/labs";

export const dynamic = "force-static";

/** Slim index of every DGIST lab for the client-side directory (Fuse.js search). */
export async function GET() {
  return NextResponse.json({ labs: labIndex(), meta: labsMeta });
}
