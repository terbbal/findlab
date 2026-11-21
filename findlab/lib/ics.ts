"use client";

/** Download a one-day .ics calendar event. */
export function downloadICS(opts: { title: string; date: string; description?: string; filename?: string }) {
  const d = opts.date.replace(/-/g, "");
  const next = new Date(opts.date + "T00:00:00");
  next.setDate(next.getDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//finD Lab//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@findlab`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename ?? `${opts.title.replace(/[^\w가-힣]+/g, "-").slice(0, 40)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
