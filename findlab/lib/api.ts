import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Parse + validate a JSON body. Returns [data, null] or [null, errorResponse]. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<[z.infer<S>, null] | [null, NextResponse]> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return [null, jsonError("Request body must be JSON.")];
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return [null, jsonError(`Invalid input: ${first?.path.join(".") || "body"} — ${first?.message ?? "invalid"}`)];
  }
  return [parsed.data, null];
}
