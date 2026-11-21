import { NextResponse } from "next/server";
import ical, { type CalendarResponse, type VEvent } from "node-ical";
import { jsonError } from "@/lib/api";
import type { LmsItem } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Parse an LMS calendar (Blackboard iCal feed URL or uploaded .ics text) into LmsItems.
 * Nothing is stored on the server: items (and the feed URL) stay in the student's browser.
 * We never ask for LMS passwords and never scrape logged-in pages.
 */
function toItems(data: CalendarResponse): LmsItem[] {
  const items: LmsItem[] = [];
  for (const ev of Object.values(data)) {
    if (!ev || (ev as { type?: string }).type !== "VEVENT") continue;
    const e = ev as VEvent;
    const summary = String(typeof e.summary === "object" ? (e.summary as { val?: string }).val ?? "" : e.summary ?? "").trim();
    const cats = (e as unknown as { categories?: string[] }).categories;
    // Blackboard summaries often look like "HW3 [Intro to Machine Learning]" or "Course: Title"
    const bracket = summary.match(/^(.*?)\s*[\[(]([^\])]+)[\])]\s*$/);
    const colon = summary.match(/^([^:]{2,60}):\s*(.+)$/);
    const course = cats?.[0] ?? (bracket ? bracket[2] : colon ? colon[1] : null);
    const title = bracket ? bracket[1] : colon && !cats?.[0] ? colon[2] : summary;
    const start = e.start ? new Date(e.start as Date).toISOString() : null;
    const end = e.end ? new Date(e.end as Date).toISOString() : null;
    const url = typeof e.url === "string" ? e.url : (e.url as { val?: string } | undefined)?.val ?? null;
    items.push({
      uid: e.uid ?? `${summary}-${start}`,
      title: title || "(untitled)",
      course: course?.trim() || null,
      start,
      due: end ?? start,
      description: typeof e.description === "string" ? e.description.slice(0, 500) : null,
      url,
    });
  }
  return items.sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
}

export async function POST(req: Request) {
  let body: { url?: string; ics?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Send { url } or { ics }.");
  }
  try {
    let text = body.ics ?? "";
    if (body.url) {
      let u: URL;
      try {
        u = new URL(body.url.trim().replace(/^webcal:/i, "https:"));
      } catch {
        return jsonError("That doesn't look like a link.");
      }
      if (u.protocol !== "https:") return jsonError("The calendar link must start with https:// (or webcal://).");
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(u, { signal: ctrl.signal, headers: { Accept: "text/calendar" } }).finally(() => clearTimeout(t));
      if (!res.ok) return jsonError(`The LMS returned HTTP ${res.status}. Is the link still valid?`);
      text = await res.text();
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("calendar") && !text.includes("BEGIN:VCALENDAR")) return jsonError("That link didn't return a calendar (text/calendar).");
    }
    if (!text.includes("BEGIN:VCALENDAR")) return jsonError("That file isn't an iCal (.ics) calendar.");
    if (text.length > 3_000_000) return jsonError("Calendar is too large.");
    const items = toItems(ical.sync.parseICS(text));
    return NextResponse.json({ items });
  } catch (e) {
    return jsonError(`Couldn't read the calendar: ${e instanceof Error ? e.message : "unknown error"}`);
  }
}
