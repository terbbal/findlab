import { NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

/** Extract text from an uploaded PDF CV. Processed in memory only — never written to disk. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Please upload a PDF file.");
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) return jsonError("Please upload a PDF file.");
  if (file.size > 8 * 1024 * 1024) return jsonError("PDF is too large (max 8 MB).");
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { text, numpages } = await pdfParse(buf);
    const clean = text.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, 12000);
    if (clean.length < 20) return jsonError("Couldn't read text from this PDF (is it a scanned image?).");
    return NextResponse.json({ text: clean, pages: numpages });
  } catch {
    return jsonError("Couldn't read this PDF.");
  }
}
