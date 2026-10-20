# PROMPTS.md: Complete Build Order for Antigravity

Paste these **one at a time, in order**. After each: run the app, check the "Verify" line, then `git commit`. Start a **new chat** for each prompt. Antigravity's free tier has a weekly quota tied to how much work the agent does, so small steps matter.

## Folder before you start

```
solo-leveling-12/
├── AGENTS.md
├── README.md
├── config/  game_rules.json, plan_45days.json, resources.json,
│            system_messages.json, workouts.json
└── docs/    syllabus_chemistry.md, syllabus_physics.md,
             syllabus_biology.md, original_protocol.md, playlist.txt (optional)
```

Planning mode ON, Review Policy = Request Review, run `git init`.

## Do you need to upload PDFs?
No. Chapters and topics come from your three syllabus documents. Videos come from `resources.json`. Mock tests happen in the PW app. PDFs are optional (see the last section).

---

## Prompt 1: Understand and plan (no code)
```
Read AGENTS.md, README.md, every file in config/ and docs/. Do NOT write code.
Produce an MVP implementation plan using the local-first stack in AGENTS.md:
folder structure, Dexie tables, engine functions, pages, and task order.
List any conflicts or ambiguities in my files.
```
Verify: you get a plan; fix anything wrong before continuing.

## Prompt 2: Scaffold, theme, data
```
Scaffold Next.js + TypeScript + Tailwind. Build the dark "System Window" theme
(near-black, electric-blue glowing panels, monospace headings, mobile-first at
380px). Set up Dexie tables: xp_ledger, mp_ledger, quest_logs, focus_sessions,
chapter_progress, grimoire, srs_cards, mock_results, settings. Write a seed
loader that builds chapters and topics from docs/syllabus_*.md (37 chapters:
14 Physics, 10 Chemistry, 13 Biology) and the plan from config/plan_45days.json.
Add helper "currentGameDay()" in Asia/Kolkata with the 05:00 day boundary.
```
Verify: a debug page lists 37 chapters and 45 plan days.

## Prompt 3: Intro screen (your System Message)
```
Build the first-launch intro using config/system_messages.json ("intro").
Full-screen black, header "[ SYSTEM MESSAGE ]", then each line typed out one at
a time with a blue glow and a soft system chime (generate the sound with the Web
Audio API, no files). Replace {level} with the real level (1 on first launch).
The last line "YOUR QUEST STARTS NOW." appears larger, then an ACCEPT button.
Tap anywhere to skip the typing. After ACCEPT, run onboarding: Honesty Oath,
choose Normal or Easy mode, confirm start date 2026-11-01, then go to the
dashboard. Show intro once; add "Replay intro" in Settings.
If today is before Day 1, the dashboard shows the "before_day_1" countdown.
```
Verify: clear site data, reload, see the intro exactly as written.

## Prompt 4: Engine with tests
```
Create src/engine/ as pure TypeScript with Vitest tests. Read numbers ONLY from
config/game_rules.json. Write: xp.ts (awardXP with rank and streak multipliers),
level.ts (level from total XP using the formula in the config, plus xp to next
level), mana.ts (awardMP with daily cap, midnight MP-to-XP conversion), rank.ts
(computeRank, demotion), quests.ts (generate today's quests from the plan day
and Normal/Easy mode), evaluateDay.ts (given a past day's logs, return ledger
entries for penalties, bonuses, streak and conversion, honouring rest tokens).
Tests: all-clear day, failed day, rank and level boundaries, MP cap 90, easy mode.
```
Verify: `npm test` passes.

## Prompt 5: Dashboard, quests, focus timer
```
Build / (System Window): rank badge, level, XP bar, STR-style bars for INT, VIT,
AGI, PER, streak, "Day X of 45", today's Physics/Chemistry/Biology chapters from
the plan, and the quest list. Build /focus: 50-minute timer with subject and
chapter select; store started_at so it survives reloads; a block counts only if
elapsed >= 90% of the time; warn on tab switches (count interruptions). The
physical quest reads exercises from config/workouts.json (training vs recovery
day, never hardcoded). Completing quests writes ledger entries through the
engine and shows toasts from config/system_messages.json, plus rank-up and
level-up animations (Framer Motion).
```
Verify: complete a quest, see XP, level and toast update.

## Prompt 6: Shop, lazy day evaluation, rest tokens
```
Build /shop with Bronze, Silver, Gold keys, MP balance, the 60-minute daily
screen cap and an active-unlock countdown. Implement lazy day evaluation: on
every app open, evaluate all past unevaluated days (game day boundary 05:00
IST), append penalty/bonus/conversion entries to the ledgers, and show a summary
modal. Add the 3 Rest Day Tokens, emergency lockout and bypass penalty from
game_rules.json. Add a Sleep log (>=7h bonus).
```
Verify: change the system date in dev tools or add a debug "simulate next day" button.

## Prompt 7: Gate map, chapter pages, resources, boss test
```
Build /dungeon: 37 gates in three colour-coded wings (Physics blue, Chemistry
purple, Biology green) with states locked / in progress / cleared / shadow.
Build /gate/[id]: topic checklist from the syllabus docs, resources from
config/resources.json (skip entries with url null, show a "Add link" note),
notes field, and a Gate Boss Test form where I enter score out of 20 from a
PW DPP/test. Score >= 75% extracts a Shadow (message from system_messages.json)
and schedules SRS reviews at D+1, D+3, D+7, D+14. Build /shadows listing
extracted shadows.
```
Verify: clear one gate, see the shadow.

## Prompt 8: Boss Raid (mock tests happen in the PW app)
```
Build /raid. Mock tests are taken in the PW app, so this page does NOT show
questions. Flow: show the raid brief (chapters covered so far from the plan),
a "Start Raid" button that begins a 3-hour countdown (stored server-free via
started_at, survives reloads), instruction to open the PW app and take the test,
then a result form: total marks, attempted, correct, wrong, Physics/Chemistry/
Biology scores, time taken, notes. Submitting awards the raid bonus XP and the
90-minute Monarch's Leisure Gate. Raid days are those with is_raid true in the
plan; Phase 3 mock days also use this page. Show a mock trend chart (Recharts)
on /stats.
```
Verify: submit a fake result, see the chart and reward.

## Prompt 9: Grimoire and spaced repetition
```
Build /grimoire (error notebook: subject, chapter, question, my mistake,
correct approach, tag) and /review (due SRS cards using game_rules.json
intervals, grading Again/Hard/Good/Easy; Again resets the interval). Entries
from the Grimoire auto-create cards. Clearing today's due cards completes the
Grimoire Review quest.
```
Verify: add an entry, see it due tomorrow.

## Prompt 10: Stats, settings, backup
```
Build /stats (XP over time, subject radar, hours per subject, streak history,
weekly retrospective with weakest chapters from the Grimoire and mock results)
and /settings (Normal/Easy toggle, replay intro, read-only game rules, JSON
Export and Import of the whole database, reset with confirmation).
```
Verify: export, clear data, import, nothing lost.

## Prompt 11: PWA and deploy
```
Add PWA support (manifest, icons, service worker, works offline). Run a
production build and fix all errors. Give step-by-step instructions to deploy
free on Vercel (or Cloudflare Pages) and install on my phone home screen.
```

## Prompt 12: Final QA (do not skip)
```
Write and run a simulation script that plays 45 days for three players
(perfect, average, slacker) through the engine and prints final rank, level,
XP and penalties. Then review the whole app against README.md and list every
missing or broken feature, with fixes. Check: 380px layout, no console errors,
offline mode, data survives reload, intro shows once.
```
Verify: Perfect reaches S-Rank around Day 40 to 43; if far off, adjust thresholds in game_rules.json only.

---

## Optional: notes PDFs
Put small PDFs in `public/notes/` (e.g. `P1.pdf`) and add `{"title":"Notes","url":"/notes/P1.pdf"}` to that chapter in `resources.json`. Ask Antigravity: "Show notes links on the gate page and open PDFs in a new tab."

## Free-tool tips
- Bug? `git checkout .` and re-prompt; don't argue in the same chat.
- Ask "Explain what you changed in 5 lines" after each step.
- If quota runs out, use the Google Sheet fallback from the README.
- **Deadline:** if Prompts 1 to 8 aren't done by 31 Oct, start Day 1 on the sheet and finish the rest around Day 7.
