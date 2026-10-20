# Progress Tracker: Solo Leveling Class 12 PCB Dungeon

## 12-Step Build Checklist

- [x] **Prompt 1: Understand and plan (no code)**
- [ ] **Prompt 2: Scaffold, theme, data**
- [ ] **Prompt 3: Intro screen (your System Message)**
- [ ] **Prompt 4: Engine with tests**
- [ ] **Prompt 5: Dashboard, quests, focus timer**
- [ ] **Prompt 6: Shop, lazy day evaluation, rest tokens**
- [ ] **Prompt 7: Gate map, chapter pages, resources, boss test**
- [ ] **Prompt 8: Boss Raid (mock tests happen in the PW app)**
- [ ] **Prompt 9: Grimoire and spaced repetition**
- [ ] **Prompt 10: Stats, settings, backup**
- [ ] **Prompt 11: PWA and deploy**
- [ ] **Prompt 12: Final QA (simulation & review)**

---

## Current Status
- **Phase**: Prompt 1 Complete
- **Status**: `PLAN.md` and `PROGRESS.md` verified and finalized. Architecture, Dexie tables, engine functions, lazy evaluation logic, and 12-step task order are established.
- **Next Up**: Prompt 2 (Scaffold Next.js + TypeScript + Tailwind, System Window dark theme, Dexie tables, seed loader for 37 chapters and 45 plan days, `currentGameDay()` helper).

---

## Known Blockers & Missing Input Files
1. `README.md` is referenced in `AGENTS.md` and prompts, but is currently missing from the workspace.
2. `config/plan_45days.json` is missing; required as the single source of truth for the 45-day syllabus schedule.
3. `docs/syllabus_physics.md`, `docs/syllabus_chemistry.md`, `docs/syllabus_biology.md` are missing; required for chapter topic checklists.
4. `docs/original_protocol.md` is missing.
5. The existing JSON files (`game_rules.json`, `resources.json`, `system_messages.json`, `workouts.json`) are currently located in the root directory instead of the `config/` subfolder.

---

## Key Decisions Made
1. **Engine Purity**: All progression formulas, daily quest generation, and lazy day evaluation are kept strictly pure in `src/engine/` without UI or Next.js imports to ensure full testability via Vitest and future backend compatibility.
2. **Wall-Clock Timers**: The 50-minute focus session timer and 3-hour Boss Raid timer rely strictly on wall-clock timestamps (`Date.now() - started_at`) rather than interval ticks, ensuring 100% resilience across page reloads, tab switches, and mobile sleep.
3. **Append-Only Ledgers**: `xp_ledger` and `mp_ledger` are strictly append-only. Balances, level, and ranks are derived aggregates to eliminate state drift and data loss.
4. **Lazy Day Evaluation**: Missed days are evaluated sequentially at app open / tab focus according to the 05:00 IST boundary without depending on background cron or server daemons.
