# Review of solo-leveling-12.zip + Next Prompts

I installed your project, ran the tests (15/15 pass) and `next build` (passes, 15 routes). I also wrote throw-away tests that fake the clock and IndexedDB to run the real `runLazyEvaluation()`. The problems below are confirmed by running the code, not guessed. The UI notes come from reading the code only, because I had no browser to take screenshots.

## 1. Confirmed bugs (fix before Day 1)

| # | Bug | What I observed |
| :-- | :-- | :-- |
| 1 | **Daily evaluation never runs if you open the app every day.** The loop starts at `last_evaluated + 1` but stops before `today`, and `last_evaluated` is set to today at the end. | Opening on Nov 3, 4, 5, 6 evaluated **0 days** each time. So no penalties, no streak, no MP-to-XP conversion for a daily user. |
| 2 | **Days before Day 1 get penalised.** No check for plan day < 1. | Opening on 22 Oct then 3 Nov created **11 FAILED days (-150 XP each)** for 23 Oct to 2 Nov and switched on Emergency Lockout. |
| 3 | **Day 1 is skipped** when you open on Day 1 and next on Day 4. | It evaluated Nov 2 and Nov 3 only. |
| 4 | **Penalties continue after Day 45.** | Opening on 25 Dec evaluated 16 to 24 Dec as failed days. |
| 5 | "Missed days in last 7" counts only the current catch-up window, not a rolling 7 days. | Emergency Lockout will rarely or wrongly trigger. |
| 6 | **Import is dangerous.** It calls `clear()` on all 9 tables, then `bulkAdd`. A bad file or a crash halfway leaves an empty database. | `app/settings/page.tsx` lines ~82-102. |
| 7 | **The "45-day simulation" does not test the real code.** `scripts/simulate_45days.js` does not import the engine. | That is why bugs 1 to 5 passed QA. |

## 2. Other issues

- **Stale config.** The project was built before my corrected files. `config/game_rules.json` lacks `day_types`, `day_result`, `rest_token_rules`, `sleep`, `stats` and the rest. Raid days still demand a full study day.
- **Chapters are hardcoded** in `src/data/chapters.ts` (492 lines, topics reworded by the agent) instead of `config/syllabus.json`.
- **Duplicate config files at the project root** (`game_rules.json`, `resources.json`, `system_messages.json`, `workouts.json`) differ from `config/`. The app imports `@/config/...`, so the root copies are stale and confusing. Delete them.
- Focus quests are completed with a button and `completed_blocks = required_blocks`, so nothing checks the timer. Decide whether you want that honesty-only.
- `/gate/[id]` is server-rendered (dynamic), so it won't work offline in the PWA.
- Rank thresholds were recalibrated by the agent (D 5001, C 15001, B 30001, A 48001, S 65001). That is consistent with MP-to-XP conversion adding up to 450 XP a day, so keep them. I put these into my kit's `game_rules.json` so merging does not undo them.
- **No login exists anywhere** (no auth or Supabase code), so progress lives only in one browser's IndexedDB.

## 3. UI issues (from code, please send screenshots for the rest)

- 7 bottom tabs with 9px labels is too cramped at 380px. Raid, Grimoire and Shadows are not in the nav at all.
- `maximumScale: 1` blocks pinch-zoom (an accessibility problem). Many texts are 9 to 10px.
- No safe-area padding for iPhone's bottom bar. Bottom padding is set page by page (`pb-20`).
- Fonts load from a Google Fonts `@import`, so the offline PWA falls back to system fonts.

---

# PROMPTS TO RUN (in this order, new chat each, commit after each)

## Before prompt A: update your files
1. Copy these from the kit into your project, replacing the old ones: `config/game_rules.json`, `config/plan_45days.json`, `config/syllabus.json`, `config/system_messages.json`, `AGENTS.md`.
2. Delete the stale root copies: `game_rules.json`, `resources.json`, `system_messages.json`, `workouts.json` (project root only).
3. Run `git commit -m "chore: update configs"`.

## Prompt A: Fix the confirmed bugs
```
Read AGENTS.md and REVIEW_AND_NEXT_PROMPTS.md section 1 and 2. Fix these in order, one commit each.

1. Rewrite src/engine/lazyEvaluation.ts. Use plan day numbers, not date strings.
   - Add a Dexie version(2) migration with a day_evaluations table
     (day PK, evaluated_at, status, xp_delta, streak_after). Never delete user data in the migration.
   - currentPlanDay = getPlanDayNumber(currentGameDay()). If < 1, return [] and do nothing.
   - Evaluate days lastEvaluatedDay+1 ... min(currentPlanDay-1, 45). When currentPlanDay > 45,
     evaluate up to Day 45 and stop. Never create quests or penalties for day < 1 or > 45.
   - Skip days already in day_evaluations (idempotent).
   - "Failed days in last 7" must be computed from day_evaluations for the previous 7 plan days.
   - Keep settings key last_evaluated_game_day compatible, or migrate it to a plan day number.
2. Add fake-indexeddb as a dev dependency and write Vitest tests (fake only Date, not timers):
   a) opening every day evaluates yesterday exactly once;
   b) first open on 22 Oct, next open on 3 Nov: zero penalties and no lockout;
   c) open on Day 1, next on Day 4: Days 1, 2, 3 are all evaluated;
   d) open on Day 45, then 25 Dec: only Day 45 is evaluated, nothing after;
   e) a 5-day gap applies one penalty per missed day and triggers lockout after 2 failures in 7 days;
   f) running evaluation twice does not double-apply anything.
3. Make Import safe: validate the JSON (version + required tables), wrap clear + bulkAdd in one
   db.transaction('rw', db.tables, ...) so a failure rolls back, and offer to download a backup
   of the current data first.
4. Replace src/data/chapters.ts with config/syllabus.json as the single source for chapters and topics.
5. Apply config/game_rules.json day_types and day_result: quests.ts must use plan.day_type
   (raid_part, raid_full, mock_full, analysis, blitz, final, learn, revise) and the block counts in
   the rules. A day is "cleared" per day_result.cleared_requires. Award the all-clear bonus
   immediately when the last quest is done (rewards_timing); evaluateDay only verifies and dedupes.
6. Rewrite scripts/simulate_45days.js as a TypeScript/Vitest simulation that imports the REAL engine
   and runs lazy evaluation against fake-indexeddb for three players (perfect, average, slacker).
   Print final rank, level, XP, penalties. Perfect should reach S-Rank around Day 40-43.
7. Remove the stale duplicate JSON files at the project root if they still exist.
Run npm test and npm run build after each step. Update PROGRESS.md.
```

## Prompt B: UI fix pass
```
Fix the mobile UI. Test at 360, 380 and 414px width.
- Bottom nav: 5 tabs only (SYSTEM, FOCUS, DUNGEON, SHOP, MORE). MORE opens a sheet with Quests, Raid,
  Grimoire, Review, Shadows, Stats, Settings. Every page must be reachable. Min tap target 44x44px.
- No text under 12px. Increase contrast of dim grey text.
- Remove maximumScale from the viewport (allow pinch-zoom). Add safe-area padding
  (env(safe-area-inset-bottom)) for the nav and one shared page wrapper with consistent bottom padding
  instead of per-page pb-20.
- Use next/font for Inter and JetBrains Mono instead of the CSS @import so fonts work offline.
- Consolidate the two colour systems (CSS variables vs hunter-* utilities) into one set of tokens.
- Dashboard: reduce scroll. Show Day X of 45, today's chapters and the next quest first; move radar and
  extras below. Add a clear empty state before Day 1.
- Add prefers-reduced-motion support and a sound on/off toggle in Settings.
- Make /gate/[id] statically generated with generateStaticParams for the 37 chapter ids so it works offline.
Show me before/after descriptions of each change. Do not change game logic.
```
Send me screenshots of any screen that still looks wrong and I'll give exact fixes.

## Prompt C: Login, sign up and saved progress (Supabase, free)

### Step 1: you do this by hand (about 10 minutes)
1. Go to supabase.com, create a free account and a new project.
2. SQL Editor, New query, paste the whole of `supabase/schema.sql` from this kit, click Run.
3. Authentication, Providers: make sure **Email** is on. While testing, you may turn **Confirm email** off, then turn it on again before sharing the app.
4. Authentication, URL configuration: set Site URL to your Vercel address and add `http://localhost:3000` as a redirect URL too.
5. Project Settings, API: copy the **Project URL** and the **anon public** key.
6. Create `.env.local` in the project: `NEXT_PUBLIC_SUPABASE_URL=...` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`. Add the same two in Vercel, Project Settings, Environment Variables.
7. **Never** paste the `service_role` key anywhere in the app or in a chat. The anon key is safe because row-level security protects the data.

(Menu names may differ slightly. Supabase's free tier has limits, including pausing projects after about a week of inactivity. Check the current terms.)

### Step 2: paste this into Antigravity
```
Add login, sign up and cloud-saved progress. Read AGENTS.md first. Keep the app local-first and offline-capable.
The Supabase schema is in supabase/schema.sql (already run). Env vars: NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_ANON_KEY. Add only @supabase/supabase-js as a new dependency.

AUTH
- New route /login: email + password, toggle Sign up / Log in, "Forgot password", and
  "Continue as guest" with the guest_warning from config/system_messages.json (section "auth").
  Style it as a System Window: "[ SYSTEM ] Identify yourself, Player."
- After login go to the dashboard; the intro plays once per account (intro_completed is part of the saved data).
- If not logged in and not a guest, redirect to /login. Keep the session across reloads.
- Settings gets an Account section: email, last synced time, Sync now, Log out.

PER-USER LOCAL DATABASE
- Open Dexie as `SoloLevelingDB_<userId>` for a logged-in user. Existing guest data stays in `SoloLevelingDB`.
- First login on a device that has guest data: ask "Upload my current progress to this account?"
  If the cloud already has data, show the conflict dialog instead.
- Logging out never deletes cloud data. Never mix two accounts' data in one database.

SYNC (snapshot with optimistic concurrency)
- Cloud row: player_snapshots(user_id, data jsonb, revision int). `data` is the same JSON as Export Backup.
- Pull on login and on app open. If the cloud revision is newer and local has no unsynced changes, replace local.
- Push (debounced about 5 s after any change, and on tab hide and logout):
  update ... set data = :snapshot, revision = :expected + 1 where user_id = :me and revision = :expected,
  using supabase-js .update().eq('user_id', id).eq('revision', expected).select().
  If 0 rows come back, there is a conflict: pull, then show the conflict dialog (Keep cloud / Keep this device /
  Download both as JSON). Never overwrite silently.
- NEVER push a new, empty or default database over a non-empty cloud save. Add a guard and a test.
- Before any local overwrite, keep a local safety copy (offer a JSON download).
- Offline: keep playing locally, show the offline message, queue the push, retry when online.
- Settings: "Restore previous version" listing player_snapshot_history rows (read-only select).

MESSAGES: use the "auth" texts in config/system_messages.json ("Welcome back, Player. Level {level}...").

TESTS: unit-test the sync decision function (pure TypeScript): cloud newer, local newer, both changed,
empty-local-vs-full-cloud, offline. Then manually test with two accounts and confirm user A cannot read user B's row.
Update PLAN.md, PROGRESS.md and docs/deploy.md (env vars on Vercel).
```

### How "saved levels not deleted" works after this
- Level, XP, rank, streak and every ledger entry are stored in the cloud under your account, so clearing the browser or changing phones does not lose them.
- Log in on a new device and the app pulls your save and shows your real level.
- The history table keeps the last 20 versions, so a bad sync can be rolled back.

## Prompt D (optional, only if ahead of schedule): extra features
Ordered by usefulness for a 45-day PCB crash course:
1. **DPP and PYQ tracker per chapter.** Checkboxes for the PW DPP, notes and PYQs, with a counter on the gate card.
2. **Weak-chapter heatmap.** Combine Grimoire counts and mock scores per chapter, and feed it into the Day 38 and Day 40 fixes.
3. **Night-review sheets.** Editable one-page formula, reaction and diagram sheets per chapter, shown in the Night Review quest.
4. **Calendar export (.ics)** of all 45 days, raids and mocks, so your phone calendar can remind you. Free, and no push server needed.
5. **Weekly retrospective** on each raid day: best and worst subject, time-of-day focus, streak.
6. **Parent / friend read-only link.** A share token that shows only today's status (needs one more Supabase table).
7. **Auto-backup reminder:** a weekly prompt to download the JSON, in addition to the cloud save.
8. **Friends leaderboard.** Needs more tables and moderation. Skip it unless you really want it.

```
Implement item N from REVIEW_AND_NEXT_PROMPTS.md section "Prompt D". Plan first, touch only the files needed,
add tests for any engine logic, and do not change game_rules.json without asking.
```
