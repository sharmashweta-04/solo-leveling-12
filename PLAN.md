# Solo Leveling Class 12 PCB Dungeon - Master Architecture & Implementation Plan

## 1. Product Understanding (in 10 lines or fewer)
1. A single-user, mobile-first gamified revision PWA for a Class 12 PCB student covering all 37 chapters in 45 days (2026-11-01 to 2026-12-15).
2. Styled as the Solo Leveling "System": dark holographic aesthetic, electric-blue glowing borders, monospace headers, and system chimes.
3. Chapters are 37 Dungeon Gates across 3 wings (Physics, Chemistry, Biology); errors are Grimoire entries; defeated weaknesses become extracted Shadows.
4. Daily quest loop consists of 50-min focus blocks, battle exercises, grimoire & night reviews, physical training/recovery, and sleep logs.
5. Dual append-only ledgers: XP Ledger drives Player Level and Rank (E to S); MP Ledger purchases limited screen time keys (max 60m/day).
6. Weekly 3-hour Boss Raids are timed in-app while actual mock tests are taken in the Physics Wallah (PW) app.
7. Gate Boss Tests (>= 75% score out of 20) extract Shadows and trigger spaced repetition reviews at D+1, D+3, D+7, and D+14.
8. Daily evaluation is strictly lazy: evaluates past missed days upon app open without any server cron, applying penalties and rest tokens.
9. 100% free, local-first stack: Next.js (App Router), TypeScript, Tailwind CSS, Dexie (IndexedDB), Framer Motion, Recharts, and Vitest.
10. Privacy & resilience guaranteed: zero backend, no external auth, JSON export/import backup, and offline PWA capability.

---

## 2. Proposed Folder Structure
```text
solo-leveling-12/
├── config/
│   ├── game_rules.json            # Game numbers, ranks, XP, MP, penalties, shop
│   ├── plan_45days.json           # Day-by-day 45-day syllabus schedule
│   ├── resources.json             # Chapter video links & notes
│   ├── system_messages.json       # All System dialogues, popups & toasts
│   └── workouts.json              # Physical training and recovery routines
├── docs/
│   ├── syllabus_physics.md        # 14 Physics chapters & topic checklists
│   ├── syllabus_chemistry.md      # 10 Chemistry chapters & topic checklists
│   ├── syllabus_biology.md        # 13 Biology chapters & topic checklists
│   └── original_protocol.md       # Founding study protocol document
├── public/
│   ├── icons/                     # PWA icons (192x192, 512x512)
│   ├── notes/                     # Local static chapter notes (optional PDFs)
│   └── manifest.json              # Web app manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with font, viewport & system theme
│   │   ├── page.tsx               # / (System Window Dashboard)
│   │   ├── focus/page.tsx         # /focus (50-minute study session timer)
│   │   ├── quests/page.tsx        # /quests (Daily quest board & check-in)
│   │   ├── dungeon/page.tsx       # /dungeon (37-gate dungeon map across 3 wings)
│   │   ├── gate/[id]/page.tsx     # /gate/[id] (Topics checklist, resources, boss test)
│   │   ├── shadows/page.tsx       # /shadows (Extracted Shadow Army vault)
│   │   ├── shop/page.tsx          # /shop (MP exchange, screen keys & countdown)
│   │   ├── raid/page.tsx          # /raid (3-hour mock timer & PW score form)
│   │   ├── grimoire/page.tsx      # /grimoire (Error notebook & mistake logger)
│   │   ├── review/page.tsx        # /review (Spaced repetition flashcards)
│   │   ├── stats/page.tsx         # /stats (Hunter radar, XP graph & mock trends)
│   │   └── settings/page.tsx      # /settings (Mode, backup, rules, reset)
│   ├── components/
│   │   ├── common/
│   │   │   ├── SystemHeader.tsx   # Top status bar (Rank badge, Level, XP bar)
│   │   │   ├── StatBar.tsx        # Holographic INT/VIT/AGI/PER progress bar
│   │   │   ├── Modal.tsx          # System popup modal with glowing border
│   │   │   ├── SystemToast.tsx    # Toast notifications from system_messages.json
│   │   │   └── AudioChime.ts      # Web Audio API procedural sound synthesizer
│   │   ├── dashboard/
│   │   │   ├── PlayerCard.tsx     # Hunter identity, Level, Rank multiplier
│   │   │   ├── TodayPlanCard.tsx  # Today's chapters from 45-day schedule
│   │   │   ├── QuestListCard.tsx  # Daily quest overview with completion pills
│   │   │   └── StatRadar.tsx      # Hexagonal / radar chart of 4 attributes
│   │   ├── focus/
│   │   │   ├── HologramTimer.tsx  # Circular animated SVG countdown
│   │   │   ├── SubjectSelect.tsx  # PHY/CHEM/BIO and chapter selector
│   │   │   └── DistractModal.tsx  # Tab switch / visibility change warning
│   │   ├── dungeon/
│   │   │   ├── WingTabs.tsx       # Physics (Blue), Chemistry (Purple), Biology (Green)
│   │   │   ├── GateCard.tsx       # Gate node (locked / in_progress / cleared / shadow)
│   │   │   └── BossTestModal.tsx  # 20-question self-report score submission
│   │   ├── raid/
│   │   │   ├── RaidTimer.tsx      # 3-hour persistent timer
│   │   │   └── MockResultForm.tsx # Physics Wallah test result entry form
│   │   ├── grimoire/
│   │   │   ├── MistakeCard.tsx    # Question, my mistake, correct approach
│   │   │   └── AddMistakeModal.tsx# Form to log new mistake into Grimoire
│   │   ├── review/
│   │   │   ├── SRSCardView.tsx    # Flashcard flip animation
│   │   │   └── SRSControls.tsx    # Again / Hard / Good / Easy grading buttons
│   │   ├── shop/
│   │   │   ├── KeyItemCard.tsx    # Bronze / Silver / Gold key purchasing
│   │   │   └── UnlockTimer.tsx    # Screen unlock countdown with alert
│   │   └── intro/
│   │       ├── TypewriterIntro.tsx# Fullscreen typed intro with sound chimes
│   │       └── OnboardingModal.tsx# Honesty Oath, mode toggle, start date confirm
│   ├── db/
│   │   ├── index.ts               # Dexie database class & versioned schema
│   │   ├── seed.ts                # Plan & syllabus parser/loader into Dexie
│   │   └── backup.ts              # Full database JSON export/import logic
│   ├── engine/                    # PURE TypeScript business logic (Zero UI dependencies)
│   │   ├── xp.ts                  # XP calculation, rank & streak multipliers
│   │   ├── level.ts               # Level calculation from total XP
│   │   ├── mana.ts                # MP calculation, daily cap, MP->XP conversion
│   │   ├── rank.ts                # Rank determination (E to S) & demotion rules
│   │   ├── quests.ts              # Daily quest generator by plan day & mode
│   │   ├── evaluateDay.ts         # Lazy day evaluation & penalty engine
│   │   ├── time.ts                # Asia/Kolkata game day & 05:00 boundary math
│   │   ├── srs.ts                 # Spaced repetition scheduler (D+1, 3, 7, 14)
│   │   └── __tests__/             # Unit tests executed by Vitest
│   │       ├── xp.test.ts
│   │       ├── level.test.ts
│   │       ├── mana.test.ts
│   │       ├── rank.test.ts
│   │       ├── quests.test.ts
│   │       ├── evaluateDay.test.ts
│   │       └── time.test.ts
│   ├── hooks/
│   │   ├── useGameDay.ts          # Reactive current game day & countdown
│   │   ├── usePlayerState.ts      # Reactive state: XP, MP, Level, Rank, Stats
│   │   ├── useFocusTimer.ts       # Wall-clock resilient timer surviving reloads
│   │   └── useSystemAudio.ts      # Sound effects trigger hooks
│   └── types/
│       ├── database.ts            # Dexie table models
│       ├── game.ts                # Game engine rules & ledger interfaces
│       └── syllabus.ts            # Syllabus chapters, topics & resources
├── AGENTS.md
├── PLAN.md
├── PROGRESS.md
├── PROMPTS.md
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vitest.config.ts
```

---

## 3. Dexie Database Tables with Fields and Indexes
Database Name: `SoloLevelingDungeonDB`, Version: `1`.

### 1. `xp_ledger`
Append-only log of all XP awards, penalties, and conversions.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `timestamp: number` (epoch ms)
  - `game_day: number` (1 to 45)
  - `date_str: string` (YYYY-MM-DD in IST)
  - `amount: number` (e.g. +40, +60, -150)
  - `source: string` (`'focus_block'` | `'battle_exercise'` | `'grimoire_review'` | `'night_review'` | `'physical'` | `'all_clear_bonus'` | `'sleep_7h'` | `'raid_bonus'` | `'mp_conversion'` | `'penalty_failed_day'` | `'penalty_bypass'`)
  - `description: string`
  - `multiplier: number` (e.g. 1.05 for C-rank, plus streak bonus)
- **Indexes**: `++id, game_day, source, timestamp`

### 2. `mp_ledger`
Append-only log of all MP earnings, shop spending, and midnight conversions.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `timestamp: number`
  - `game_day: number`
  - `date_str: string`
  - `amount: number` (positive for earnings, negative for purchases/debits)
  - `source: string` (`'focus_block'` | `'battle_exercise'` | `'grimoire_review'` | `'night_review'` | `'physical'` | `'all_clear_bonus'` | `'shop_key_bronze'` | `'shop_key_silver'` | `'shop_key_gold'` | `'mp_conversion_debit'` | `'penalty_shadow_cleaning'`)
  - `description: string`
- **Indexes**: `++id, game_day, source, timestamp`

### 3. `quest_logs`
Records completion status of daily quests per game day.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `game_day: number`
  - `date_str: string`
  - `quest_type: string` (`'focus_block'` | `'battle_exercise'` | `'grimoire_review'` | `'night_review'` | `'physical'` | `'sleep_7h'`)
  - `subject?: string` (`'PHY'` | `'CHEM'` | `'BIO'`)
  - `target_count: number` (e.g. 3 for PHY blocks in Normal mode)
  - `completed_count: number`
  - `status: string` (`'pending'` | `'completed'` | `'waived_rest'`)
  - `completed_at?: number`
  - `details?: any`
- **Indexes**: `++id, [game_day+quest_type], game_day, status`

### 4. `focus_sessions`
Detailed log of individual 50-minute study blocks.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `game_day: number`
  - `subject: string` (`'PHY'` | `'CHEM'` | `'BIO'`)
  - `chapter_id: string` (e.g. `'P1'`)
  - `target_duration_minutes: number` (default 50)
  - `elapsed_seconds: number`
  - `started_at: number`
  - `ended_at?: number`
  - `interruption_count: number`
  - `completed: boolean`
  - `valid: boolean` (elapsed >= 90% of target)
- **Indexes**: `++id, game_day, subject, chapter_id, completed`

### 5. `chapter_progress`
Status and metadata for all 37 syllabus chapters.
- **Fields**:
  - `chapter_id: string` (Primary Key, e.g. `'P1'`, `'C4'`, `'B11'`)
  - `subject: string` (`'PHY'` | `'CHEM'` | `'BIO'`)
  - `title: string`
  - `order: number`
  - `status: string` (`'locked'` | `'in_progress'` | `'cleared'` | `'shadow'`)
  - `completed_topics: string[]`
  - `notes: string`
  - `boss_score?: number` (score out of 20)
  - `boss_tested_at?: number`
  - `shadow_extracted: boolean`
  - `shadow_extracted_at?: number`
- **Indexes**: `chapter_id, subject, status, shadow_extracted`

### 6. `grimoire`
Error notebook tracking student mistakes and corrections.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `created_at: number`
  - `game_day: number`
  - `subject: string`
  - `chapter_id: string`
  - `question_text: string`
  - `mistake_reason: string`
  - `correct_approach: string`
  - `tags: string[]`
  - `mastered: boolean`
- **Indexes**: `++id, subject, chapter_id, game_day, mastered`

### 7. `srs_cards`
Spaced repetition flashcards generated from mistakes and weak topics.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `grimoire_id?: number`
  - `chapter_id: string`
  - `subject: string`
  - `front_prompt: string`
  - `back_solution: string`
  - `interval_index: number` (0=D+1, 1=D+3, 2=D+7, 3=D+14)
  - `interval_days: number`
  - `due_game_day: number`
  - `last_reviewed_at?: number`
  - `repetitions: number`
  - `status: string` (`'learning'` | `'review'` | `'mastered'`)
- **Indexes**: `++id, due_game_day, chapter_id, subject, status, grimoire_id`

### 8. `mock_results`
Self-reported results of 3-hour Boss Raids and Phase 3 mocks taken in PW app.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `game_day: number`
  - `date_str: string`
  - `raid_title: string`
  - `total_marks: number`
  - `attempted: number`
  - `correct: number`
  - `wrong: number`
  - `physics_marks: number`
  - `chemistry_marks: number`
  - `biology_marks: number`
  - `time_taken_minutes: number`
  - `notes: string`
  - `submitted_at: number`
- **Indexes**: `++id, game_day, submitted_at`

### 9. `day_evaluations`
Audit log of lazy day evaluations.
- **Fields**:
  - `game_day: number` (Primary Key, 1 to 45)
  - `evaluated_at: number`
  - `status: string` (`'perfect_all_clear'` | `'cleared'` | `'failed'` | `'rest_token_used'`)
  - `xp_awarded: number`
  - `penalties_applied: number`
  - `mp_converted: number`
  - `streak_after: number`
  - `notes: string`
- **Indexes**: `game_day, status, evaluated_at`

### 10. `shop_unlocks`
Records active and consumed screen time keys.
- **Fields**:
  - `id?: number` (auto-increment primary key)
  - `game_day: number`
  - `key_id: string` (`'bronze'` | `'silver'` | `'gold'` | `'raid_reward'`)
  - `minutes: number`
  - `started_at: number`
  - `expires_at: number`
  - `status: string` (`'active'` | `'expired'`)
- **Indexes**: `++id, game_day, expires_at, status`

### 11. `settings`
Key-value store for app configuration and persistent runtime states.
- **Fields**:
  - `key: string` (Primary Key)
  - `value: any`
- **Standard Keys**:
  - `onboarding_complete`: boolean
  - `player_mode`: `'normal'` | `'easy'`
  - `start_date`: `"2026-11-01"`
  - `rest_tokens_remaining`: number (initial: 3)
  - `current_streak`: number
  - `emergency_lockout_active`: boolean
  - `last_evaluated_game_day`: number
  - `sound_enabled`: boolean

---

## 4. Pure Engine Functions (`src/engine/`) & Unit Tests
All engine functions are pure TypeScript functions located in `src/engine/` without any React or UI dependencies.

### 1. `xp.ts`
- **`calculateTotalXP(entries: XpLedgerEntry[]): number`**
  - Inputs: Array of XP ledger entries.
  - Outputs: Total XP (sum of amounts, never below 0).
  - Tests: Empty array -> 0; positive entries; mixed positive & penalties; ensures negative total clamps to 0.
- **`computeXpWithMultipliers(baseXP: number, rankMultiplier: number, streakDays: number, streakBonusPerDay: number, streakCap: number): { totalXP: number, rankBonus: number, streakBonus: number }`**
  - Inputs: Base XP, rank multiplier (e.g. 1.05), streak count, bonus per day (0.02), streak cap (0.20).
  - Outputs: Rounded total XP awarded and breakdown.
  - Tests: Base 40 XP at Rank E with 0 streak -> 40; Rank C (1.05) with 5 streak (+10%) -> 40 * (1 + 0.05 + 0.10) = 46 XP; Streak capping at 10+ days (20%).

### 2. `level.ts`
- **`calculateLevel(totalXP: number, base: number = 50): { level: number, currentLevelXP: number, nextLevelXP: number, progressFraction: number }`**
  - Formula: `level = Math.floor(Math.sqrt(total_xp / base)) + 1`
  - Inputs: Total XP, base coefficient (50).
  - Outputs: Level number, XP threshold for current level, XP threshold for next level, progress fraction [0..1].
  - Tests: 0 XP -> Level 1; 49 XP -> Level 1; 50 XP -> Level 2; 200 XP -> Level 3; 29,000 XP -> Level 25. Correct nextLevelXP calculation.

### 3. `rank.ts`
- **`calculateRank(totalXP: number, ranksConfig: RankConfig[]): { rank: string, title: string, multiplier: number, nextRankXP: number | null, progress: number }`**
  - Inputs: Total XP, array of rank configs from `game_rules.json`.
  - Outputs: Current rank (E, D, C, B, A, S), title, multiplier, XP needed for next rank, progress ratio.
  - Tests: 0 to 2500 -> E; 2501 to 7000 -> D; 7001 to 13000 -> C; 13001 to 20000 -> B; 20001 to 28000 -> A; 28001+ -> S. Progress to next rank handles S-Rank cap.

### 4. `mana.ts`
- **`calculateManaBalance(mpEntries: MpLedgerEntry[], dailyCap: number, todayGameDay: number): { availableMP: number, todayEarnedMP: number, capHeadroom: number }`**
  - Inputs: Array of MP ledger entries, daily cap (90), current game day.
  - Outputs: Total usable MP balance, MP earned today, remaining MP earnable today before cap.
  - Tests: Starting balance; today's earnings hitting 90 cap; blocking excess MP above 90; deductions for shop purchases; prevents negative MP balance.
- **`convertUnspentMPToXP(unspentMP: number, rate: number = 5): { xpEarned: number, mpDeducted: number }`**
  - Inputs: Unspent MP balance, conversion rate (5 XP per 1 MP).
  - Outputs: XP to credit, MP to debit.
  - Tests: 0 MP -> 0 XP; 20 MP -> 100 XP; negative MP clamped to 0.

### 5. `quests.ts`
- **`generateQuestsForDay(gameDay: number, mode: 'normal' | 'easy', planDay: PlanDayConfig, workouts: WorkoutsConfig): QuestDefinition[]`**
  - Inputs: Current game day number, user mode ('normal' | 'easy'), scheduled plan day object, workouts configuration.
  - Outputs: Array of concrete quest definitions for the day:
    - Focus blocks: Normal = PHY 3, CHEM 2, BIO 3 (8 total); Easy = PHY 2, CHEM 2, BIO 2 (6 total).
    - Battle Exercise: 1 per subject (3 total).
    - Grimoire Review: 1.
    - Night Review: 1.
    - Physical Quest: Exercise list from `workouts.json` (Training routine vs Recovery routine based on weekly pattern).
    - Sleep Log: 1 (Target >= 7 hours).
  - Tests: Normal mode yields 8 focus blocks; Easy mode yields 6 blocks; Physical quest alternates training/recovery without hardcoded text.

### 6. `time.ts`
- **`getGameDayInfo(now: Date, planStartDateStr: string = "2026-11-01"): GameDayInfo`**
  - Inputs: Current device Date, plan start date.
  - Rule: Game day in `Asia/Kolkata` (+05:30) starts at 05:00 and expires at 04:59:59 next morning. Daily quests expire at 23:59.
  - Outputs: `gameDay: number | null` (1 to 45), `isBeforeStart: boolean`, `daysUntilStart: number`, `isAfterPlan: boolean`, `dayStartTime: Date`, `dayResetTime: Date`, `questExpireTime: Date`.
  - Tests:
    - 2026-10-31 12:00 IST -> `isBeforeStart: true, daysUntilStart: 1, gameDay: null`.
    - 2026-11-01 04:59 IST -> Before start (05:00 boundary).
    - 2026-11-01 05:00 IST -> Day 1 starts.
    - 2026-11-01 23:50 IST -> Day 1 (quests active).
    - 2026-11-02 02:30 IST -> Day 1 late night (before 05:00 reset).
    - 2026-11-02 05:00 IST -> Day 2 starts.
    - 2026-12-16 05:01 IST -> `isAfterPlan: true`.

### 7. `evaluateDay.ts`
- **`evaluateDay(dayToEvaluate: number, logs: DayLogs, rules: GameRulesConfig, currentStreak: number, restTokensRemaining: number, recentDayEvaluations: DayEvaluation[]): DayEvaluationResult`**
  - Inputs: Day number, completed quest logs, game rules, streak, rest tokens remaining, last 7 days history.
  - Outputs: Ledger entries to append (XP/MP), updated streak, rest tokens used (boolean), emergency lockout triggered (boolean), day status.
  - Tests:
    - Perfect day: All quests done -> streak increments by 1, all-clear bonus applied, unspent MP converted to XP at 5:1.
    - Failed day with Rest Token used -> penalty waived, streak preserved, tokens decremented.
    - Failed day without token -> -150 XP penalty, streak reset to 0, next day MP set to 0 (Shadow Cleaning).
    - 2 failed days in 7-day rolling window -> `emergencyLockoutTriggered: true`.

### 8. `srs.ts`
- **`calculateNextSRS(card: SRSCard, grade: 'again' | 'hard' | 'good' | 'easy', intervals: number[] = [1, 3, 7, 14], currentGameDay: number): SRSUpdateResult`**
  - Inputs: Current card record, grade selected, interval config [1, 3, 7, 14], current game day.
  - Outputs: Next interval index, next due game day, new status (`'learning'` | `'review'` | `'mastered'`).
  - Tests:
    - 'Again' resets interval index to 0 (due next day: `currentGameDay + 1`).
    - 'Hard' repeats the current interval.
    - 'Good' advances interval index (0 -> 1 -> 2 -> 3).
    - If at interval index 3 (14 days) and 'Good' or 'Easy' is chosen -> status becomes `'mastered'`.

---

## 5. Page List & Main Components

| Route | Page Name | Key Components |
|---|---|---|
| `/` | System Window (Dashboard) | `SystemHeader` (Rank, Level, XP bar), `PlayerCard`, `StatRadar` (INT, VIT, AGI, PER), `StreakBadge`, `TodayPlanCard` (current PHY/CHEM/BIO chapters), `QuestListCard` (quick actions), `SystemMessageBanner` |
| `/focus` | Focus Chamber | `SubjectSelect` (Subject & Chapter picker), `HologramTimer` (SVG 50m circular timer), `DistractModal` (visibility warning), `SessionSummaryModal` (XP/MP confirmation) |
| `/quests` | Daily Quest Board | `QuestHeader` (timer to 23:59), `QuestCard` (interactive completion), `PhysicalWorkoutDetail` (circuit from workouts.json), `SleepLogModal` (>=7h bonus check), `AllClearBonusBanner` |
| `/dungeon` | 37-Gate Dungeon Map | `WingTabs` (Physics Blue, Chemistry Purple, Biology Green), `GateGrid` (37 cards showing status: locked / in_progress / cleared / shadow), `DungeonProgressSummary` |
| `/gate/[id]` | Chapter Gate | `GateHeader` (Rank, title, status), `TopicChecklist` (checkboxes for syllabus topics), `ResourcesList` (video lectures with timestamps, notes link), `BossTestModal` (20-question self-report score form) |
| `/shadows` | Shadow Army Vault | `ShadowArmyHeader` (Extracted count: X / 37), `ShadowCardGrid` (extracted chapter shadows, extraction date, mastery badge) |
| `/shop` | Hunter's Mana Shop | `ManaBalanceCard` (available MP, earned today vs 90 cap), `KeyItemCard` (Bronze 20m, Silver 45m, Gold 60m), `DailyScreenCapBar` (max 60m/day), `UnlockCountdown` |
| `/raid` | Weekly Boss Raid | `RaidBriefing` (syllabus covered, boss rank), `RaidTimer` (3-hour wall-clock timer surviving reloads), `PWInstructions` (directions to open PW app), `MockResultForm` (marks, accuracy, time), `RaidRewardModal` (+500 XP, 90m Leisure Gate) |
| `/grimoire` | Grimoire (Error Notebook) | `GrimoireHeader` (filter by subject, chapter, tag), `AddMistakeModal` (form: question, my mistake, correct approach, tags), `MistakeCardList` (mistake logs with card status) |
| `/review` | Spaced Repetition Review | `DueCountHeader`, `SRSCardView` (holographic 3D flip card: Front prompt, Back solution & mistake explanation), `SRSControls` (Again, Hard, Good, Easy buttons) |
| `/stats` | Hunter Status & Analytics | `HunterSummary`, `StatRadarChart` (INT/VIT/AGI/PER), `XPProgressionChart` (Recharts area graph), `MockTrendChart` (scores across 6 raids), `HoursPerSubjectChart`, `WeakestChaptersList` |
| `/settings` | System Settings & Backup | `ModeToggle` (Normal 8 vs Easy 6), `RestTokensDisplay` (3 tokens), `ReplayIntroButton`, `GameRulesViewer` (read-only rules), `BackupRestoreSection` (JSON Export & Import), `ResetConfirmModal` |

---

## 6. Lazy Day Evaluation: Mechanics & Edge Cases
Because the app runs completely locally without a backend server or cron daemon, day evaluation is triggered **lazily on every app open or browser tab resume**.

### Step-by-Step Flow:
1. **Trigger**: When the app mounts (or `visibilitychange` detects active tab), invoke `runLazyEvaluation()`.
2. **Current Day Resolution**: Call `getGameDayInfo(new Date(), startDate)` using `Asia/Kolkata` time (+05:30):
   - Current game day starts at 05:00:00 and ends at 04:59:59 the following morning.
   - If current time is between 00:00 and 04:59, the current game day corresponds to the day that started yesterday at 05:00.
3. **Lookup Evaluated State**: Read `last_evaluated_game_day` from Dexie `settings` table.
4. **Identify Unevaluated Days**:
   - Let `targetDay = currentGameDay - 1`.
   - If `last_evaluated_game_day < targetDay`, evaluate all days `d` from `last_evaluated_game_day + 1` up to `targetDay` in chronological sequence.
5. **Evaluate Each Past Day `d`**:
   - Query `quest_logs` and `focus_sessions` for day `d`.
   - Check if an explicit Rest Day Token was consumed for day `d`.
   - **Case A: All Daily Quests Cleared**:
     - Append `all_clear_bonus` (+60 XP, +10 MP) to `xp_ledger` and `mp_ledger` if not yet awarded.
     - Increment `current_streak` by 1 in `settings`.
     - Calculate unspent MP at 23:59 on day `d` and convert to XP (1 MP = 5 XP). Write credit to `xp_ledger` and debit to `mp_ledger`.
     - Record `status: 'perfect_all_clear'` in `day_evaluations`.
   - **Case B: Rest Day Token Active**:
     - Waive penalties; do not reset streak.
     - Convert unspent MP to XP.
     - Decrement `rest_tokens_remaining` in `settings`.
     - Record `status: 'rest_token_used'` in `day_evaluations`.
   - **Case C: Quests Incomplete & No Rest Token**:
     - Append failed quest penalty (-150 XP) to `xp_ledger`.
     - Reset `current_streak` to 0 in `settings`.
     - Mark Shadow Cleaning: write ledger debit setting next day MP to 0, and record 15-minute chore requirement.
     - Query `day_evaluations` for the last 7 days: if >= 2 failed days exist in that 7-day window, activate `emergency_lockout_active = true` (locks shop & screen time until next Boss Raid result is logged).
     - Record `status: 'failed'` in `day_evaluations`.
6. **Update Progress**: Set `last_evaluated_game_day = targetDay` in Dexie.
7. **User Notification**: If any days were evaluated, present the `[ SYSTEM ] Daily Evaluation Summary` modal on screen detailing XP changes, streak updates, and penalty notices.

### Edge Cases Handled:
- **App closed for several days (e.g. 5 days)**: The loop processes days sequentially (Day 4, 5, 6, 7, 8). Penalties are applied accurately for each missed day, the streak resets on the first missed day, and Emergency Lockout triggers if 2 failures occur within 7 days.
- **Opening at 03:00 AM**: 03:00 AM belongs to the *current* game day (day boundary is 05:00 AM). The day is still active and has not expired; lazy evaluation will NOT evaluate today until 05:00 AM arrives.
- **Before Day 1 (before 2026-11-01 05:00 IST)**: `currentGameDay` is null (`isBeforeStart: true`). Lazy evaluation immediately exits without performing any checks. The dashboard displays the countdown banner: `[ SYSTEM ] The Gate opens in X days. Prepare yourself.`
- **After Day 45 (after 2026-12-15 05:00 IST)**: Evaluates up to Day 45. Quests are locked, and the dashboard renders the campaign conclusion message: `[ SYSTEM ] Day 45. The Monarch's Eve. Rest well, Player.`
- **System Clock Manipulation / Tampering**: Evaluations only advance forward (`last_evaluated_game_day` is strictly monotonically increasing). Evaluating future days beyond the verified game calendar is prevented.

---

## 7. Focus Timer: Surviving Reloads, Tab Switches & Phone Sleep
1. **Wall-Clock Timestamp Architecture**:
   - The timer never relies on accumulative `setInterval` ticks.
   - When a 50-minute block starts, write an active session to Dexie and `localStorage`:
     ```json
     {
       "session_id": "focus_1730419200000",
       "subject": "PHY",
       "chapter_id": "P1",
       "started_at": 1730419200000,
       "target_duration_ms": 3000000,
       "status": "running"
     }
     ```
   - On every animation frame or UI interval (e.g. every 500ms), the UI calculates remaining time as:
     `remaining = target_duration_ms - (Date.now() - started_at)`.
2. **Surviving Page Reloads**:
   - On mount, `useFocusTimer` checks for an active session in Dexie/`localStorage`. If present, it computes remaining time based on `Date.now() - started_at` and resumes displaying the countdown immediately.
3. **Surviving Backgrounding and Phone Sleep**:
   - When the user locks their phone or switches apps, mobile browsers sleep/throttle JavaScript timers.
   - When the user unlocks the phone or returns, `Date.now() - started_at` accurately reflects the exact elapsed wall-clock time, jumping to the true progress.
4. **Tab Switch & Distraction Tracking**:
   - Listen to the Page Visibility API (`document.addEventListener("visibilitychange")`).
   - If `document.hidden` becomes true while a block is active:
     - Increment `interruption_count`.
     - When the tab becomes visible again, display a holographic warning modal: `[ WARNING ] Distraction detected. The Monarch's focus must not waver.`
5. **Strict 90% Completion Rule**:
   - Focus session completion is strictly validated in `src/engine/quests.ts`:
     `elapsed_seconds >= 0.90 * (50 * 60)` (at least 45 minutes).
   - Early manual completion before 45 minutes aborts the block with 0 XP and 0 MP.

---

## 8. Technical Risks & Mitigation Strategies

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **IndexedDB Eviction by Mobile OS** | Potential loss of XP ledgers, notes and mock history if phone runs low on storage. | 1. Call `navigator.storage.persist()` on onboarding.<br>2. Provide 1-click JSON Export / Import in Settings.<br>3. Automatically prompt user to download JSON backup after every weekly Boss Raid. |
| **Mobile Browser Timer Throttling** | Timer freezing when screen locks or browser tab sleeps. | Base all timers on wall-clock timestamp deltas (`Date.now() - started_at`) rather than tick intervals. |
| **Timezone Inconsistencies (Device Travel)** | Wrong day boundary if device changes time zone. | Force all date-to-day computations to calculate offset strictly relative to UTC+05:30 (`Asia/Kolkata`), guaranteeing 05:00 IST boundary regardless of device location. |
| **State Drift & Balance Corruption** | Corrupted XP or MP balances. | Ledger is strictly append-only. Balances, level, and rank are computed purely as derived sums through the engine. |
| **Mobile Screen Constraints (380px)** | UI elements breaking, horizontal scrollbars, or cramped buttons. | Mobile-first CSS design with Tailwind. Large tap targets (min 44px). Test all components explicitly at 380px viewport width. |
| **Missing Resource Links (null URLs)** | Broken links or crash when rendering chapter resources. | Safe rendering: if `url === null`, display a clean "Add link" button and placeholder without breaking the UI. |

---

## 9. Build Order (Matching the 12 Prompts)

- [ ] **Prompt 1: Understand and Plan (No Code)**
  - Finalize `PLAN.md`, `PROGRESS.md`, conflicts, gaps, and clarifying questions.
- [ ] **Prompt 2: Scaffold, Theme, and Data**
  - Scaffold Next.js App Router, TypeScript, Tailwind CSS with electric-blue holographic System theme.
  - Setup Dexie database tables.
  - Write seed loader for 37 chapters and 45-day plan.
  - Implement `currentGameDay()` helper in `Asia/Kolkata` with 05:00 boundary.
  - Create debug page listing 37 chapters and 45 plan days.
- [ ] **Prompt 3: Intro Screen (System Message)**
  - Full-screen typewriter intro with Web Audio API system chimes.
  - Onboarding flow: Honesty Oath, Normal/Easy mode selection, start date confirmation.
  - Pre-Day 1 countdown display on dashboard.
  - Add "Replay Intro" action in Settings.
- [ ] **Prompt 4: Engine with Vitest Tests**
  - Implement pure TypeScript engine in `src/engine/`: `xp.ts`, `level.ts`, `mana.ts`, `rank.ts`, `quests.ts`, `evaluateDay.ts`, `time.ts`, `srs.ts`.
  - Comprehensive unit test suite in Vitest: all-clear day, failed day, rank/level boundaries, 90 MP cap, Easy mode.
- [ ] **Prompt 5: Dashboard, Quests, Focus Timer**
  - Build `/` (System Window): Rank badge, Level, XP bar, 4 stat bars (INT, VIT, AGI, PER), streak badge, today's chapters, quest list.
  - Build `/focus`: 50-minute timer with subject/chapter selector, wall-clock persistence, 90% completion rule, distraction counter.
  - Integrate `workouts.json` into physical quest.
  - Add Framer Motion level-up and rank-up animations.
- [ ] **Prompt 6: Shop, Lazy Day Evaluation, Rest Tokens**
  - Build `/shop`: Bronze, Silver, Gold keys, MP balance, 60-min daily screen cap, active countdown.
  - Implement lazy day evaluation engine on app mount with summary modal.
  - Add 3 Rest Day Tokens, emergency lockout, bypass penalties, and sleep log.
- [ ] **Prompt 7: Gate Map, Chapter Pages, Resources, Boss Test**
  - Build `/dungeon`: 37 gates across 3 wings (Physics blue, Chemistry purple, Biology green) with states.
  - Build `/gate/[id]`: syllabus topic checklists, video links, notes field, self-reported 20Q Boss Test form.
  - Extract Shadow when score >= 75% with `[ ARISE ]` animation, scheduling SRS reviews.
  - Build `/shadows` vault.
- [ ] **Prompt 8: Boss Raid (Mock Tests in PW App)**
  - Build `/raid`: Raid brief, 3-hour wall-clock timer, PW app instructions, result submission form.
  - Award +500 XP and 90-min Monarch's Leisure Gate upon submission.
  - Implement mock trend chart on `/stats` using Recharts.
- [ ] **Prompt 9: Grimoire and Spaced Repetition**
  - Build `/grimoire`: mistake notebook (subject, chapter, question, my mistake, correct approach, tags).
  - Build `/review`: SRS flashcard queue with intervals D+1, D+3, D+7, D+14 and Again/Hard/Good/Easy grading.
  - Quest integration: clearing due cards completes Grimoire Review quest.
- [ ] **Prompt 10: Stats, Settings, Backup**
  - Build `/stats`: XP progression chart, INT/VIT/AGI/PER radar chart, hours per subject, streak history, weakest chapters.
  - Build `/settings`: Normal/Easy toggle, read-only game rules, JSON Export/Import backup, factory reset.
- [ ] **Prompt 11: PWA and Deployment**
  - Configure PWA manifest, service worker, app icons, and offline caching.
  - Production build verification and zero-error audit.
  - Step-by-step free deployment guide for Vercel / Cloudflare Pages.
- [ ] **Prompt 12: Final QA and Simulation**
  - 45-day simulation script for 3 archetypes (Perfect, Average, Slacker) verifying final rank, level, XP, and penalties.
  - End-to-end verification at 380px width, zero console errors, offline mode, and data persistence.
