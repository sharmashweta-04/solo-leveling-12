# Solo Leveling: Class 12 PCB Dungeon

## Overview
A single-user, mobile-first gamified study tracker that turns a 45-day Class 12 NCERT PCB revision plan into a Solo Leveling RPG. Built as a local-first PWA using Next.js, TypeScript, and Tailwind CSS.

- **Start Date**: 2026-11-01 (Day 1)
- **End Date**: 2026-12-15 (Day 45)
- **Subjects**: Physics (14 ch), Chemistry (10 ch), Biology (13 ch) = 37 total Gates
- **Stack**: Next.js (App Router) + TypeScript + Tailwind CSS + Dexie (IndexedDB)

## Architecture

See `PLAN.md` for the full architecture, Dexie schema, engine functions, and page list.

## Config Files (in `config/`)
| File | Purpose |
|------|---------|
| `game_rules.json` | All XP, MP, rank, penalty and shop numbers |
| `plan_45days.json` | Day-by-day 45-day schedule |
| `resources.json` | Chapter video links and notes |
| `system_messages.json` | All System dialogues and toasts |
| `workouts.json` | Physical training and recovery routines |

## Docs (in `docs/`)
| File | Purpose |
|------|---------|
| `syllabus_physics.md` | 14 Physics chapters + topic checklists |
| `syllabus_chemistry.md` | 10 Chemistry chapters + topic checklists |
| `syllabus_biology.md` | 13 Biology chapters + topic checklists |
| `original_protocol.md` | Founding study protocol |

## Pages
| Route | Description |
|-------|-------------|
| `/` | System Window (Dashboard): Rank, Level, XP, stats, today's plan, quests |
| `/focus` | 50-minute study session timer |
| `/quests` | Daily quest board |
| `/dungeon` | 37-gate dungeon map |
| `/gate/[id]` | Chapter gate: topics, videos, boss test |
| `/shadows` | Extracted shadow army vault |
| `/shop` | MP exchange for screen time |
| `/raid` | 3-hour boss raid timer + PW score form |
| `/grimoire` | Error notebook |
| `/review` | Spaced repetition flashcards |
| `/stats` | Analytics and progress charts |
| `/settings` | Mode, backup, export/import, reset |

## Game Rules Summary
- **XP Ledger**: Append-only. Rewards from quests, penalties from failures.
- **MP Ledger**: Append-only. Earns from quests, spends on screen time keys.
- **Level**: `floor(sqrt(totalXP / 50)) + 1`
- **Ranks**: E (0 XP) → D (2501) → C (7001) → B (13001) → A (20001) → S (28001)
- **Daily quests reset at 05:00 IST, expire at 23:59 IST**
- **Boss Raids**: Days 7, 14, 21, 28, 35, 42 (3h timer, result from PW app)

## Getting Started
```bash
npm install
npm run dev
```
Open http://localhost:3000
