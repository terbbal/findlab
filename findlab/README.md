# fin**D** Lab — DGIST 연구실 소개팅 (v3)

> **From your diary to your dream lab.** Record what you do, explore every DGIST lab with real data, find the 3 labs that fit you, and plan the DGIST courses that get you there.
> Core rule: **the AI never writes content on the student's behalf.** It only classifies, matches, summarizes public lab data, and infers skills (always labeled ✦ AI).

| Step | What it does |
|---|---|
| **① My Diary** | Log activities (text or 🎙 voice). AI only suggests a category + skill tags. Your own words become your CV lines. Calendar, timeline, namecard (QR), CV export, LMS deadlines. |
| **② Labs** | Searchable directory of **all 263 DGIST researchers/labs** crawled from DGIST Scholar: Fuse.js search (KO/EN), department filter, "has website", "published in last 2 years", sort, ♡ save, full detail pages. |
| **③ Find My Lab** | Three ways in: **your diary**, **your CV** (upload a PDF or paste text) or **free-text interests**. TF-IDF similarity over every lab (interests, lab description, paper titles & abstracts) → top 15 → Claude reranks to the **top 3** with fit score, "why it fits" citing your diary or CV, readiness estimate, + 10 more similar labs. "Check my fit" for a single lab. |
| **④ Skill Roadmap** | **Course plan** (default tab): pick several labs → their skills are merged → each skill is linked to the **DGIST courses** that teach it → a **semester-by-semester plan** for your remaining semesters. **Skill checklist** tab: one lab's skills (with evidence + paper link) vs. your diary → readiness % → a checklist you plan yourself. |

## Run it

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY (optional — without it, non-AI fallbacks run)
npm run dev                    # http://localhost:3000
```

On first visit the app opens in **Demo (Minji)** mode so voters see a filled app. "Start my own" switches to your own space.

## Data pipeline (real DGIST data)

```bash
npm run crawl     # DGIST Scholar → data/labs.json + data/labs_meta.json (~20 min first time, cached after)
npm run enrich    # analysis fields: AI if ANTHROPIC_API_KEY is set (cached per lab), else rule-based extraction
```

- **Source:** https://scholar.dgist.ac.kr/browse-researcher (DSpace 6.3). Parsers were written against saved samples in `scripts/samples/`.
- **robots.txt respected:** only `/browse-researcher`, `/researcher/{uuid}` and `/handle/…` pages are fetched. `/simple-search` is disallowed, so each lab's 3 most recent papers come from the profile page's latest-papers list.
- **Polite:** 1 request at a time, ~800 ms apart, 15 s timeout, 2 retries with backoff, User-Agent `finD-Lab/0.3 (DGIST student project; contact: $TEAM_EMAIL)`, every raw response cached in `scripts/cache/`.
- **Current snapshot (2026-11-21):** 263 researchers · 171 with a lab · 239 with papers & abstracts · 0 errors · 250 with inferred skills.
- **Enrichment:** `plainSummary` (+ Korean), `keywords`, `inferredSkills` (importance + evidence + source papers). AI output is labeled ✦ AI; rule-based output is labeled "auto". Never invents anything beyond the scraped text.
- Researchers with too little data stay in the directory but are excluded from matching (220 matchable).

## Course plan (④ Skill Roadmap)

**Labs → skills → DGIST courses → semester plan.**

1. Click labs on the left to add them (as many as you like). Their skills are merged; a course shared by several skills or labs appears once.
2. Set where you are now (e.g. 2학년 1학기), max credits per semester (default 18), and the courses you've already taken (search by code or name).
3. A skill counts as **ready** when a course you took covers it (same-course codes count too, e.g. CSE204 = BE201) or your diary already shows it. The page shows "x/y skills ready".
4. For the rest, the planner picks the **fewest courses** that cover every open skill (core skills weigh double; one linked course is enough per skill) and places them from the next semester through 4학년 2학기:
   - only in a semester the course is offered (봄/가을),
   - within the credit limit,
   - after its prerequisites (when known),
   - not above your year (100/200-level any time, 300-level from 3학년, 400-level from 4학년).
5. Each course card shows **"이 과목이 채워주는 skill"** tags and which labs need them. Courses you took appear under **이수 완료**. Skills with no DGIST course show **"DGIST 과목 없음 → 외부 학습 필요"**.

Settings are saved in the browser (`coursePlan` in localStorage). The planner is a pure function in `lib/courseplan.ts`.

### Course data

- **`data/dgist_courses.json`**: a one-time snapshot (2026-11-21) of **251 undergraduate courses** offered in 2025–2026 spring/fall, from DGIST's public course lookup (https://welcome.dgist.ac.kr/ucs/ucsqProfRespSbjtInq/index.do).
  Fields: `code`, `name`, `nameKo`, `credits`, `semester` (봄/가을), `department` (derived from the code prefix), `prerequisites`, `equivalents` (same course, other code), `offeredTerms`.
- **No crawler on purpose:** that site's `robots.txt` disallows automated access, so refresh the snapshot by hand from the lookup page.
- **Prerequisites are empty:** the source has no prerequisite field. Fill in `prerequisites` by hand and the planner orders courses by them; until then the page says the order is by course level and semester only.
- **`data/skills.json`**: the reviewed skill → course links (many-to-many by course code), with a one-line reason per link. 62 skills; 17 have no DGIST course (e.g. ROS, LLMs, CRISPR, animal models). Only courses that exist in `dgist_courses.json` may be added.

## Deploy to Vercel (so others can test it)

The repo has the app inside the `findlab/` folder, so set the **Root Directory**.

1. Go to https://vercel.com → **Add New… → Project** → import `terbbal/findlab`.
2. **Root Directory:** `findlab` (click *Edit* next to it). Framework: Next.js (auto-detected).
3. **Environment Variables:** `ANTHROPIC_API_KEY` (your key), `CLAUDE_MODEL` = `claude-sonnet-5-5`, `AI_RATE_LIMIT_PER_HOUR` = `30`.
4. Click **Deploy**. After ~2 minutes you get `https://<project>.vercel.app`. Put it on the last slide with a QR code.

No database is needed: lab data is static JSON bundled at build time, and each user's diary/roadmap/LMS data stays in their own browser.

## Storage, privacy & safety

- **Per-user data, no accounts:** diary, profile, saved labs, roadmaps, LMS items (and the LMS calendar link) live in the user's browser (localStorage). Two workspaces: *My data* and *Demo (Minji)*.
- **Export/import:** Settings → "Download my diary (.zip of .md files)" / "Import .md files".
- **Delete:** Settings → "Delete all my data". See `/privacy`.
- **LMS:** never asks for or stores passwords; never scrapes logged-in pages. Paste the Blackboard iCal link (Calendar → share/external link) or upload an `.ics`. The server parses it once and keeps nothing. Re-sync on dashboard load if older than 1 h, "Sync now", "Disconnect LMS", "Try with sample data".
- **Rate limiting:** AI routes allow 30 requests per user (IP) per hour.
- **Attribution:** footer + every lab page: "Lab data from DGIST Scholar (scholar.dgist.ac.kr), crawled <date>", with a link back to each Scholar profile.

## What's real vs. sample

| Feature | Status |
|---|---|
| Lab directory, detail pages, papers, abstracts, emails, websites | **Real** (DGIST Scholar crawl) |
| Lab matching | **Real** TF-IDF + **AI** rerank (fallback: TF-IDF ranking with keyword explanations) |
| Skills per lab | **Rule-based** from real abstracts now; **AI** after `npm run enrich` with a key |
| Lab plain summaries | **AI** after `npm run enrich` with a key (hidden until then) |
| Diary category/skill tags, namecard, gap nudges | **AI** (with fallbacks) |
| LMS deadlines | **Real** via your iCal link / .ics; sample toggle for demos |
| DGIST courses & semester plan | **Real** course snapshot (2025–2026) + reviewed skill→course links; planner is deterministic (no AI). Prerequisites not available |
| CV upload (Find My Lab) | **Real** PDF text extraction (in memory, never stored) |
| Opportunities (UGRP/DURA/FGLP deadlines), Minji | **Sample** |
| Recruiting status | **Recruiting** for 20 labs (김박사넷 open-lab list, checked 2026-11-21, with source link); **Unknown** for the rest |

## v3 decisions (time-boxed for the 17:00 deadline)

- Built on the v1 codebase, converted to v3: removed AI-written content (Suggest Mail, AI-polished CV bullets).
- Followed the spec's fallback scope: **guest/local storage instead of Supabase auth/DB** (no accounts to set up, nothing personal on a server). Supabase magic-link + RLS is the next step.
- TF-IDF instead of embeddings (no extra API needed, instant, offline).

## Folder structure

```
app/            pages: / (dashboard), /cv (My Diary), /labs, /labs/[id], /labs/saved, /find, /roadmap, /settings, /privacy
app/api/        labs, find, courses, lms/parse, diary/enhance, cv/{gaps,namecard,generate,upload}, opportunities, sample
components/     labs/, find/, roadmap/, lms/, cv/, namecard/, settings/, shared/, ui/
lib/            labs.ts (lab data), tfidf.ts (matching), readiness.ts, courses.ts + skills.ts (course data), courseplan.ts (semester planner),
                localdb.ts (per-browser storage), ai.ts, prompts.ts, ratelimit.ts
data/           labs.json, labs_meta.json, dgist_courses.json, skills.json, sample/ (lms, opportunities, demo_user, ai_fallbacks)
scripts/        crawl_scholar.ts, enrich_labs.ts, samples/ (raw HTML used to write the parsers)
```

## Future work

Course prerequisites (from syllabi or the official curriculum) · Supabase auth (DGIST email magic link) + Postgres with RLS · lab-provided recruiting info · embeddings · DGIST mail integration · deployment on DGIST AI-HUB · monthly re-crawl.
