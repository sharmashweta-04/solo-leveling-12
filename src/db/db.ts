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
  Settings,
  DayEvaluationRecord
} from '@/src/types';
import { SyncSnapshotData } from '@/src/engine/sync';

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
  day_evaluations!: Table<DayEvaluationRecord, number>;

  constructor(dbName: string = 'SoloLevelingDB') {
    super(dbName);
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

    this.version(2).stores({
      day_evaluations: 'day, evaluated_at, status, streak_after'
    });
  }
}

// Registry and per-user database management
const dbRegistry = new Map<string, SoloLevelingDatabase>();
let activeUserId: string | null = null;

// Try to initialize activeUserId from localStorage if in browser
if (typeof window !== 'undefined') {
  try {
    activeUserId = localStorage.getItem('solo_active_user_id');
  } catch {
    // Ignore in non-browser or privacy mode
  }
}

export function getDb(userId?: string | null): SoloLevelingDatabase {
  const dbName = userId && userId.trim() ? `SoloLevelingDB_${userId.trim()}` : 'SoloLevelingDB';
  if (!dbRegistry.has(dbName)) {
    dbRegistry.set(dbName, new SoloLevelingDatabase(dbName));
  }
  return dbRegistry.get(dbName)!;
}

export function getActiveUserId(): string | null {
  return activeUserId;
}

export function setActiveDbUser(userId?: string | null): SoloLevelingDatabase {
  activeUserId = userId && userId.trim() ? userId.trim() : null;
  if (typeof window !== 'undefined') {
    try {
      if (activeUserId) {
        localStorage.setItem('solo_active_user_id', activeUserId);
      } else {
        localStorage.removeItem('solo_active_user_id');
      }
    } catch {
      // Ignore
    }
  }
  return getDb(activeUserId);
}

/**
 * Proxy that delegates all table and method calls to the currently active database.
 * Ensures backward compatibility with all existing imports (`import { db } from '@/src/db/db'`).
 */
export const db: SoloLevelingDatabase = new Proxy({} as SoloLevelingDatabase, {
  get(_target, prop) {
    const active = getDb(activeUserId);
    const value = (active as any)[prop];
    if (typeof value === 'function') {
      return value.bind(active);
    }
    return value;
  }
});

/**
 * Helper to export the full database state as a JSON snapshot (format identical to Export Backup).
 */
export async function exportDatabaseToJson(database: SoloLevelingDatabase = db): Promise<SyncSnapshotData> {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    xp_ledger: await database.xp_ledger.toArray(),
    mp_ledger: await database.mp_ledger.toArray(),
    quest_logs: await database.quest_logs.toArray(),
    focus_sessions: await database.focus_sessions.toArray(),
    chapter_progress: await database.chapter_progress.toArray(),
    grimoire: await database.grimoire.toArray(),
    srs_cards: await database.srs_cards.toArray(),
    mock_results: await database.mock_results.toArray(),
    settings: await database.settings.toArray(),
    day_evaluations: await database.day_evaluations.toArray()
  };
}

/**
 * Helper to atomically import a snapshot into a target database with rollback protection.
 */
export async function importJsonToDatabase(
  data: SyncSnapshotData,
  database: SoloLevelingDatabase = db
): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));

    if (data.xp_ledger?.length) await database.xp_ledger.bulkAdd(data.xp_ledger);
    if (data.mp_ledger?.length) await database.mp_ledger.bulkAdd(data.mp_ledger);
    if (data.quest_logs?.length) await database.quest_logs.bulkAdd(data.quest_logs);
    if (data.focus_sessions?.length) await database.focus_sessions.bulkAdd(data.focus_sessions);
    if (data.chapter_progress?.length) await database.chapter_progress.bulkAdd(data.chapter_progress);
    if (data.grimoire?.length) await database.grimoire.bulkAdd(data.grimoire);
    if (data.srs_cards?.length) await database.srs_cards.bulkAdd(data.srs_cards);
    if (data.mock_results?.length) await database.mock_results.bulkAdd(data.mock_results);
    if (data.settings?.length) await database.settings.bulkAdd(data.settings);
    if (data.day_evaluations?.length) await database.day_evaluations.bulkAdd(data.day_evaluations);
  });
}
