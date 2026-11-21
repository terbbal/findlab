# fin**D** Lab — DGIST 연구실 소개팅

> **From your diary to your dream lab.**
> finD Lab helps DGIST undergraduates turn everyday activities into a CV, find the 3 labs that fit them best, and write the email to the professor — with AI at every step.

Built for the **2026 DGIST AI Makerthon** (2026-11-21).

## The three steps

| Step | What it does |
|---|---|
| **① Making CV** | Log what you did today (text or 🎙 voice). AI turns it into a CV bullet, then builds a timeline, calendar, namecard (with QR) and an exportable A4 CV — optionally tailored to a lab. |
| **② Finding Lab** | Use your finD Lab profile, upload a PDF CV, or just type your interests. Keyword preselect (top 10) + AI rerank → top 3 labs with a fit score, plain-language summary and "why it fits you" linked to your own diary entries. |
| **③ Suggest Mail** | AI drafts a personalized email (correct Korean honorifics, a real paper title from the lab record) → open it in your mail app. Track sent mails, get a follow-up draft after 7 days, and paste the reply for a summary + next steps. |

## Setup

```bash
npm install
cp .env.example .env.local   # then add your key (optional — see demo mode)
npm run dev                  # http://localhost:3000
```

`.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...      # server-side only, never sent to the browser
CLAUDE_MODEL=claude-sonnet-5-5    # optional; this is the default
```

Other scripts:

```bash
npm run crawl              # crawl lab homepages in data/lab_urls.txt → data/labs.json (keeps sample labs)
npm run crawl -- --replace # same, but drops the 6 sample labs
npm run crawl -- --dry     # fetch + extract only (no AI, nothing written) — check your URLs
npm run seed               # reset the demo user "minji" (12 entries, profile, 1 overdue mail)
npm run import:scholar     # import all DGIST researchers from DGIST Scholar → data/labs.json (no API key needed)
npm run import:phdkim      # add recruiting status ("can I apply?") from 김박사넷 open lab → data/labs.json
npm run build              # production build
```

### Real DGIST labs (DGIST Scholar)

`npm run import:scholar` reads the public researcher directory at
[scholar.dgist.ac.kr/browse-researcher](https://scholar.dgist.ac.kr/browse-researcher) (263 researchers) and writes
one lab per researcher into `data/labs.json`, marked `source: "dgist-scholar"`:

- name (KO/EN), department, research interests, email, lab website / Google Scholar / ORCiD links
- up to 5 recent journal papers (with DGIST Scholar links) — used by the email draft
- the DGIST Scholar keyword cloud + national research-field categories — used by keyword preselect
- a plain summary built from the interests (no AI); recruiting status starts as **Unknown**

Re-running it replaces only the DGIST Scholar labs; sample labs and crawled labs are kept, and so is the
recruiting info below (`-- --replace` also drops the 6 sample labs, `-- --limit 10` for a quick test, `-- --dry` to write nothing).

### "Can I apply?" — recruiting status (김박사넷)

`npm run import:phdkim` reads the public [김박사넷 open-lab list](https://phdkim.net/professor/open-lab), where PIs
mark themselves "지금 연구실 모집중이에요!" with the positions (대학원생 / 박사후연구원 / 학부생인턴), and the
DGIST professor directory on 김박사넷. For each DGIST Scholar lab it stores only facts: `recruiting` (status, positions,
date checked), `recruitingSource` (link to the open-lab card) and `phdkimUrl` (profile link). No posts or reviews are copied.

- Matched by Korean name; when two researchers share a name, department and open-lab keywords decide.
- Labs **not** on 김박사넷 open lab stay **Unknown** (not listed ≠ not recruiting) and show a link to check.
- The browse page has a "지금 신청 가능한 연구실만" filter; matching gives recruiting labs a small tie-break bonus.
- Re-run before the demo — open-lab cards change. Run it after `import:scholar` on a fresh checkout.

### Demo mode (offline-safe)

If no `ANTHROPIC_API_KEY` is set, or an AI call fails, every AI route falls back to precomputed responses in `data/sample/ai_fallbacks.json` (plus small deterministic heuristics), and the UI shows a **⚡ Demo mode** badge. The full demo path works with no network.

Set `FINDLAB_DEMO_MODE=1` in `.env.local` to force demo mode instantly (e.g. if the venue Wi-Fi is flaky).

**Before the pitch:** run `npm run seed` to reset Minji's data, and in **Settings → `···` → Reset demo cache**.

## Demo path (≈ 2 minutes)

1. **Dashboard** → 🎙 *"Today I finished my gesture-recognition ML project with my teammate"* → saved with a polished CV bullet.
2. **① Making CV → Timeline** → nudge *"No research experience yet — UGRP deadline in 12 days."*
3. **Namecard** tab → updated skills (auto-refreshed after each diary save).
4. **② Finding Lab** → "Use my finD Lab profile" → top 3 labs with fit scores and "why it fits you".
5. **Write email →** → a Korean formal email to the professor → **Open in mail app**.
6. **Sent mails** → "Paste reply" → **Use sample reply** → summary + next steps.

Hidden helpers: **Settings → `···`** → "Trigger alarm now" (daily reminder modal).

## What's real AI vs. mocked

| Feature | Status |
|---|---|
| Diary note → category, skills, CV bullet | **Real AI** (`/api/diary/enhance`) |
| Gap-detection nudges | **Real AI** on real entry stats (`/api/cv/gaps`) |
| Namecard intro / skill levels / best projects | **Real AI** (`/api/cv/namecard`) |
| CV generation + "Tailor for a lab" + "What changed" | **Real AI** (`/api/cv/generate`) |
| Lab matching (keyword preselect + AI rerank) | **Real AI** (`/api/labs/match`) |
| Email draft, shorter / more formal, follow-up | **Real AI** (`/api/mail/generate`) |
| Reply summary + next steps | **Real AI** (`/api/mail/summarize`) |
| PDF CV text extraction | **Real** (`pdf-parse`, in memory only, never stored) |
| Voice input | **Real** (browser Web Speech API, `ko-KR` / `en-US`; best in Chrome) |
| Lab crawler | **Real** (`npm run crawl`; needs an API key) |
| Labs | **Real** — 263 DGIST researchers from DGIST Scholar (`npm run import:scholar`) + 6 fictional sample labs (`isSample: true`) for the offline demo |
| Courses & LMS | **Mocked** — `data/sample/courses.json`, `lms.json` |
| Opportunities / deadlines (UGRP, DURA, FGLP, winter intern) | **Mocked** — `data/sample/opportunities.json` |
| Sending email | **Never automatic** — `mailto:` link + copy; you send from your own DGIST mail |

Every AI route validates input with zod, uses a dedicated system prompt with honesty rules (`lib/prompts.ts`), asks for JSON only, retries once on invalid JSON, and falls back to demo mode on failure.

## Folder structure

```
app/
  page.tsx                  Dashboard
  cv/                       ① Making CV hub (tabs: Diary · Calendar · Timeline · Courses & LMS · Namecard · CV Export)
  cv/namecard/[userId]/     Public namecard (QR target)
  labs/                     ② Finding Lab · labs/[labId] detail · labs/browse
  mail/                     ③ Suggest Mail
  settings/                 Daily reminder time, language, demo user
  api/                      Route handlers (diary, cv, labs, mail, mails, opportunities, profile, sample)
components/                 UI (cv/, labs/, mail/, namecard/, shared/, ui/)
lib/
  ai.ts                     callClaudeJSON<T>() + withFallback() (server-only)
  prompts.ts                System prompts + JSON schemas per route
  storage.ts                File storage (.md entries with YAML frontmatter, JSON files)
  matching.ts               Profile text, keyword-overlap preselect, filters
  fallbacks.ts              Demo-mode responses and heuristics
  i18n.ts                   UI strings (KO/EN)
  types.ts                  Data models
data/
  users/minji/entries/*.md  Diary entries (YAML frontmatter)
  users/minji/profile.json  Profile / namecard
  users/minji/mails.json    Sent mails & reminders
  labs.json                 Labs (6 samples + crawled)
  lab_urls.txt              Lab homepages for the crawler
  sample/*.json             Courses, LMS, opportunities, AI fallbacks
scripts/
  crawl_labs.ts             Lab crawler
  seed.mjs                  Demo data seed
```

## Decisions & notes

- **Model:** defaults to `claude-sonnet-5-5` (override with `CLAUDE_MODEL`), called with low effort to keep the live demo snappy, with the server-side refusal fallback enabled.
- **Email editor:** a plain editable textarea instead of a rich-text editor — emails go out through `mailto:` as plain text anyway.
- **Lab style filter** (Computational / Experimental) uses an optional `style` field on each lab (the crawler fills it in).
- **Korean:** sample labs carry an optional `plainSummaryKo`; Minji's profile has `nameKo` / `interestsKo` so Korean emails read naturally.
- **Daily reminder** is checked client-side while the app is open (no push server).
- **Privacy:** uploaded PDFs are processed in memory and never written to disk; lab contacts come only from public lab pages; all sample data is labelled.

## Future work

- Real **DGIST mail** integration (deadline announcements → reminders) and **LMS** integration (courses & assignments).
- **DGIST SSO** login and multiple users.
- Recruiting info provided directly by labs.
- Deployment on **DGIST AI-HUB**.
- Re-crawling lab data monthly.
