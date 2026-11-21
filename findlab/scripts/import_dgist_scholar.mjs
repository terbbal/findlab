#!/usr/bin/env node
/**
 * Import DGIST researchers from DGIST Scholar (https://scholar.dgist.ac.kr/browse-researcher)
 * into data/labs.json — one "lab" per researcher.
 *
 * Collected per researcher (all public on DGIST Scholar):
 *   name (KO/EN), department, research interests, email, lab/home links,
 *   recent journal papers, keyword cloud, national research-field categories.
 *
 * Usage:
 *   npm run import:scholar            # merge into data/labs.json (keeps sample + crawled labs)
 *   npm run import:scholar -- --replace   # also drop the 6 sample labs
 *   npm run import:scholar -- --limit 10  # only the first 10 researchers (quick test)
 *   npm run import:scholar -- --dry       # fetch + print, write nothing
 *
 * No AI key needed. Be polite: requests run 3 at a time with a short pause.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const BASE = "https://scholar.dgist.ac.kr";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LABS_FILE = path.join(ROOT, "data", "labs.json");
const PAGE_SIZE = 12;
const CONCURRENCY = 3;
const PAUSE_MS = 250;
const UA = "Mozilla/5.0 (compatible; finDLab-hackathon-importer/0.1)";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const REPLACE = args.includes("--replace");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const today = new Date().toISOString().slice(0, 10);

async function get(url, { json = false, tries = 3 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: json ? "application/json" : "text/html" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json ? await res.json() : await res.text();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await sleep(800 * i);
    }
  }
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          out[i] = await fn(items[i], i);
        } catch (e) {
          console.warn(`  ! ${e.message}`);
          out[i] = null;
        }
        done++;
        if (done % 20 === 0 || done === items.length) process.stdout.write(`  ${done}/${items.length}\n`);
        await sleep(PAUSE_MS);
      }
    }),
  );
  return out;
}

/* ---------- 1. Browse list ---------- */

function parseList(html) {
  const $ = cheerio.load(html);
  const total = Number((clean($(".result_t_arrow").text()).match(/of\s+(\d+)/) ?? [])[1] ?? 0);
  const people = $(".round_box > a[href^='/researcher/']")
    .map((_, a) => {
      const el = $(a);
      const id = el.attr("href").split("/researcher/")[1].split(/[?;#]/)[0];
      const p = el.find(".r_i_t_box dt p").first();
      const nameEn = clean(p.find("span").text());
      p.find("span").remove();
      const interests = clean(el.find(".l_research_int p").text())
        .split(";")
        .map(clean)
        .filter(Boolean);
      return { id, nameKo: clean(p.text()), nameEn, department: clean(el.find(".r_i_t_box dd").text()), interests };
    })
    .get();
  return { total, people };
}

async function fetchAllListed() {
  const first = parseList(await get(`${BASE}/browse-researcher?query=&starts_with=`));
  const pages = Math.ceil(first.total / PAGE_SIZE);
  console.log(`DGIST Scholar lists ${first.total} researchers (${pages} pages).`);
  const rest = await pool(
    Array.from({ length: pages - 1 }, (_, i) => i + 2),
    async (page) => parseList(await get(`${BASE}/browse-researcher?query=&starts_with=&page=${page}&offset=${(page - 1) * PAGE_SIZE}`)).people,
  );
  const all = [...first.people, ...rest.flat().filter(Boolean)];
  const seen = new Set();
  return all.filter((p) => !seen.has(p.id) && seen.add(p.id));
}

/* ---------- 2. Researcher detail ---------- */

function parseDetail(html) {
  const $ = cheerio.load(html);
  let email = null;
  const links = [];
  $(".r_v_u_link li.r_i_list").each((_, li) => {
    const label = clean($(li).children("a").first().text());
    $(li)
      .find("ul a[href]")
      .each((_, a) => {
        const href = $(a).attr("href");
        if (href.startsWith("mailto:")) email ??= href.slice(7).trim();
        else if (/^https?:\/\//.test(href)) links.push({ label: label || "Link", url: href });
      });
  });
  $(".ri_type_box a[href^='http']").each((_, a) => {
    const label = clean($(a).text()) || $(a).attr("data-bs-original-title") || "Profile";
    links.push({ label, url: $(a).attr("href") });
  });

  const interests = $(".r_v_c_int li").map((_, li) => clean($(li).text())).get().filter(Boolean);

  const papers = [];
  $(".r_v_c_row").each((_, row) => {
    if (clean($(row).find(".r_v_c_tit em").first().text()) !== "저널 논문") return;
    $(row)
      .find(".r_v_list_box li a")
      .each((_, a) => {
        const text = clean($(a).text());
        const title = (text.match(/^"(.+?)",/) ?? [])[1] ?? text;
        const year = Number((text.match(/\((\d{4})-\d{2}\)/) ?? [])[1]) || undefined;
        papers.push({ title, url: BASE + $(a).attr("href"), ...(year ? { year } : {}) });
      });
  });

  // Research-field categories (6T / 국가과학기술표준분류 / 12대 국가전략기술): keep the most specific names.
  const fields = [];
  $(".r_v_c_type_l").each((_, col) => {
    $(col)
      .find("li > a")
      .each((_, a) => {
        const name = clean($(a).text()).replace(/^[A-Z0-9]+\.\s*/, "");
        // Skip catch-all buckets ("기타", "달리 분류되지 않는 …") and the broad 6T labels like "IT(정보기술)".
        if (!name || /기타|달리 분류되지/.test(name) || /^[A-Z]{2}\(.+\)$/.test(name)) return;
        if (!fields.includes(name)) fields.push(name);
      });
  });
  return { email, links, interests, papers, fields };
}

async function fetchKeywords(id) {
  try {
    const j = await get(`${BASE}/json/researcher/wordcloud?id=${id}`, { json: true, tries: 2 });
    return (j?.results?.searchResults ?? []).sort((a, b) => b.count - a.count).map((k) => clean(k.name).toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

/* ---------- 3. Build Lab records ---------- */

const enName = (s) => {
  const [last, first] = s.split(",").map(clean);
  return first ? `${first} ${last}` : clean(s);
};

const STYLE_EXP = /(experiment|wet|cell|tissue|synthesis|device|fabricat|material|battery|imaging|animal|neuro|chemi|bio)/i;
const STYLE_COMP = /(machine learning|deep learning|artificial intelligence|algorithm|comput|software|data|theory|simulation|optimization|network|vision|language|security|blockchain)/i;
function guessStyle(text) {
  const exp = STYLE_EXP.test(text);
  const comp = STYLE_COMP.test(text);
  return exp && comp ? "Both" : comp ? "Computational" : exp ? "Experimental" : undefined;
}

function toLab(p, d, keywords) {
  const interests = (d.interests.length ? d.interests : p.interests).slice(0, 12);
  const en = enName(p.nameEn || p.nameKo);
  // Academic departments have faculty; divisions, AX groups and centers list research staff.
  const isFaculty = /^Department of/i.test(p.department);
  const profEn = isFaculty ? `Prof. ${en}` : `Dr. ${en}`;
  const honorKo = isFaculty ? `${p.nameKo} 교수님` : `${p.nameKo} 연구원님`;
  const areas = (interests.length ? interests : keywords.slice(0, 5).map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase()))).slice(0, 6);
  const website = d.links.find((l) => !/orcid|scopus|scholar\.google|researchgate|webofscience/i.test(l.url))?.url ?? null;
  const kw = Array.from(new Set([...interests.map((s) => s.toLowerCase()), ...keywords.slice(0, 25), ...d.fields.map((s) => s.toLowerCase())])).filter(
    (k) => k.length >= 2,
  );
  const listed = areas.slice(0, 4).join(", ");
  const summaryEn = listed
    ? `${profEn} (${p.department}) works on ${listed}.${d.papers[0] ? ` A recent paper: "${d.papers[0].title}".` : ""}`
    : `${profEn} is part of the ${p.department}. Research interests are not listed on DGIST Scholar yet — check the profile.`;
  const summaryKo = listed
    ? `${honorKo}(${p.department})은 ${listed} 등을 연구해요.${d.papers[0] ? ` 최근 논문: "${d.papers[0].title}"` : ""}`
    : `${honorKo}은 ${p.department} 소속이에요. DGIST Scholar에 연구 관심사가 아직 없어서, 프로필을 직접 확인해 보세요.`;

  return {
    id: `dgist-${p.id.slice(0, 8)}`,
    name: `${en} Lab`,
    professor: `${p.nameKo} (${profEn})`,
    website,
    researchAreas: areas,
    plainSummary: summaryEn,
    plainSummaryKo: summaryKo,
    recentPapers: d.papers.slice(0, 5),
    contacts: [{ name: `${p.nameKo} (${profEn})`, role: isFaculty ? "Professor" : "Other", email: d.email }],
    recruiting: { status: "Unknown", note: null, types: [] },
    keywords: kw,
    isSample: false,
    lastUpdated: today,
    ...(guessStyle([...interests, ...keywords.slice(0, 15)].join(" ")) ? { style: guessStyle([...interests, ...keywords.slice(0, 15)].join(" ")) } : {}),
    source: "dgist-scholar",
    department: p.department,
    professorKo: p.nameKo,
    scholarUrl: `${BASE}/researcher/${p.id}`,
    fields: d.fields.slice(0, 8),
    links: d.links,
  };
}

/* ---------- main ---------- */

const listed = (await fetchAllListed()).slice(0, LIMIT);
console.log(`Fetching ${listed.length} researcher profiles…`);
const labs = (
  await pool(listed, async (p) => {
    const [html, keywords] = await Promise.all([get(`${BASE}/researcher/${p.id}`), fetchKeywords(p.id)]);
    return toLab(p, parseDetail(html), keywords);
  })
).filter(Boolean);

console.log(`Built ${labs.length} labs (${labs.filter((l) => l.contacts[0].email).length} with email, ${labs.filter((l) => l.recentPapers.length).length} with papers).`);

if (DRY) {
  console.log(JSON.stringify(labs.slice(0, 2), null, 2));
  process.exit(0);
}

const existing = JSON.parse(await fs.readFile(LABS_FILE, "utf8").catch(() => "[]"));
const kept = existing.filter((l) => l.source !== "dgist-scholar" && !(REPLACE && l.isSample));
// Keep recruiting info added by `npm run import:phdkim` (it is not on DGIST Scholar).
const previous = new Map(existing.map((l) => [l.id, l]));
for (const lab of labs) {
  const old = previous.get(lab.id);
  if (!old) continue;
  for (const key of ["recruiting", "recruitingSource", "phdkimUrl"]) if (old[key] !== undefined) lab[key] = old[key];
}
await fs.writeFile(LABS_FILE, JSON.stringify([...kept, ...labs], null, 2) + "\n", "utf8");
console.log(`Wrote ${kept.length + labs.length} labs to data/labs.json (${kept.length} kept + ${labs.length} from DGIST Scholar).`);
