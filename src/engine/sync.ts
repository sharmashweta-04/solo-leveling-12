// Pure engine logic for cloud snapshot synchronization and conflict resolution
// No UI dependencies. Fully testable in Vitest.

export interface SyncSnapshotData {
  version: number;
  exported_at: string;
  xp_ledger: any[];
  mp_ledger: any[];
  quest_logs: any[];
  focus_sessions: any[];
  chapter_progress: any[];
  grimoire: any[];
  srs_cards: any[];
  mock_results: any[];
  settings: any[];
  day_evaluations?: any[];
}

export interface CloudSnapshot {
  user_id: string;
  data: SyncSnapshotData;
  revision: number;
  updated_at: string;
}

export type SyncDecisionAction =
  | 'NOOP'
  | 'PULL_OVERWRITE'
  | 'PUSH_UPDATE'
  | 'PUSH_INITIAL'
  | 'CONFLICT'
  | 'GUARD_BLOCKED'
  | 'OFFLINE_QUEUED';

export interface SyncDecision {
  action: SyncDecisionAction;
  expectedRevision?: number;
  cloudRevision?: number;
  localRevision?: number;
  reason: string;
}

/**
 * Checks whether a database or snapshot has real user progress or is just empty/default.
 * Guard rule: NEVER push an empty database over a non-empty cloud save!
 */
export function isDatabaseEmpty(data: Partial<SyncSnapshotData> | null | undefined): boolean {
  if (!data) return true;

  const xpCount = data.xp_ledger?.length ?? 0;
  const questCount = data.quest_logs?.length ?? 0;
  const focusCount = data.focus_sessions?.length ?? 0;
  const grimoireCount = data.grimoire?.length ?? 0;
  const mockCount = data.mock_results?.length ?? 0;

  // Check if any chapter has been touched/unlocked or cleared
  const hasChapterProgress = data.chapter_progress?.some(
    (c) => c.status !== 'locked' || c.boss_cleared || c.shadow_extracted
  ) ?? false;

  // A database is considered empty if it has no ledger entries, no quests completed, no focus sessions, and no unlocked chapters
  return (
    xpCount === 0 &&
    questCount === 0 &&
    focusCount === 0 &&
    grimoireCount === 0 &&
    mockCount === 0 &&
    !hasChapterProgress
  );
}

export interface SyncDecisionParams {
  localRevision: number;
  localHasUnsyncedChanges: boolean;
  localData: SyncSnapshotData;
  cloudSnapshot: CloudSnapshot | null;
  isOnline: boolean;
}

/**
 * Pure decision function with optimistic concurrency rules.
 */
export function decideSyncAction(params: SyncDecisionParams): SyncDecision {
  const { localRevision, localHasUnsyncedChanges, localData, cloudSnapshot, isOnline } = params;

  // 1. Offline rule
  if (!isOnline) {
    if (localHasUnsyncedChanges) {
      return {
        action: 'OFFLINE_QUEUED',
        reason: 'Device is offline. Changes are saved locally and queued for cloud sync.'
      };
    }
    return {
      action: 'NOOP',
      reason: 'Device is offline with no pending local changes.'
    };
  }

  // 2. New account / No cloud snapshot exists
  if (!cloudSnapshot) {
    if (isDatabaseEmpty(localData)) {
      return {
        action: 'NOOP',
        reason: 'Cloud has no save, and local database is empty.'
      };
    }
    return {
      action: 'PUSH_INITIAL',
      expectedRevision: 0,
      reason: 'Cloud has no snapshot yet. Pushing initial local save as revision 1.'
    };
  }

  const cloudRevision = cloudSnapshot.revision;
  const localEmpty = isDatabaseEmpty(localData);
  const cloudEmpty = isDatabaseEmpty(cloudSnapshot.data);

  // 3. Guard against pushing empty database over non-empty cloud save
  if (localHasUnsyncedChanges && localEmpty && !cloudEmpty) {
    return {
      action: 'GUARD_BLOCKED',
      cloudRevision,
      localRevision,
      reason: 'GUARD BLOCKED: Prevented overwriting non-empty cloud save with an empty local database.'
    };
  }

  // 4. Guard: Empty local vs Full cloud save on clean/fresh open
  // NEVER overwrite non-empty cloud save with empty local database; pull cloud save to restore
  if (localEmpty && !cloudEmpty) {
    return {
      action: 'PULL_OVERWRITE',
      cloudRevision,
      localRevision,
      reason: 'Local database is empty, but cloud has progress. Pulling cloud snapshot to restore progress.'
    };
  }

  // 5. Cloud is newer and local has NO unsynced changes -> Safe pull
  if (cloudRevision > localRevision && !localHasUnsyncedChanges) {
    return {
      action: 'PULL_OVERWRITE',
      cloudRevision,
      localRevision,
      reason: `Cloud revision (${cloudRevision}) is newer than local (${localRevision}). Pulling latest progress.`
    };
  }

  // 6. Local has unsynced changes and revisions match -> Safe push
  if (localHasUnsyncedChanges && cloudRevision === localRevision) {
    return {
      action: 'PUSH_UPDATE',
      expectedRevision: localRevision,
      reason: `Pushing local changes (revision ${localRevision} -> ${localRevision + 1}).`
    };
  }

  // 7. Both modified or revisions diverged while local has unsynced changes -> Conflict!
  if (localHasUnsyncedChanges && cloudRevision !== localRevision) {
    return {
      action: 'CONFLICT',
      cloudRevision,
      localRevision,
      reason: `Conflict detected: Cloud is at revision ${cloudRevision}, while local was modified from revision ${localRevision}.`
    };
  }

  // 8. Revisions match and no local changes -> In sync
  if (cloudRevision === localRevision && !localHasUnsyncedChanges) {
    return {
      action: 'NOOP',
      reason: 'Database is up to date with cloud.'
    };
  }

  // 9. Fallback if cloud revision is older (e.g. cloud rolled back) and local is clean
  if (cloudRevision < localRevision && !localHasUnsyncedChanges) {
    return {
      action: 'PULL_OVERWRITE',
      cloudRevision,
      localRevision,
      reason: `Cloud snapshot rolled back to revision ${cloudRevision}. Aligning local database.`
    };
  }

  return {
    action: 'NOOP',
    reason: 'No sync required.'
  };
}
