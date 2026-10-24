'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { seedDatabaseIfNeeded } from '@/src/db/seed';
import { DifficultyMode } from '@/src/types';
import { playSystemChime, isSoundEnabled, setSoundEnabled } from '@/src/utils/audio';
import gameRules from '@/config/game_rules.json';
import systemMessages from '@/config/system_messages.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, HistoryRecord } from '@/src/context/AuthContext';

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    isGuest,
    syncStatus,
    lastSyncedAt,
    cloudRevision,
    syncNow,
    logout,
    fetchHistorySnapshots,
    restoreHistorySnapshot
  } = useAuth();

  const [mode, setMode] = useState<DifficultyMode>('normal');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [soundOn, setSoundOn] = useState(true);
  const [effectsMode, setEffectsMode] = useState<'full' | 'lite' | 'off'>('full');
  const [cutsceneOn, setCutsceneOn] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // History snapshots
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  useEffect(() => {
    async function load() {
      const modeSetting = await db.settings.get('difficulty_mode');
      if (modeSetting) setMode(modeSetting.value);
      const startSetting = await db.settings.get('start_date');
      if (startSetting) setStartDate(startSetting.value);
      setSoundOn(isSoundEnabled());

      try {
        const storedCutscene = localStorage.getItem('solo_quest_cutscene');
        if (storedCutscene !== null) {
          setCutsceneOn(storedCutscene !== 'false');
        }
      } catch {}

      const effSetting = await db.settings.get('visual_effects');
      if (effSetting) {
        setEffectsMode(effSetting.value as 'full' | 'lite' | 'off');
      } else {
        const isLowEnd = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
        setEffectsMode(isLowEnd ? 'lite' : 'full');
      }
    }
    load();
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    setSoundEnabled(nextVal);
    if (nextVal) playSystemChime();
    setToastMessage(`[ SYSTEM ] Audio feedback ${nextVal ? 'ACTIVATED' : 'MUTED'}.`);
  };

  const handleToggleEffects = async (newEff: 'full' | 'lite' | 'off') => {
    playSystemChime();
    setEffectsMode(newEff);
    await db.settings.put({ key: 'visual_effects', value: newEff });
    if (typeof window !== 'undefined') {
      localStorage.setItem('solo_visual_effects', newEff);
      window.dispatchEvent(new Event('solo_effects_changed'));
    }
    setToastMessage(`[ SYSTEM ] Visual effects set to ${newEff.toUpperCase()}.`);
  };

  const handleToggleCutscene = () => {
    const nextVal = !cutsceneOn;
    setCutsceneOn(nextVal);
    try {
      localStorage.setItem('solo_quest_cutscene', String(nextVal));
    } catch {}
    if (soundOn) playSystemChime();
    setToastMessage(`[ SYSTEM ] Daily quest arrival cutscene ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
  };

  const handleReplayIntro = () => {
    try {
      sessionStorage.removeItem('sl_opened');
    } catch {}
    if (soundOn) playSystemChime();
    window.location.href = '/';
  };

  const handleToggleMode = async (newMode: DifficultyMode) => {
    playSystemChime();
    setMode(newMode);
    await db.settings.put({ key: 'difficulty_mode', value: newMode });
    setToastMessage(`[ SYSTEM ] Difficulty changed to ${newMode.toUpperCase()} mode.`);
  };

  const handleManualSync = async () => {
    playSystemChime();
    setSyncingNow(true);
    try {
      await syncNow();
      setToastMessage('[ SYSTEM ] Progress synced to cloud.');
    } catch {
      setToastMessage('[ SYSTEM ] Cloud sync failed.');
    } finally {
      setSyncingNow(false);
    }
  };

  const handleLoadHistory = async () => {
    setLoadingHistory(true);
    setShowHistory(!showHistory);
    if (!showHistory) {
      const records = await fetchHistorySnapshots();
      setHistoryList(records);
    }
    setLoadingHistory(false);
  };

  const handleRestoreVersion = async (record: HistoryRecord) => {
    if (!confirm(`Restore cloud version Rev #${record.revision} saved on ${new Date(record.saved_at).toLocaleString()}? A safety backup will be downloaded first.`)) {
      return;
    }
    playSystemChime();
    try {
      await restoreHistorySnapshot(record);
      setToastMessage(`[ SYSTEM ] Restored revision ${record.revision} successfully.`);
    } catch (err: any) {
      setToastMessage(`[ ERROR ] Restore failed: ${err.message}`);
    }
  };

  const handleExportBackup = async () => {
    playSystemChime();
    // Gather all tables
    const backupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      xp_ledger: await db.xp_ledger.toArray(),
      mp_ledger: await db.mp_ledger.toArray(),
      quest_logs: await db.quest_logs.toArray(),
      focus_sessions: await db.focus_sessions.toArray(),
      chapter_progress: await db.chapter_progress.toArray(),
      grimoire: await db.grimoire.toArray(),
      srs_cards: await db.srs_cards.toArray(),
      mock_results: await db.mock_results.toArray(),
      settings: await db.settings.toArray(),
      day_evaluations: await db.day_evaluations.toArray()
    };

    const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solo-leveling-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setToastMessage('[ SYSTEM BACKUP ] Full Hunter database exported as JSON.');
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // 1. Validate Schema
        const requiredTables = ['xp_ledger', 'mp_ledger', 'quest_logs', 'chapter_progress', 'settings'];
        const isValid =
          data &&
          typeof data === 'object' &&
          typeof data.version === 'number' &&
          requiredTables.every((t) => Array.isArray(data[t]));

        if (!isValid) {
          throw new Error('Invalid or corrupted backup JSON file.');
        }

        // 2. Offer/trigger automatic safety copy of current database first
        try {
          await handleExportBackup();
        } catch {
          // Continue if auto-export fails
        }

        playSystemChime();

        // 3. Atomic Transaction: Clear and BulkAdd all tables in single rollback transaction
        await db.transaction('rw', db.tables, async () => {
          await Promise.all(db.tables.map((table) => table.clear()));

          if (data.xp_ledger?.length) await db.xp_ledger.bulkAdd(data.xp_ledger);
          if (data.mp_ledger?.length) await db.mp_ledger.bulkAdd(data.mp_ledger);
          if (data.quest_logs?.length) await db.quest_logs.bulkAdd(data.quest_logs);
          if (data.focus_sessions?.length) await db.focus_sessions.bulkAdd(data.focus_sessions);
          if (data.chapter_progress?.length) await db.chapter_progress.bulkAdd(data.chapter_progress);
          if (data.grimoire?.length) await db.grimoire.bulkAdd(data.grimoire);
          if (data.srs_cards?.length) await db.srs_cards.bulkAdd(data.srs_cards);
          if (data.mock_results?.length) await db.mock_results.bulkAdd(data.mock_results);
          if (data.settings?.length) await db.settings.bulkAdd(data.settings);
          if (data.day_evaluations?.length) await db.day_evaluations.bulkAdd(data.day_evaluations);
        });

        setToastMessage('[ BACKUP RESTORED ] All Hunter data safely imported with atomic rollback protection!');
      } catch (err: any) {
        setToastMessage(`[ IMPORT FAILED ] ${err.message || 'Validation error'}. Database was rolled back safely.`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleResetDatabase = async () => {
    playSystemChime();
    await db.xp_ledger.clear();
    await db.mp_ledger.clear();
    await db.quest_logs.clear();
    await db.focus_sessions.clear();
    await db.chapter_progress.clear();
    await db.grimoire.clear();
    await db.srs_cards.clear();
    await db.mock_results.clear();
    await db.settings.clear();
    await db.day_evaluations.clear();

    localStorage.clear();

    await seedDatabaseIfNeeded();
    setConfirmReset(false);
    setToastMessage('[ SYSTEM RESET ] Database purged and restored to pristine factory state.');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-hunter-blue tracking-wider text-shadow-blue">
            [ SYSTEM SETTINGS ]
          </h1>
          <p className="text-xs text-hunter-400">
            HUNTER CONFIGURATION &bull; VAULT &bull; CLOUD SYNC
          </p>
        </div>
        <Link
          href="/debug"
          className="text-xs text-hunter-cyan border border-hunter-blue/40 px-2.5 py-1.5 rounded bg-hunter-blue/10 min-h-[44px] flex items-center"
        >
          DEBUG 🛠️
        </Link>
      </div>

      <div className="space-y-4 text-xs">
        {/* Account & Cloud Sync Section */}
        <div className="border border-cyan-500/40 bg-slate-900/90 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              [ HUNTER ACCOUNT ]
            </div>
            {user && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono">
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' : syncStatus === 'error' ? 'Sync Alert' : 'Cloud Connected'}
              </span>
            )}
          </div>

          {user ? (
            <div className="space-y-2">
              <div className="text-slate-300">
                Logged in as: <span className="text-white font-bold">{user.email}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Cloud Revision: <strong className="text-cyan-300">Rev #{cloudRevision}</strong></span>
                <span>Last Synced: <strong className="text-slate-200">{lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Initial sync pending'}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncingNow}
                  className="min-h-[44px] bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500 text-cyan-300 rounded font-bold uppercase tracking-wider flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {syncingNow ? 'SYNCING...' : 'SYNC NOW 🔄'}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="min-h-[44px] bg-red-950/40 hover:bg-red-900/60 border border-red-500/50 text-red-300 rounded font-bold uppercase tracking-wider flex items-center justify-center transition-colors"
                >
                  LOG OUT 🚪
                </button>
              </div>

              {/* Version History Rollback */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleLoadHistory}
                  className="w-full text-left text-cyan-400 hover:text-cyan-300 text-xs font-mono flex items-center justify-between py-1"
                >
                  <span>[ RESTORE PREVIOUS VERSION ]</span>
                  <span>{showHistory ? '▲ Hide' : '▼ View History'}</span>
                </button>

                {showHistory && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {loadingHistory ? (
                      <div className="text-slate-500 py-2">Loading cloud history snapshots...</div>
                    ) : historyList.length === 0 ? (
                      <div className="text-slate-500 py-2">No previous version history recorded yet. Snapshots are stored every 12 hours.</div>
                    ) : (
                      historyList.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px]"
                        >
                          <div>
                            <div className="text-slate-200 font-bold">Revision #{rec.revision}</div>
                            <div className="text-slate-500">{new Date(rec.saved_at).toLocaleString()}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRestoreVersion(rec)}
                            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 rounded uppercase font-bold text-[10px]"
                          >
                            Restore
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-amber-300/90 leading-relaxed font-mono">
                {systemMessages.auth.guest_warning}
              </div>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full min-h-[44px] bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold uppercase tracking-wider flex items-center justify-center transition-colors shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                LOG IN / CREATE ACCOUNT 🛡️
              </button>
            </div>
          )}
        </div>

        {/* Sound Effects Preference */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 flex justify-between items-center">
          <div>
            <div className="font-bold text-hunter-100 text-xs">[ SYSTEM AUDIO EFFECTS ]</div>
            <p className="text-xs text-hunter-400 mt-0.5">Synthesized digital chimes for quest completion and level ups.</p>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            className={`min-h-[44px] px-3.5 rounded font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
              soundOn
                ? 'border-hunter-green bg-green-950/40 text-hunter-green shadow-[0_0_10px_rgba(0,255,136,0.3)]'
                : 'border-hunter-800 bg-hunter-950 text-hunter-400'
            }`}
          >
            {soundOn ? 'SOUND ON 🔊' : 'MUTED 🔇'}
          </button>
        </div>

        {/* Visual Effects (HUD Particle Field) */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 space-y-2">
          <div>
            <div className="font-bold text-hunter-100 text-xs">[ VISUAL EFFECTS: HUD PARTICLES ]</div>
            <p className="text-xs text-hunter-400 mt-0.5">Control 60fps canvas particles, holographic grid, and energy waves.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleToggleEffects('full')}
              className={`min-h-[44px] rounded font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                effectsMode === 'full'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.4)]'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              FULL ✨
            </button>
            <button
              type="button"
              onClick={() => handleToggleEffects('lite')}
              className={`min-h-[44px] rounded font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                effectsMode === 'lite'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.4)]'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              LITE ⚡
            </button>
            <button
              type="button"
              onClick={() => handleToggleEffects('off')}
              className={`min-h-[44px] rounded font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                effectsMode === 'off'
                  ? 'border-slate-600 bg-slate-800 text-white shadow'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              OFF 🛑
            </button>
          </div>
        </div>

        {/* Difficulty Mode Selection */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5">
          <div className="text-xs font-bold text-hunter-blue mb-1">[ DIFFICULTY MODE ]</div>
          <p className="text-xs text-hunter-400 mb-3">
            Alters daily study block targets between Normal (8 blocks) and Easy (6 blocks).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('normal')}
              className={`min-h-[44px] py-2 rounded font-bold border transition-all text-center flex items-center justify-center ${
                mode === 'normal'
                  ? 'border-hunter-blue bg-hunter-blue/30 text-white shadow-[0_0_10px_rgba(0,217,255,0.4)]'
                  : 'border-hunter-800 bg-hunter-950 text-hunter-400'
              }`}
            >
              NORMAL (8 BLOCKS)
            </button>
            <button
              onClick={() => handleToggleMode('easy')}
              className={`min-h-[44px] py-2 rounded font-bold border transition-all text-center flex items-center justify-center ${
                mode === 'easy'
                  ? 'border-hunter-cyan bg-hunter-cyan/30 text-white shadow-[0_0_10px_rgba(0,217,255,0.4)]'
                  : 'border-hunter-800 bg-hunter-950 text-hunter-400'
              }`}
            >
              EASY (6 BLOCKS)
            </button>
          </div>
        </div>

        {/* Daily Quest Arrival Cutscene */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 flex justify-between items-center">
          <div>
            <div className="font-bold text-hunter-100 text-xs">[ DAILY QUEST CUTSCENE ]</div>
            <p className="text-xs text-hunter-400 mt-0.5">Short holographic globe cutscene once per day when entering System.</p>
          </div>
          <button
            type="button"
            onClick={handleToggleCutscene}
            className={`min-h-[44px] px-3.5 rounded font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
              cutsceneOn
                ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            {cutsceneOn ? 'ON 🎬' : 'OFF ⏭️'}
          </button>
        </div>

        {/* Replay Intro */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 space-y-2">
          <div>
            <div className="font-bold text-hunter-100 text-xs">[ REPLAY SYSTEM INTRO ]</div>
            <p className="text-xs text-hunter-400 mt-0.5">Re-experience the ARISE opening cutscene or awakening sequence.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleReplayIntro}
              className="min-h-[44px] px-3 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-400 text-cyan-300 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center shadow-[0_0_8px_rgba(0,255,255,0.3)]"
            >
              ARISE VIDEO 🎬
            </button>
            <Link
              href="/intro"
              className="min-h-[44px] px-3 bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue hover:text-white rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center"
            >
              AWAKENING 📜
            </Link>
          </div>
        </div>

        {/* JSON Backup & Restore (Local-First Protection) */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 space-y-3">
          <div className="text-xs font-bold text-hunter-cyan">[ JSON BACKUP & RESTORE ]</div>
          <p className="text-xs text-hunter-400 leading-relaxed">
            All your data is stored offline in browser IndexedDB. Export periodic JSON backups to prevent data loss.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportBackup}
              className="min-h-[44px] py-2.5 bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue rounded font-bold uppercase tracking-wider text-center flex items-center justify-center"
            >
              EXPORT JSON 💾
            </button>

            <label className="min-h-[44px] py-2.5 bg-hunter-cyan/20 hover:bg-hunter-cyan/30 border border-hunter-cyan text-hunter-cyan rounded font-bold uppercase tracking-wider text-center cursor-pointer flex items-center justify-center">
              IMPORT JSON 📥
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Rulebook Modal Trigger */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 flex justify-between items-center">
          <div>
            <div className="font-bold text-hunter-100 text-xs">[ SYSTEM DIRECTIVES & FORMULAS ]</div>
            <p className="text-xs text-hunter-400 mt-0.5">Review XP formulas, Mana caps, Ranks, and Streak penalties.</p>
          </div>
          <button
            onClick={() => {
              playSystemChime();
              setShowRules(!showRules);
            }}
            className="min-h-[44px] px-3.5 bg-hunter-800 hover:bg-hunter-700 border border-hunter-700 text-hunter-300 hover:text-white rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center"
          >
            {showRules ? 'CLOSE' : 'VIEW'}
          </button>
        </div>

        {showRules && (
          <div className="border border-hunter-blue bg-hunter-950 p-4 rounded-lg space-y-3">
            <h3 className="font-bold text-hunter-cyan text-xs uppercase">[ SYSTEM PROTOCOLS ]</h3>
            <div className="space-y-2 text-xs text-hunter-300">
              <p>&bull; <strong className="text-hunter-100">Study Block:</strong> 50 min deep focus = 50 XP + 5 MP</p>
              <p>&bull; <strong className="text-hunter-100">Physical Conditioning:</strong> Daily workout = 50 XP + 10 MP</p>
              <p>&bull; <strong className="text-hunter-100">Night Review:</strong> Review errors & flashcards = 50 XP + 5 MP</p>
              <p>&bull; <strong className="text-hunter-100">Daily Quest Clear Bonus:</strong> Completing all 3 quests = +150 XP</p>
              <p>&bull; <strong className="text-hunter-100">Lazy Day Evaluation:</strong> App automatically evaluates past days, updates streak, applies penalties for missed days, and converts unspent MP to XP at 5:00 AM.</p>
              <p>&bull; <strong className="text-hunter-100">Emergency Lockout:</strong> Triggered if you fail 2 consecutive days. Must complete a 100-rep physical quest to unlock the system.</p>
            </div>
          </div>
        )}

        {/* Danger Zone: Hard Reset */}
        <div className="border border-red-500/30 bg-red-950/20 rounded-lg p-3.5 space-y-2">
          <div className="text-xs font-bold text-red-400">[ SYSTEM PURGE PROTOCOL ]</div>
          <p className="text-xs text-hunter-400">
            Permanently purges all local data and reinitializes factory defaults.
          </p>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="min-h-[44px] w-full py-2 bg-red-950/50 hover:bg-red-900/60 border border-red-500/50 text-red-400 rounded font-bold uppercase tracking-wider text-center flex items-center justify-center"
            >
              PURGE LOCAL DATABASE
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-red-400 text-xs font-bold text-center">
                ARE YOU SURE, PLAYER? THIS ACTION CANNOT BE UNDONE.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleResetDatabase}
                  className="min-h-[44px] py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold uppercase tracking-wider text-center flex items-center justify-center"
                >
                  YES, PURGE ALL
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[44px] py-2 bg-hunter-800 text-hunter-300 rounded font-bold uppercase tracking-wider text-center flex items-center justify-center"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
