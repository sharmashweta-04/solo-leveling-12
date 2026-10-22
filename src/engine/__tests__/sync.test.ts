import { describe, it, expect } from 'vitest';
import {
  decideSyncAction,
  isDatabaseEmpty,
  SyncSnapshotData,
  CloudSnapshot
} from '../sync';

const mockEmptyData: SyncSnapshotData = {
  version: 1,
  exported_at: new Date().toISOString(),
  xp_ledger: [],
  mp_ledger: [],
  quest_logs: [],
  focus_sessions: [],
  chapter_progress: [
    { id: 'P1', subject: 'physics', status: 'locked', boss_cleared: false, shadow_extracted: false }
  ],
  grimoire: [],
  srs_cards: [],
  mock_results: [],
  settings: []
};

const mockFullData: SyncSnapshotData = {
  version: 1,
  exported_at: new Date().toISOString(),
  xp_ledger: [{ id: 1, date: '2026-11-01', amount: 500, source: 'quest', description: 'Daily quest', created_at: '' }],
  mp_ledger: [{ id: 1, date: '2026-11-01', amount: 50, source: 'quest', description: 'Daily quest', created_at: '' }],
  quest_logs: [{ id: 1, date: '2026-11-01', quest_id: 'q1', is_completed: true, completed_at: '' }],
  focus_sessions: [{ id: 1, date: '2026-11-01', duration_minutes: 50, blocks: 1, subject: 'physics', chapter_id: 'P1', started_at: '', completed: true }],
  chapter_progress: [{ id: 'P1', subject: 'physics', status: 'cleared', boss_cleared: true, shadow_extracted: true }],
  grimoire: [],
  srs_cards: [],
  mock_results: [],
  settings: [{ key: 'difficulty_mode', value: 'normal' }]
};

describe('Sync Engine Decision Logic', () => {
  it('correctly identifies empty vs populated databases', () => {
    expect(isDatabaseEmpty(mockEmptyData)).toBe(true);
    expect(isDatabaseEmpty(mockFullData)).toBe(false);
    expect(isDatabaseEmpty(null)).toBe(true);
  });

  it('handles offline state by queuing local changes or nooping', () => {
    // Offline with local changes
    const offlineWithChanges = decideSyncAction({
      localRevision: 1,
      localHasUnsyncedChanges: true,
      localData: mockFullData,
      cloudSnapshot: null,
      isOnline: false
    });
    expect(offlineWithChanges.action).toBe('OFFLINE_QUEUED');

    // Offline without local changes
    const offlineNoChanges = decideSyncAction({
      localRevision: 1,
      localHasUnsyncedChanges: false,
      localData: mockFullData,
      cloudSnapshot: null,
      isOnline: false
    });
    expect(offlineNoChanges.action).toBe('NOOP');
  });

  it('pushes initial snapshot for new accounts when local has data', () => {
    const decision = decideSyncAction({
      localRevision: 0,
      localHasUnsyncedChanges: true,
      localData: mockFullData,
      cloudSnapshot: null,
      isOnline: true
    });
    expect(decision.action).toBe('PUSH_INITIAL');
  });

  it('pulls overwrite when cloud revision is newer and local is clean', () => {
    const cloudSnapshot: CloudSnapshot = {
      user_id: 'hunter-1',
      data: mockFullData,
      revision: 5,
      updated_at: new Date().toISOString()
    };

    const decision = decideSyncAction({
      localRevision: 4,
      localHasUnsyncedChanges: false,
      localData: mockFullData,
      cloudSnapshot,
      isOnline: true
    });

    expect(decision.action).toBe('PULL_OVERWRITE');
    expect(decision.cloudRevision).toBe(5);
  });

  it('pushes update when local has changes and revisions match', () => {
    const cloudSnapshot: CloudSnapshot = {
      user_id: 'hunter-1',
      data: mockFullData,
      revision: 3,
      updated_at: new Date().toISOString()
    };

    const decision = decideSyncAction({
      localRevision: 3,
      localHasUnsyncedChanges: true,
      localData: mockFullData,
      cloudSnapshot,
      isOnline: true
    });

    expect(decision.action).toBe('PUSH_UPDATE');
    expect(decision.expectedRevision).toBe(3);
  });

  it('detects CONFLICT when both local and cloud have changed', () => {
    const cloudSnapshot: CloudSnapshot = {
      user_id: 'hunter-1',
      data: mockFullData,
      revision: 4,
      updated_at: new Date().toISOString()
    };

    const decision = decideSyncAction({
      localRevision: 2, // Local diverged
      localHasUnsyncedChanges: true,
      localData: mockFullData,
      cloudSnapshot,
      isOnline: true
    });

    expect(decision.action).toBe('CONFLICT');
    expect(decision.cloudRevision).toBe(4);
    expect(decision.localRevision).toBe(2);
  });

  it('guards against overwriting a full cloud save with an empty local database', () => {
    const cloudSnapshot: CloudSnapshot = {
      user_id: 'hunter-1',
      data: mockFullData, // Cloud has 500 XP and cleared chapters
      revision: 2,
      updated_at: new Date().toISOString()
    };

    // Fresh install/device opening: local is empty
    const freshOpen = decideSyncAction({
      localRevision: 0,
      localHasUnsyncedChanges: false,
      localData: mockEmptyData,
      cloudSnapshot,
      isOnline: true
    });
    // Should pull from cloud, NOT wipe cloud
    expect(freshOpen.action).toBe('PULL_OVERWRITE');

    // If somehow local tries to push an empty DB over full cloud save:
    const emptyPushAttempt = decideSyncAction({
      localRevision: 2,
      localHasUnsyncedChanges: true,
      localData: mockEmptyData,
      cloudSnapshot,
      isOnline: true
    });
    // Must be blocked by guard!
    expect(emptyPushAttempt.action).toBe('GUARD_BLOCKED');
  });

  it('returns NOOP when local and cloud are already identical and clean', () => {
    const cloudSnapshot: CloudSnapshot = {
      user_id: 'hunter-1',
      data: mockFullData,
      revision: 7,
      updated_at: new Date().toISOString()
    };

    const decision = decideSyncAction({
      localRevision: 7,
      localHasUnsyncedChanges: false,
      localData: mockFullData,
      cloudSnapshot,
      isOnline: true
    });

    expect(decision.action).toBe('NOOP');
  });
});
