# fin**D** Lab — DGIST 연구실 소개팅 (v3)

> **From your diary to your dream lab.** Record what you do, explore every DGIST lab with real data, find the 3 labs that fit you, and build a skill roadmap to get there.
> Core rule: **the AI never writes content on the student's behalf.** It only classifies, matches, summarizes public lab data, and infers skills (always labeled ✦ AI).

| Step | What it does |
|---|---|
| **① My Diary** | Log activities (text or 🎙 voice). AI only suggests a category + skill tags. Your own words become your CV lines. Calendar, timeline, namecard (QR), CV export, LMS deadlines. |
| **② Labs** | Searchable directory of **all 263 DGIST researchers/labs** crawled from DGIST Scholar: Fuse.js search (KO/EN), department filter, "has website", "published in last 2 years", sort, ♡ save, full detail pages. |
| **③ Find My Lab** | TF-IDF similarity over every lab (interests, lab description, paper titles & abstracts) → top 15 → Claude reranks to the **top 3** with fit score, "why it fits" citing your diary, readiness estimate, + 10 more similar labs. "Check my fit" for a single lab. |
| **④ Skill Roadmap** | Skills inferred from each lab's **real recent abstracts** (with evidence + paper link) vs. skills in your diary → readiness % → a checklist you plan yourself, with diary entries linked as proof and related LMS items suggested. |

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

## Deploy to Vercel (so others can test it)

The repo has the app inside the `findlab/` folder, so set the **Root Directory**.

1. Go to https://vercel.com → **Add New… → Project** → import `terbbal/findlab`.
2. **Root Directory:** `findlab` (click *Edit* next to it). Framework: Next.js (auto-detected).
3. **Environment Variables:** `ANTHROPIC_API_KEY` (your key), `CLAUDE_MODEL` = `claude-sonnet-5-5`, `AI_RATE_LIMIT_PER_HOUR` = `30`.
4. Click **Deploy**. After ~2 minutes you get `https://<project>.vercel.app`. Put it on the last slide with a QR code.

No database is needed: lab data is static JSON bundled at build time, and each user's diary/roadmap/LMS data stays in their own browser.

## Sign-in (Supabase, optional)

Guests can use everything without an account (data in the browser). To enable **"Sign in with DGIST email"** + cloud sync:

1. Create a project at https://supabase.com (region: Seoul).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run** (creates `user_data` with row-level security).
3. **Authentication → URL Configuration**: set **Site URL** to your app URL and add `<app URL>/account` to **Redirect URLs**.
4. **Project Settings → API**: copy the Project URL + anon key into `.env.local` (or Vercel env vars):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=""` to test with non-DGIST emails).
5. Restart `npm run dev`. The avatar (top right) → **Sign in** → email link → your "My data" space syncs to your account.

Note: Supabase's built-in email service sends only a few sign-in emails per hour; for a real launch add your own SMTP in Supabase → Authentication → Emails.

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
| Courses list, opportunities (UGRP/DURA/FGLP deadlines), Minji | **Sample** |
| Recruiting status | **Unknown** for all labs (not stated on Scholar) |

## v3 decisions (time-boxed for the 17:00 deadline)

- Built on the v1 codebase, converted to v3: removed AI-written content (Suggest Mail, AI-polished CV bullets).
- Followed the spec's fallback scope: **guest/local storage instead of Supabase auth/DB** (no accounts to set up, nothing personal on a server). Supabase magic-link + RLS is the next step.
- TF-IDF instead of embeddings (no extra API needed, instant, offline).

## Folder structure

```
app/            pages: / (dashboard), /cv (My Diary), /labs, /labs/[id], /labs/saved, /find, /roadmap, /settings, /privacy
app/api/        labs, find, lms/parse, diary/enhance, cv/{gaps,namecard,generate,upload}, opportunities, sample
components/     labs/, find/, roadmap/, lms/, cv/, namecard/, settings/, shared/, ui/
lib/            labs.ts (lab data), tfidf.ts (matching), readiness.ts, localdb.ts (per-browser storage), ai.ts, prompts.ts, ratelimit.ts
data/           labs.json, labs_meta.json, sample/ (courses, lms, opportunities, demo_user, ai_fallbacks)
scripts/        crawl_scholar.ts, enrich_labs.ts, samples/ (raw HTML used to write the parsers)
```

## Future work

Supabase auth (DGIST email magic link) + Postgres with RLS · lab-provided recruiting info · embeddings · DGIST mail integration · deployment on DGIST AI-HUB · monthly re-crawl.
