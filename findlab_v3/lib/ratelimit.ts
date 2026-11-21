import "server-only";
import { NextResponse } from "next/server";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? 30);
const hits = new Map<string, number[]>();

/** Simple per-client limit for AI routes (protects the API key). Returns a 429 response when exceeded. */
export function rateLimit(req: Request): NextResponse | null {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) {
    return NextResponse.json({ error: "Too many AI requests — please try again in a little while." }, { status: 429 });
  }
  list.push(now);
  hits.set(ip, list);
  return null;
}
