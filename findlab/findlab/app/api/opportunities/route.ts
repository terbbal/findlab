import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ opportunities: await listOpportunities() });
}
