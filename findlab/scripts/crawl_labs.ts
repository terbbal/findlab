/**
 * finD Lab crawler — turns DGIST lab homepages into Lab records.
 *   npm run crawl              merge into data/labs.json (keeps sample labs)
 *   npm run crawl -- --replace replace sample labs
 *   npm run crawl -- --dry     fetch + extract only (no AI, no writes) to check your URLs
 * Reads URLs from data/lab_urls.txt. Needs ANTHROPIC_API_KEY in .env.local.
 */
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { prompts, schemas } from "../lib/prompts";
import type { Lab } from "../lib/types";

const ROOT = process.cwd();
const USER_AGENT = "finD-Lab-hackathon-prototype";
const TIMEOUT_MS = 15_000;
const DELAY_MS = 1_000;
const SUBPAGE_RE = /people|members|member|publication|paper|join|recruit|구성원|논문|모집/i;
const MAX_SUBPAGES = 3;

// Load .env.local (tsx doesn't do this automatically)
for (const f of [".env.local", ".env"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function extract(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const links: { text: string; href: string }[] = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const text = $(a).text().replace(/\s+/g, " ").trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      links.push({ text, href: new URL(href, baseUrl).toString() });
    } catch {}
  });
  $("script, style, noscript, nav, footer, header, iframe, svg, form").remove();
  $("br, p, div, li, h1, h2, h3, h4, h5, h6, td, th, tr, section, article, span, a").each((_, el) => {
    $(el).append(" \n");
  });
  const text = $("body").text().replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return { text, links };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || `lab-${Date.now()}`;
}

async function toLab(client: Anthropic, model: string, url: string, pages: { url: string; text: string; links: string }[]): Promise<Lab> {
  const content = pages.map((p) => `=== PAGE: ${p.url} ===\n${p.text.slice(0, 12000)}\n--- LINKS ---\n${p.links}`).join("\n\n");
  const system = `${prompts.crawl()}\n\nReturn ONLY valid JSON matching this schema:\n${schemas.crawl}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client.messages.create({
      model,
      max_tokens: 4000,
      system,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: `Lab homepage: ${url}\n\n${content}${attempt ? "\n\nReply with ONLY the JSON object." : ""}` }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    try {
      const raw = JSON.parse(json);
      return {
        id: slug(raw.name ?? new URL(url).hostname),
        name: raw.name ?? new URL(url).hostname,
        professor: raw.professor ?? null,
        website: url,
        researchAreas: raw.researchAreas ?? [],
        plainSummary: raw.plainSummary ?? "",
        recentPapers: (raw.recentPapers ?? []).slice(0, 3).map((p: { title: string; url?: string | null; year?: number | null }) => ({
          title: p.title,
          url: p.url ?? null,
          ...(p.year ? { year: p.year } : {}),
        })),
        contacts: raw.contacts ?? [],
        recruiting: raw.recruiting ?? { status: "Unknown", note: null, types: [] },
        keywords: (raw.keywords ?? []).map((k: string) => k.toLowerCase()),
        style: raw.style,
        isSample: false,
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
    } catch {
      if (attempt) throw new Error("AI returned invalid JSON");
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const replace = process.argv.includes("--replace");
  const dry = process.argv.includes("--dry");
  const urls = fs
    .readFileSync(path.join(ROOT, "data/lab_urls.txt"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (!urls.length) {
    console.log("No URLs in data/lab_urls.txt — add DGIST lab homepages (one per line) and run again.");
    return;
  }
  if (!dry && !process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set (.env.local). The crawler needs it to structure lab pages.");
    process.exit(1);
  }
  const client = dry ? null : new Anthropic();
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
  const labsPath = path.join(ROOT, "data/labs.json");
  const existing: Lab[] = JSON.parse(fs.readFileSync(labsPath, "utf8"));
  const crawled: Lab[] = [];
  const failures: { url: string; error: string }[] = [];

  for (const [i, url] of urls.entries()) {
    console.log(`\n[${i + 1}/${urls.length}] ${url}`);
    try {
      const home = extract(await fetchHtml(url), url);
      const pages = [{ url, text: home.text, links: home.links.slice(0, 80).map((l) => `${l.text} -> ${l.href}`).join("\n") }];
      const host = new URL(url).host;
      const subs = Array.from(new Map(home.links.filter((l) => SUBPAGE_RE.test(l.text) && new URL(l.href).host === host).map((l) => [l.href, l])).values()).slice(0, MAX_SUBPAGES);
      for (const s of subs) {
        await sleep(DELAY_MS);
        try {
          const sp = extract(await fetchHtml(s.href), s.href);
          pages.push({ url: s.href, text: sp.text, links: sp.links.slice(0, 40).map((l) => `${l.text} -> ${l.href}`).join("\n") });
          console.log(`   + subpage: ${s.text || s.href}`);
        } catch (e) {
          console.log(`   ! subpage failed: ${s.href} (${(e as Error).message})`);
        }
      }
      if (dry) {
        console.log(`   (dry) ${pages.length} page(s), ${pages.reduce((n, p) => n + p.text.length, 0)} chars. Preview: ${home.text.slice(0, 160).replace(/\n/g, " ")}…`);
        continue;
      }
      const lab = await toLab(client!, model, url, pages);
      crawled.push(lab);
      console.log(`   ✓ ${lab.name} — ${lab.professor ?? "professor unknown"} — ${lab.recentPapers.length} papers, ${lab.contacts.length} contacts`);
    } catch (e) {
      failures.push({ url, error: (e as Error).message });
      console.log(`   ✗ failed: ${(e as Error).message}`);
    }
    await sleep(DELAY_MS);
  }

  if (dry) return console.log("\nDry run finished — nothing written.");
  const base = replace ? existing.filter((l) => !l.isSample) : existing;
  const byKey = new Map(base.map((l) => [l.website ?? l.id, l]));
  for (const lab of crawled) byKey.set(lab.website ?? lab.id, lab);
  const merged = Array.from(byKey.values());
  fs.writeFileSync(labsPath, JSON.stringify(merged, null, 2) + "\n");

  console.log(`\nDone. ${crawled.length} succeeded, ${failures.length} failed. data/labs.json now has ${merged.length} labs.`);
  failures.forEach((f) => console.log(`  ✗ ${f.url}: ${f.error}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
