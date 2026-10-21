import Dexie, { Table } from 'dexie';
import {
  XPLedgerEntry,
  MPLedgerEntry,
  QuestLog,
  FocusSession,
  ChapterProgress,
  GrimoireEntry,
  SRSCard,
  MockResult,
  Settings
} from '@/src/types';

export class SoloLevelingDatabase extends Dexie {
  xp_ledger!: Table<XPLedgerEntry, number>;
  mp_ledger!: Table<MPLedgerEntry, number>;
  quest_logs!: Table<QuestLog, number>;
  focus_sessions!: Table<FocusSession, number>;
  chapter_progress!: Table<ChapterProgress, string>;
  grimoire!: Table<GrimoireEntry, number>;
  srs_cards!: Table<SRSCard, number>;
  mock_results!: Table<MockResult, number>;
  settings!: Table<Settings, string>;

  constructor() {
    super('SoloLevelingDB');
    this.version(1).stores({
      xp_ledger: '++id, date, source, created_at',
      mp_ledger: '++id, date, source, created_at',
      quest_logs: '++id, [date+quest_id], date, quest_id, is_completed',
      focus_sessions: '++id, date, subject, chapter_id, started_at, completed',
      chapter_progress: 'id, subject, status, boss_cleared, shadow_extracted',
      grimoire: '++id, subject, chapter_id, tag, created_at',
      srs_cards: '++id, chapter_id, subject, due_date, last_reviewed',
      mock_results: '++id, date, day_number, created_at',
      settings: 'key'
    });
  }
}

export const db = new SoloLevelingDatabase();
