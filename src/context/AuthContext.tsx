'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  db,
  getDb,
  setActiveDbUser,
  exportDatabaseToJson,
  importJsonToDatabase,
  SoloLevelingDatabase
} from '@/src/db/db';
import {
  decideSyncAction,
  isDatabaseEmpty,
  CloudSnapshot,
  SyncSnapshotData
} from '@/src/engine/sync';
import systemMessages from '@/config/system_messages.json';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface ConflictData {
  cloudSnapshot: CloudSnapshot;
  localSnapshot: SyncSnapshotData;
}

export interface GuestUploadData {
  guestSnapshot: SyncSnapshotData;
  cloudSnapshot: CloudSnapshot | null;
}

export interface HistoryRecord {
  id: number;
  revision: number;
  saved_at: string;
  data: SyncSnapshotData;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  localRevision: number;
  cloudRevision: number;
  hasUnsyncedChanges: boolean;
  conflictData: ConflictData | null;
  guestUploadData: GuestUploadData | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  syncNow: () => Promise<void>;
  resolveConflict: (choice: 'cloud' | 'local' | 'download_both') => Promise<void>;
  resolveGuestUpload: (uploadToAccount: boolean) => Promise<void>;
  markLocalModified: () => void;
  fetchHistorySnapshots: () => Promise<HistoryRecord[]>;
  restoreHistorySnapshot: (historyRow: HistoryRecord) => Promise<void>;
  dismissConflict: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [localRevision, setLocalRevision] = useState<number>(1);
  const [cloudRevision, setCloudRevision] = useState<number>(1);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [guestUploadData, setGuestUploadData] = useState<GuestUploadData | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsyncedChangesRef = useRef<boolean>(false);
  const userRef = useRef<User | null>(null);
  const localRevRef = useRef<number>(1);

  // Sync references
  useEffect(() => {
    hasUnsyncedChangesRef.current = hasUnsyncedChanges;
  }, [hasUnsyncedChanges]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    localRevRef.current = localRevision;
  }, [localRevision]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (userRef.current && hasUnsyncedChangesRef.current) {
        performSync();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save revision helper
  const saveLocalRevision = (rev: number) => {
    setLocalRevision(rev);
    localRevRef.current = rev;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`solo_local_revision_${userRef.current?.id || 'guest'}`, String(rev));
      } catch {
        // Ignore
      }
    }
  };

  const loadLocalRevision = (userId: string): number => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`solo_local_revision_${userId}`);
        if (stored) return parseInt(stored, 10) || 1;
      } catch {
        // Ignore
      }
    }
    return 1;
  };

  // Perform Cloud Sync with optimistic concurrency
  const performSync = useCallback(async (forcedLocalSnapshot?: SyncSnapshotData) => {
    const activeUser = userRef.current;
    if (!activeUser || !isSupabaseConfigured()) {
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    try {
      setSyncStatus('syncing');

      // 1. Fetch current cloud row
      const { data: cloudRow, error: fetchErr } = await supabase
        .from('player_snapshots')
        .select('user_id, data, revision, updated_at')
        .eq('user_id', activeUser.id)
        .maybeSingle();

      if (fetchErr) {
        console.error('Error fetching cloud snapshot:', fetchErr);
        setSyncStatus('error');
        return;
      }

      const cloudSnapshot: CloudSnapshot | null = cloudRow ? (cloudRow as CloudSnapshot) : null;
      if (cloudSnapshot) {
        setCloudRevision(cloudSnapshot.revision);
      }

      // 2. Export active local database
      const userDatabase = getDb(activeUser.id);
      const localData = forcedLocalSnapshot || (await exportDatabaseToJson(userDatabase));
      const currentLocalRev = localRevRef.current;
      const unsynced = hasUnsyncedChangesRef.current;

      // 3. Consult pure sync decision engine
      const decision = decideSyncAction({
        localRevision: currentLocalRev,
        localHasUnsyncedChanges: unsynced,
        localData,
        cloudSnapshot,
        isOnline: navigator.onLine
      });

      switch (decision.action) {
        case 'NOOP':
          setSyncStatus('synced');
          setHasUnsyncedChanges(false);
          hasUnsyncedChangesRef.current = false;
          break;

        case 'OFFLINE_QUEUED':
          setSyncStatus('offline');
          break;

        case 'GUARD_BLOCKED':
          console.warn(decision.reason);
          setSyncStatus('error');
          break;

        case 'PULL_OVERWRITE':
          if (cloudSnapshot) {
            // Restore cloud data to local active database
            await importJsonToDatabase(cloudSnapshot.data, userDatabase);
            saveLocalRevision(cloudSnapshot.revision);
            setHasUnsyncedChanges(false);
            hasUnsyncedChangesRef.current = false;
            setLastSyncedAt(new Date(cloudSnapshot.updated_at));
            setSyncStatus('synced');
          }
          break;

        case 'PUSH_INITIAL':
          // Insert initial snapshot (revision = 1)
          const { error: insertErr } = await supabase
            .from('player_snapshots')
            .insert({
              user_id: activeUser.id,
              data: localData,
              revision: 1
            });

          if (insertErr) {
            console.error('Push initial error:', insertErr);
            setSyncStatus('error');
          } else {
            saveLocalRevision(1);
            setCloudRevision(1);
            setHasUnsyncedChanges(false);
            hasUnsyncedChangesRef.current = false;
            setLastSyncedAt(new Date());
            setSyncStatus('synced');
          }
          break;

        case 'PUSH_UPDATE':
          // Optimistic concurrency update: revision must match expected
          const expectedRev = decision.expectedRevision ?? currentLocalRev;
          const nextRev = expectedRev + 1;

          const { data: updatedRows, error: updateErr } = await supabase
            .from('player_snapshots')
            .update({
              data: localData,
              revision: nextRev
            })
            .eq('user_id', activeUser.id)
            .eq('revision', expectedRev)
            .select();

          if (updateErr) {
            console.error('Push update error:', updateErr);
            setSyncStatus('error');
          } else if (!updatedRows || updatedRows.length === 0) {
            // 0 rows returned = Conflict! Revision changed on server
            const { data: latestCloud } = await supabase
              .from('player_snapshots')
              .select('user_id, data, revision, updated_at')
              .eq('user_id', activeUser.id)
              .maybeSingle();

            if (latestCloud) {
              setConflictData({
                cloudSnapshot: latestCloud as CloudSnapshot,
                localSnapshot: localData
              });
              setSyncStatus('error');
            }
          } else {
            saveLocalRevision(nextRev);
            setCloudRevision(nextRev);
            setHasUnsyncedChanges(false);
            hasUnsyncedChangesRef.current = false;
            setLastSyncedAt(new Date());
            setSyncStatus('synced');
          }
          break;

        case 'CONFLICT':
          if (cloudSnapshot) {
            setConflictData({
              cloudSnapshot,
              localSnapshot: localData
            });
            setSyncStatus('error');
          }
          break;
      }
    } catch (err) {
      console.error('Sync failure:', err);
      setSyncStatus('error');
    }
  }, []);

  // Mark local modified: debounced push in 5s
  const markLocalModified = useCallback(() => {
    setHasUnsyncedChanges(true);
    hasUnsyncedChangesRef.current = true;

    if (!userRef.current || !isSupabaseConfigured()) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performSync();
    }, 5000);
  }, [performSync]);

  // Tab hide (visibilitychange) -> push pending changes immediately
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && userRef.current && hasUnsyncedChangesRef.current) {
        performSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performSync]);

  // Check initial Auth session
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const guestFlag = typeof window !== 'undefined' && (localStorage.getItem('solo_guest_mode') === 'true' || window.location.search.includes('guest=1'));

        if (!isSupabaseConfigured()) {
          // If Supabase is not configured, fall back to guest mode
          setIsGuest(true);
          setActiveDbUser(null);
          setIsLoading(false);
          return;
        }

        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (initialSession?.user) {
          setUser(initialSession.user);
          setSession(initialSession);
          setIsGuest(false);
          setActiveDbUser(initialSession.user.id);
          const rev = loadLocalRevision(initialSession.user.id);
          setLocalRevision(rev);
          localRevRef.current = rev;

          // Pull cloud snapshot on app open
          performSync();
        } else if (guestFlag) {
          setIsGuest(true);
          setActiveDbUser(null);
        } else {
          setIsGuest(false);
          setActiveDbUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setIsGuest(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      if (newSession?.user) {
        const u = newSession.user;
        setUser(u);
        setSession(newSession);
        setIsGuest(false);
        setActiveDbUser(u.id);
        const rev = loadLocalRevision(u.id);
        setLocalRevision(rev);
        localRevRef.current = rev;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('solo_guest_mode');
        }

        // Check if there was guest data on this device
        const guestDb = getDb(null);
        const guestData = await exportDatabaseToJson(guestDb);
        if (!isDatabaseEmpty(guestData)) {
          // Check if cloud already has data
          const { data: cloudRow } = await supabase
            .from('player_snapshots')
            .select('user_id, data, revision, updated_at')
            .eq('user_id', u.id)
            .maybeSingle();

          if (cloudRow && !isDatabaseEmpty(cloudRow.data)) {
            // Both cloud and guest device have data -> show conflict dialog
            setConflictData({
              cloudSnapshot: cloudRow as CloudSnapshot,
              localSnapshot: guestData
            });
          } else {
            // Cloud has no data, ask player if they want to upload guest progress
            setGuestUploadData({
              guestSnapshot: guestData,
              cloudSnapshot: (cloudRow as CloudSnapshot) || null
            });
          }
        } else {
          // Normal login, perform sync
          performSync();
        }
      } else {
        setUser(null);
        setSession(null);
        setActiveDbUser(null);
        setSyncStatus('idle');
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [performSync]);

  // Auth actions
  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase credentials are not configured yet. You can continue as Guest.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase credentials are not configured yet. You can continue as Guest.' };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data?.user && !data.session) {
      return { message: systemMessages.auth.signup_done };
    }
    return {};
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase credentials are not configured yet.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { message: 'Password recovery email sent. Check your inbox.' };
  };

  const logout = async () => {
    // If pending changes, push before logout
    if (userRef.current && hasUnsyncedChangesRef.current) {
      await performSync();
    }
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setIsGuest(true);
    setActiveDbUser(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solo_guest_mode', 'true');
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setActiveDbUser(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solo_guest_mode', 'true');
    }
  };

  const syncNow = async () => {
    await performSync();
  };

  // Conflict Resolution
  const resolveConflict = async (choice: 'cloud' | 'local' | 'download_both') => {
    if (!conflictData || !userRef.current) return;
    const { cloudSnapshot, localSnapshot } = conflictData;
    const userDb = getDb(userRef.current.id);

    if (choice === 'download_both') {
      // Download Cloud snapshot
      const cloudBlob = new Blob([JSON.stringify(cloudSnapshot.data, null, 2)], { type: 'application/json' });
      const cloudUrl = URL.createObjectURL(cloudBlob);
      const a1 = document.createElement('a');
      a1.href = cloudUrl;
      a1.download = `solo-cloud-rev${cloudSnapshot.revision}-${new Date().toISOString().slice(0, 10)}.json`;
      a1.click();
      URL.revokeObjectURL(cloudUrl);

      // Download Local snapshot
      const localBlob = new Blob([JSON.stringify(localSnapshot, null, 2)], { type: 'application/json' });
      const localUrl = URL.createObjectURL(localBlob);
      const a2 = document.createElement('a');
      a2.href = localUrl;
      a2.download = `solo-device-rev${localRevRef.current}-${new Date().toISOString().slice(0, 10)}.json`;
      a2.click();
      URL.revokeObjectURL(localUrl);
      return;
    }

    if (choice === 'cloud') {
      // Keep Cloud: safety download of local data first
      try {
        const safetyBlob = new Blob([JSON.stringify(localSnapshot, null, 2)], { type: 'application/json' });
        const safetyUrl = URL.createObjectURL(safetyBlob);
        const link = document.createElement('a');
        link.href = safetyUrl;
        link.download = `solo-local-safety-before-cloud-restore.json`;
        link.click();
        URL.revokeObjectURL(safetyUrl);
      } catch {
        // Continue
      }

      // Overwrite local with cloud
      await importJsonToDatabase(cloudSnapshot.data, userDb);
      saveLocalRevision(cloudSnapshot.revision);
      setCloudRevision(cloudSnapshot.revision);
      setHasUnsyncedChanges(false);
      hasUnsyncedChangesRef.current = false;
      setConflictData(null);
      setSyncStatus('synced');
    } else if (choice === 'local') {
      // Keep Local: force push local snapshot to cloud as next revision
      const nextRev = cloudSnapshot.revision + 1;
      const { error } = await supabase
        .from('player_snapshots')
        .upsert({
          user_id: userRef.current.id,
          data: localSnapshot,
          revision: nextRev
        });

      if (!error) {
        saveLocalRevision(nextRev);
        setCloudRevision(nextRev);
        setHasUnsyncedChanges(false);
        hasUnsyncedChangesRef.current = false;
        setConflictData(null);
        setSyncStatus('synced');
      }
    }
  };

  // Guest progress upload decision on first login
  const resolveGuestUpload = async (uploadToAccount: boolean) => {
    if (!guestUploadData || !userRef.current) return;
    const { guestSnapshot } = guestUploadData;
    const userDb = getDb(userRef.current.id);

    if (uploadToAccount) {
      // Copy guest data to user's database
      await importJsonToDatabase(guestSnapshot, userDb);
      // Push to cloud as revision 1
      await supabase.from('player_snapshots').upsert({
        user_id: userRef.current.id,
        data: guestSnapshot,
        revision: 1
      });
      saveLocalRevision(1);
      setCloudRevision(1);
      setHasUnsyncedChanges(false);
      hasUnsyncedChangesRef.current = false;
      setSyncStatus('synced');
    } else {
      // Start fresh or pull whatever is on cloud
      await performSync();
    }
    setGuestUploadData(null);
  };

  const dismissConflict = () => {
    setConflictData(null);
  };

  // History snapshot fetch
  const fetchHistorySnapshots = async (): Promise<HistoryRecord[]> => {
    if (!userRef.current || !isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('player_snapshot_history')
      .select('id, revision, saved_at, data')
      .eq('user_id', userRef.current.id)
      .order('saved_at', { ascending: false })
      .limit(20);

    if (error || !data) return [];
    return data as HistoryRecord[];
  };

  // Restore history snapshot
  const restoreHistorySnapshot = async (historyRow: HistoryRecord) => {
    if (!userRef.current) return;
    const userDb = getDb(userRef.current.id);

    // 1. Download safety copy of current local state
    const currentLocal = await exportDatabaseToJson(userDb);
    const safetyBlob = new Blob([JSON.stringify(currentLocal, null, 2)], { type: 'application/json' });
    const safetyUrl = URL.createObjectURL(safetyBlob);
    const link = document.createElement('a');
    link.href = safetyUrl;
    link.download = `solo-safety-backup-before-restore-rev${historyRow.revision}.json`;
    link.click();
    URL.revokeObjectURL(safetyUrl);

    // 2. Import history snapshot into local database
    await importJsonToDatabase(historyRow.data, userDb);

    // 3. Push to cloud with bumped revision
    const nextRev = (cloudRevision || 1) + 1;
    await supabase.from('player_snapshots').upsert({
      user_id: userRef.current.id,
      data: historyRow.data,
      revision: nextRev
    });

    saveLocalRevision(nextRev);
    setCloudRevision(nextRev);
    setHasUnsyncedChanges(false);
    hasUnsyncedChangesRef.current = false;
    setSyncStatus('synced');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isGuest,
        isLoading,
        isOnline,
        syncStatus,
        lastSyncedAt,
        localRevision,
        cloudRevision,
        hasUnsyncedChanges,
        conflictData,
        guestUploadData,
        login,
        signUp,
        resetPassword,
        logout,
        continueAsGuest,
        syncNow,
        resolveConflict,
        resolveGuestUpload,
        markLocalModified,
        fetchHistorySnapshots,
        restoreHistorySnapshot,
        dismissConflict
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
