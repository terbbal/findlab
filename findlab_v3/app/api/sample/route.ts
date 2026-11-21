import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { readSample } from "@/lib/storage";

const ALLOWED = new Set(["courses", "lms"]);

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!ALLOWED.has(name)) return jsonError("Unknown sample.", 404);
  return NextResponse.json({ items: await readSample(name, []) });
}
