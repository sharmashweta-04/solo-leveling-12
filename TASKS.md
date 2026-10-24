# TASKS.md: do all of this, in order, without asking questions

You are upgrading the existing app in this folder. The files from the upgrade kit are already placed in
the project (config/, src/components/hud/, src/utils/systemAudio.ts, supabase/schema.sql, docs/).
Read AGENTS.md first. After EACH phase: run `npm test` and `npm run build`, fix errors, `git commit`,
and update PROGRESS.md. Do not ask me questions; use the defaults below. Do not change game numbers in
config/game_rules.json (rank thresholds were calibrated, keep them).

## Phase 1: Housekeeping
- Delete the stale duplicate files at the project ROOT if present: game_rules.json, resources.json,
  system_messages.json, workouts.json (the app uses config/).
- Confirm config/syllabus.json, config/plan_45days.json (has day_type per day) and
  config/game_rules.json (has day_types, day_result, rest_token_rules, sleep, stats) are present.

## Phase 2: Fix the confirmed bugs
Open docs/REVIEW_AND_NEXT_PROMPTS.md and carry out everything in the code block under
"Prompt A: Fix the confirmed bugs" (items 1 to 7). Summary: rewrite lazy day evaluation so daily opens
evaluate yesterday, nothing is penalised before Day 1 or after Day 45, Day 1 is not skipped, a rolling 7-day
failure count is used, Import is transactional and validated, chapters come from config/syllabus.json,
quests follow plan.day_type, and the simulation uses the REAL engine with fake-indexeddb tests.

## Phase 3: UI and HUD look
1. Carry out the code block under "Prompt B: UI fix pass" in docs/REVIEW_AND_NEXT_PROMPTS.md
   (5-tab nav with a MORE sheet, no text under 12px, safe-area padding, next/font, one set of colour tokens,
   static gate pages).
2. Then carry out the code block under "Paste this into Antigravity" in docs/UI_HUD_PROMPT.md
   (animated particle background, HudFrame panels, QuestInfoPanel, opening horizontal cut with
   tap-to-enter, synthesized System sounds, Visual effects Full/Lite/Off and Sound on/off settings).

## Phase 3b: Use the ARISE video
Carry out the code block in docs/VIDEO_PROMPT.md (IntroVideo opening, once-per-day QuestArrival cutscene,
settings for replay and on/off). The video files are already in public/media/.

## Phase 4: Login, sign up and cloud-saved progress (code only)
Carry out the code block under "Step 2: paste this into Antigravity" in docs/REVIEW_AND_NEXT_PROMPTS.md.
- Create `.env.local.example` with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
- The real keys are not available yet. Build everything so the app still runs as a guest when the env
  vars are missing (show "Cloud save not configured" in Settings instead of crashing).
- Write the sync decision logic as pure functions with unit tests.
- When finished, tell me in 4 short lines what I must do in Supabase (see SETUP_SUPABASE.md) and where to paste the keys.

## Phase 5: Final check
- Update the simulation, PROGRESS.md, PLAN.md and docs/deploy.md (env vars on Vercel).
- Re-run the 45-day simulation on the real engine and report final rank, level, XP.
- List anything still broken or untested, honestly.
