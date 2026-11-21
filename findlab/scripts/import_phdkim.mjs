#!/usr/bin/env node
/**
 * Add "can I apply?" (recruiting) info from 김박사넷 (https://phdkim.net) to the DGIST Scholar labs in data/labs.json.
 *
 * Sources on phdkim.net (public pages, robots.txt allows them):
 *   - /professor/open-lab?page=N            open-lab cards the PI filled in themselves:
 *                                            "지금 연구실 모집중이에요!" + 대학원생 / 박사후연구원 / 학부생인턴
 *   - /professor/search/department/<id>     DGIST professor list per department (for a profile link)
 *
 * Only facts are stored (recruiting yes/no, which positions, link, date checked) — no posts, reviews or other content.
 * A professor who has no open-lab card keeps status "Unknown": not listed ≠ not recruiting.
 *
 * Run after `npm run import:scholar`:
 *   npm run import:phdkim           # update data/labs.json
 *   npm run import:phdkim -- --dry  # print matches, write nothing
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const BASE = "https://phdkim.net";
const DGIST_UNIVERSITY_ID = 16; // https://phdkim.net/professor/search/university/16
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LABS_FILE = path.join(ROOT, "data", "labs.json");
const UA = "Mozilla/5.0 (compatible; finDLab-hackathon-importer/0.1)";
const DRY = process.argv.includes("--dry");
const today = new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await sleep(800 * i);
    }
  }
}

/** phdkim department name → DGIST Scholar department, to tell apart professors who share a name. */
const DEPT_HINTS = [
  [/전기전자컴퓨터|인공지능|반도체/, /Electrical Engineering and Computer Science|AI|Semiconductor/i],
  [/로봇|기계/, /Robotics|Mechatronics|Mobility/i],
  [/에너지|화학공학|재료/, /Energy/i],
  [/뇌과학/, /Brain/i],
  [/뉴바이올로지|생명|의생명/, /New Biology|Biomedical|Bio/i],
  [/화학물리|물리|화학/, /Physics and Chemistry/i],
  [/기초과학|교양/, /Liberal Arts/i],
  [/기술경영/, /Technology and Innovation Management/i],
];
const sameDept = (phdkimDept, scholarDept = "") => DEPT_HINTS.some(([k, s]) => k.test(phdkimDept) && s.test(scholarDept));

const POSITION = { 대학원생: "Grad student", 학부생인턴: "Undergrad intern" };

/* 1. Open-lab cards (all universities, paginated) → DGIST only */
async function fetchOpenLabs() {
  const out = [];
  for (let page = 1; page < 500; page++) {
    const $ = cheerio.load(await get(`${BASE}/professor/open-lab?page=${page}`));
    const items = $(".item > a[href^='/professor/']");
    if (!items.length) break;
    items.each((_, a) => {
      const el = $(a);
      const uni = clean(el.find(".university").text());
      if (!/^(DGIST|대구경북과학기술원)/.test(uni)) return;
      out.push({
        url: BASE + el.attr("href"),
        nameKo: clean(el.find(".name").text()),
        department: uni.replace(/^(DGIST|대구경북과학기술원)\s*/, ""),
        recruiting: /모집\s*중/.test(clean(el.find(".recruiting-area .text").text())),
        positions: el.find(".recruiting-area .mark").map((_, m) => clean($(m).text())).get(),
        keywords: el.find(".keywords li").map((_, li) => clean($(li).text()).replace(/^#/, "").toLowerCase()).get(),
      });
    });
    if (page % 10 === 0) console.log(`  open-lab page ${page}…`);
    await sleep(300);
  }
  return out;
}

/* 2. DGIST professor directory on phdkim (for the profile link of everyone, PI member or not) */
async function fetchDgistProfessors() {
  const $ = cheerio.load(await get(`${BASE}/professor/search/university/${DGIST_UNIVERSITY_ID}`));
  const depts = [...new Set($("a[href^='/professor/search/department/']").map((_, a) => $(a).attr("href")).get())];
  const out = [];
  for (const d of depts) {
    const $$ = cheerio.load(await get(BASE + d));
    $$("a[href^='/professor/'][href$='/info']").each((_, a) => {
      const el = $$(a);
      const nameKo = clean(el.find(".name").first().text());
      if (nameKo) out.push({ url: BASE + el.attr("href"), nameKo, department: clean(el.find(".department").text()).replace(/^DGIST\s*/, "") });
    });
    await sleep(300);
  }
  return out;
}

const labs = JSON.parse(await fs.readFile(LABS_FILE, "utf8"));
const scholarNameCount = new Map();
labs.forEach((l) => l.source === "dgist-scholar" && scholarNameCount.set(l.professorKo, (scholarNameCount.get(l.professorKo) ?? 0) + 1));

/** Pick the phdkim entry for a lab: same Korean name, and the same department when the name is shared on either site. */
function pick(entries, lab) {
  const same = entries.filter((e) => e.nameKo === lab.professorKo);
  if (same.length === 1 && scholarNameCount.get(lab.professorKo) === 1) return same[0];
  const inDept = same.filter((e) => sameDept(e.department, lab.department));
  if (scholarNameCount.get(lab.professorKo) === 1) return inDept[0] ?? null;
  // Two DGIST Scholar researchers share this name (even in one department): the open-lab keywords must overlap theirs.
  const mine = [...lab.keywords, ...lab.researchAreas].join(" ").toLowerCase();
  return inDept.find((e) => e.keywords?.some((k) => mine.includes(k))) ?? null;
}
console.log("Reading 김박사넷 open labs…");
const openLabs = await fetchOpenLabs();
console.log(`  ${openLabs.length} DGIST open labs (${openLabs.filter((o) => o.recruiting).length} recruiting).`);
console.log("Reading 김박사넷 DGIST professor directory…");
const directory = await fetchDgistProfessors();
console.log(`  ${directory.length} DGIST professors listed.`);

let matched = 0;
let linked = 0;
const unmatched = new Set(openLabs.map((o) => o.nameKo));
for (const lab of labs) {
  if (lab.source !== "dgist-scholar" || !lab.professorKo) continue;
  const open = pick(openLabs, lab);
  const dir = pick(directory, lab);
  const url = open?.url ?? dir?.url ?? null;
  if (url) linked++;
  lab.phdkimUrl = url ?? undefined;

  if (open) {
    matched++;
    unmatched.delete(open.nameKo);
    const types = [...new Set(open.positions.map((p) => POSITION[p]).filter(Boolean))];
    lab.recruiting = open.recruiting
      ? {
          status: "Recruiting",
          note: `김박사넷 오픈랩: ${open.positions.join(" · ")} 모집 중 (${today} 확인)`,
          types,
        }
      : { status: "Not recruiting", note: `김박사넷 오픈랩: 현재 모집 표시 없음 (${today} 확인)`, types: [] };
    lab.recruitingSource = { name: "김박사넷", url: open.url, checkedAt: today };
  } else if (lab.recruitingSource?.name === "김박사넷") {
    // Was on 김박사넷 before but the card is gone: back to unknown.
    lab.recruiting = { status: "Unknown", note: null, types: [] };
    delete lab.recruitingSource;
  }
}

console.log(`Recruiting info for ${matched} labs, 김박사넷 profile link for ${linked} labs.`);
if (unmatched.size) console.log(`Open labs with no DGIST Scholar match: ${[...unmatched].join(", ")}`);

if (DRY) {
  console.log(labs.filter((l) => l.recruitingSource).map((l) => `${l.professorKo}: ${l.recruiting.note}`).join("\n"));
} else {
  await fs.writeFile(LABS_FILE, JSON.stringify(labs, null, 2) + "\n", "utf8");
  console.log("Wrote data/labs.json");
}
