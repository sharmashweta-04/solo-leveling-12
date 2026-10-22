# AGENTS.md: Solo Leveling Class 12 PCB Dungeon

## What we are building
A single-user, mobile-first gamified study tracker for a Class 12 PCB student. 45-day plan starting 2026-11-01 (Day 45 = 2026-12-15). Full design is in `README.md`. Game numbers live ONLY in `config/game_rules.json`. The day-by-day plan lives ONLY in `config/plan_45days.json`. Video links live ONLY in `config/resources.json`. All system/popup text lives ONLY in `config/system_messages.json`. Workouts live ONLY in `config/workouts.json`. Never hardcode values from these files in components.

## Hard constraints
- **Free tools only.** No paid APIs, no paid services, no API keys.
- **Local-first MVP:** Next.js (App Router) + TypeScript + Tailwind CSS. Data stored in the browser with IndexedDB (use Dexie). No backend and no login in the MVP.
- Keep game logic in `src/engine/` as pure functions with no UI imports, so a backend can be added later.
- Time zone is always `Asia/Kolkata`. A game day runs 05:00 to 04:59. Never rely on server cron.
- **Lazy day evaluation:** on every app open, evaluate all unevaluated past days (apply penalties, convert unspent MP to XP, update streak), so nothing depends on a scheduler.
- XP and MP are **append-only ledgers**. Never mutate a balance directly. Rank and balances are derived from ledger sums.
- Must work well on a 380px-wide phone screen. Dark theme, near-black background, electric-blue holographic panels, monospace headings, "[ SYSTEM ]" style messages.
- Build as an installable PWA (manifest + service worker) once the core works.
- Provide **Export / Import JSON backup** in Settings, since browser storage can be wiped.

## Working rules for the agent
1. **Plan first.** For every task, write a short plan and list the files you will touch before editing.
2. Do **one task at a time**. Do not build features that were not requested.
3. After each task: run the app or tests, fix errors, then tell me exactly how to verify it.
4. Add unit tests (Vitest) for everything in `src/engine/`.
5. Keep dependencies minimal: next, react, tailwindcss, dexie, framer-motion, recharts, vitest. Ask before adding anything else.
6. Never invent syllabus content. Chapter and topic data comes from `docs/syllabus_*.md`.
7. If something in the README conflicts with this file, this file wins for the MVP.

## Mock tests, boss tests and PDFs
- Mock tests are taken in the **PW app**, not in this app. The Raid page only times the 3-hour session and records the result the player types in.
- Gate Boss Test scores are self-reported (20 questions from a PW DPP or chapter test).
- No PDF upload feature. Optional notes may be linked as static files from `public/notes/`.

## Level vs Rank
Both exist. Level comes from the formula in `game_rules.json` (`level`). Rank comes from the XP thresholds. Show both on the dashboard.

## Out of scope for MVP
Supabase or any backend, push notifications, Android companion app, Guild Master link, Shadow Army animations. Do not start these unless asked.

## Definition of done for each task
Runs without console errors, works at 380px width, has tests where applicable, and I can see the result in the browser.

## Corrections after PLAN.md review
- Chapters and topics come from `config/syllabus.json`. Do NOT parse `docs/syllabus_*.md` (no line breaks).
- Day quotas come from `plan.day_type` plus `game_rules.day_types`. Never use one fixed block count for every day.
- Dexie and all browser APIs must run client-side only (`'use client'`, guard `typeof window`). Static content (plan, syllabus, resources) is read from config at runtime; the seed only creates progress rows and must never overwrite progress.
- Dynamic route `gate/[id]` needs `generateStaticParams` for the 37 ids if using static export.
- Intro screen starts with a "TAP TO ENTER THE SYSTEM" gate so audio is allowed by the browser.

## Upgrade kit rules (added later)
- Work through TASKS.md in order without asking me questions. Use the defaults written there.
- After each phase: run `npm test` and `npm run build`, fix errors, `git commit`, tick PROGRESS.md.
- HUD look: use src/components/hud/* (HudBackground, HudFrame, QuestInfoPanel, OpeningCut) and src/utils/systemAudio.ts.
- Login/cloud save: Supabase (free), snapshot sync with optimistic concurrency, per-user Dexie database. Never put a service_role key in the app.
- If the free quota runs out, stop and write the exact next step in PROGRESS.md so I can say "continue".
