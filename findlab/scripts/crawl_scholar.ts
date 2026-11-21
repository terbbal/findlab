/**
 * finD Lab v3 — DGIST Scholar crawler (https://scholar.dgist.ac.kr, DSpace 6.3)
 *
 *   npm run crawl            crawl everything (uses scripts/cache/, so re-runs are fast)
 *   npm run crawl -- --limit 5   only the first 5 researchers (testing)
 *
 * Respects robots.txt: only /browse-researcher, /researcher/{uuid} and /handle/... pages are fetched
 * (/simple-search is disallowed, so papers come from the profile page's latest-papers list).
 * Output: data/labs.json, data/labs_meta.json, scripts/crawl_errors.json
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";

const BASE = "https://scholar.dgist.ac.kr";
const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts/cache");
const UA = `finD-Lab/0.3 (DGIST student project; contact: ${process.env.TEAM_EMAIL || "findlab-team@dgist.ac.kr"})`;
const DELAY_MS = 800;
const TIMEOUT_MS = 15_000;
const PAPERS_PER_LAB = 3;

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

fs.mkdirSync(CACHE, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

/** Polite, cached GET: 1 request at a time, ~800 ms apart, 15 s timeout, 2 retries with backoff. */
async function get(url: string): Promise<string> {
  const file = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex") + ".html");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = lastRequest + DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      fs.writeFileSync(file, html);
      return html;
    } catch (e) {
      lastErr = e;
      await sleep(1500 * (attempt + 1));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const clean = (s: string | undefined | null) => (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const hasHangul = (s: string) => /[가-힣]/.test(s);
const abs = (href: string) => (href.startsWith("http") ? href : BASE + href.replace(/;jsessionid=[^?]*/, ""));

type Stub = { id: string; name: string; nameAlt: string; department: string | null; interests: string[] };

function parseList(html: string): { stubs: Stub[]; total: number } {
  const $ = cheerio.load(html);
  const total = Number((clean($(".result_t_arrow").text()).match(/of\s+(\d+)/) ?? [])[1] ?? 0);
  const stubs: Stub[] = [];
  $(".round_box > a[href^='/researcher/']").each((_, a) => {
    const id = ($(a).attr("href") ?? "").split("/researcher/")[1]?.split(/[?;#]/)[0];
    if (!id) return;
    const p = $(a).find("dt p").first();
    const nameAlt = clean(p.find("span").text());
    const name = clean(p.clone().children().remove().end().text());
    const department = clean($(a).find("dd").first().text()) || null;
    const interests = clean($(a).find(".l_research_int p").text())
      .split(";")
      .map((x) => clean(x))
      .filter(Boolean);
    stubs.push({ id, name, nameAlt, department, interests });
  });
  return { stubs, total };
}

type PaperStub = { title: string; citation: string; url: string };

function parseProfile(html: string, stub: Stub) {
  const $ = cheerio.load(html);
  const box = $(".r_v_img_box");
  const p = clean(box.find("p").first().text()) || stub.name;
  const em = clean(box.find("em").first().text()) || stub.nameAlt;
  const nameKo = hasHangul(p) ? p : hasHangul(em) ? em : null;
  const nameEn = !hasHangul(p) ? p : !hasHangul(em) ? em : null;

  const ext: { orcid?: string; googleScholar?: string; scopus?: string; researcherId?: string; researchGate?: string } = {};
  $(".ri_type_box a").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    if (href.includes("orcid.org")) ext.orcid = href;
    else if (href.includes("scholar.google")) ext.googleScholar = href;
    else if (href.includes("scopus.com")) ext.scopus = href;
    else if (href.includes("webofscience")) ext.researcherId = href;
    else if (href.includes("researchgate")) ext.researchGate = href;
  });

  let email: string | null = null;
  let website: string | null = null;
  $(".r_v_u_link .r_i_list").each((_, li) => {
    const label = clean($(li).children("a").first().text()).toLowerCase();
    const val = $(li).find("ul a").first();
    if (label.includes("email")) email = clean(val.text()) || null;
    if (label.includes("website")) website = val.attr("href") || clean(val.text()) || null;
  });

  const history: Record<string, string[]> = {};
  $(".r_v_u_h_box").each((_, b) => {
    const title = clean($(b).find("h3").text());
    history[title] = $(b)
      .find("li")
      .map((__, li) => {
        const years = clean($(li).find("span").text());
        const rest = clean($(li).clone().find("span").remove().end().text());
        return years ? `${years} · ${rest}` : rest;
      })
      .get()
      .filter(Boolean);
  });
  const pick = (re: RegExp) => Object.entries(history).find(([k]) => re.test(k))?.[1] ?? [];

  const labA = $(".r_v_lab_t dt a").first();
  const labName = clean(labA.clone().children().remove().end().text()) || null;
  const labScholarUrl = labA.attr("href") ? abs(labA.attr("href")!) : null;
  const labDescription = clean($(".r_v_lab_t dd > p").last().text()) || null;

  const interests = $(".r_v_c_int li")
    .map((_, li) => clean($(li).text()))
    .get()
    .filter(Boolean);

  const pubCountText = clean($(".r_v_t_num").first().text()).replace(/,/g, "");
  const publicationCount = pubCountText ? Number(pubCountText) : null;

  const papers: PaperStub[] = [];
  $(".r_v_list_box li a").each((_, a) => {
    const text = clean($(a).text());
    const m = text.match(/^"(.+)",\s*(.*)$/);
    papers.push({ title: m ? m[1] : text, citation: m ? m[2] : "", url: abs($(a).attr("href") ?? "") });
  });

  const classifications = Array.from(
    new Set(
      $(".r_v_c_type_l > ul > li > a p")
        .map((_, el) => clean($(el).text()).replace(/^[\w]+\.\s*/, ""))
        .get()
        .filter(Boolean),
    ),
  );

  return {
    professor: { nameKo, nameEn, photoUrl: `${BASE}/researcher-image?id=${stub.id}`, email },
    department: clean($(".r_v_de_t").text()) || stub.department,
    labName,
    labDescription,
    labWebsite: website,
    labScholarUrl,
    researchInterests: interests.length ? interests : stub.interests,
    education: pick(/학력|Education/i),
    career: pick(/경력|Career/i),
    awards: pick(/수상|Award/i),
    externalIds: ext,
    publicationCount,
    papers,
    classifications,
  };
}

function parseArticle(html: string, stub: PaperStub) {
  const $ = cheerio.load(html);
  const meta = (name: string) =>
    $(`meta[name='${name}']`)
      .map((_, m) => clean($(m).attr("content")))
      .get()
      .filter(Boolean);
  const issued = meta("DC.issued")[0] ?? meta("DCTERMS.issued")[0] ?? "";
  const year = Number(issued.slice(0, 4)) || null;
  const doiRaw = [...meta("DC.identifier"), ...meta("citation_doi")].find((x) => /^10\.\d{4,}\//.test(x));
  const journalId = meta("DC.identifier").find((x) => /,\s*v\./.test(x)) ?? stub.citation;
  const journal = clean((meta("citation_journal_title")[0] ?? journalId.split(/,\s*v\./)[0]) || "") || null;
  const keywords = meta("DC.subject").filter((k) => k !== k.toUpperCase()).slice(0, 8); // author keywords (indexed ones are ALL CAPS)
  return {
    title: meta("DC.title")[0] ?? stub.title,
    year,
    issued,
    journal,
    url: stub.url,
    doi: doiRaw ? `https://doi.org/${doiRaw}` : null,
    abstract: meta("DCTERMS.abstract")[0] ?? null,
    keywords,
  };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const errors: { url: string; step: string; error: string }[] = [];

  // 1. List pages → stubs
  const first = parseList(await get(`${BASE}/browse-researcher`));
  const pages = Math.ceil(first.total / 12);
  const stubs = [...first.stubs];
  console.log(`List: ${first.total} researchers on ${pages} pages`);
  for (let n = 2; n <= pages && stubs.length < LIMIT; n++) {
    const url = `${BASE}/browse-researcher?query=&starts_with=&page=${n}&offset=${(n - 1) * 12}`;
    try {
      stubs.push(...parseList(await get(url)).stubs);
      process.stdout.write(`  page ${n}/${pages} (${stubs.length})\r`);
    } catch (e) {
      errors.push({ url, step: "list", error: (e as Error).message });
    }
  }
  const unique = Array.from(new Map(stubs.map((s) => [s.id, s])).values()).slice(0, LIMIT);
  console.log(`\nStubs: ${unique.length}`);

  // 2–3. Profiles + 3 most recent articles
  const existing: Record<string, { plainSummary?: unknown; keywords?: unknown; inferredSkills?: unknown }> = {};
  try {
    for (const l of JSON.parse(fs.readFileSync(path.join(ROOT, "data/labs.json"), "utf8"))) if (l.scholarUrl) existing[l.id] = l;
  } catch {}

  const labs = [];
  for (const [i, s] of unique.entries()) {
    const url = `${BASE}/researcher/${s.id}`;
    try {
      const prof = parseProfile(await get(url), s);
      const recentPapers = [];
      for (const ps of prof.papers.slice(0, 5)) {
        try {
          recentPapers.push(parseArticle(await get(ps.url), ps));
        } catch (e) {
          errors.push({ url: ps.url, step: "article", error: (e as Error).message });
          recentPapers.push({ title: ps.title, year: null, issued: "", journal: ps.citation.split(/,\s*v\./)[0] || null, url: ps.url, doi: null, abstract: null, keywords: [] });
        }
        if (recentPapers.length >= PAPERS_PER_LAB && recentPapers.every((p) => p.year)) break;
      }
      recentPapers.sort((a, b) => (b.issued || "").localeCompare(a.issued || ""));
      const { papers: _p, awards, ...rest } = prof;
      const prev = existing[s.id] ?? {};
      labs.push({
        id: s.id,
        scholarUrl: url,
        ...rest,
        awards,
        recentPapers: recentPapers.slice(0, PAPERS_PER_LAB),
        // AI-derived fields are filled by `npm run enrich` (kept across re-crawls)
        plainSummary: (prev.plainSummary as string) ?? null,
        keywords: (prev.keywords as string[]) ?? [],
        inferredSkills: (prev.inferredSkills as unknown[]) ?? [],
        recruiting: { status: "Unknown", note: null },
        lastCrawled: today,
      });
      const name = rest.professor.nameEn ?? rest.professor.nameKo ?? s.name;
      console.log(`[${i + 1}/${unique.length}] ${name} ✓ ${rest.labName ? "lab" : "no lab"}, ${recentPapers.length} papers`);
    } catch (e) {
      errors.push({ url, step: "profile", error: (e as Error).message });
      console.log(`[${i + 1}/${unique.length}] ${s.name} ✗ ${(e as Error).message}`);
    }
  }

  fs.writeFileSync(path.join(ROOT, "data/labs.json"), JSON.stringify(labs, null, 1) + "\n");
  const meta = {
    source: "DGIST Scholar (scholar.dgist.ac.kr)",
    sourceUrl: `${BASE}/browse-researcher`,
    crawledAt: today,
    researchers: labs.length,
    withLab: labs.filter((l) => l.labName).length,
    withPapers: labs.filter((l) => l.recentPapers.length).length,
    withAbstracts: labs.filter((l) => l.recentPapers.some((p) => p.abstract)).length,
    departments: Object.fromEntries(
      Object.entries(
        labs.reduce<Record<string, number>>((acc, l) => {
          const d = l.department ?? "Not listed";
          acc[d] = (acc[d] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    ),
    errors: errors.length,
  };
  fs.writeFileSync(path.join(ROOT, "data/labs_meta.json"), JSON.stringify(meta, null, 2) + "\n");
  fs.writeFileSync(path.join(ROOT, "scripts/crawl_errors.json"), JSON.stringify(errors, null, 2) + "\n");
  console.log(`\nDone: ${labs.length} researchers (${meta.withLab} with lab, ${meta.withPapers} with papers). Errors: ${errors.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
