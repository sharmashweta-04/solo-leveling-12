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
import HudFrame from '@/src/components/hud/HudFrame';

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
    <div className="pb-24 max-w-md mx-auto p-2 select-none space-y-4">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#5cc8ff]/30 pb-3 mb-2">
        <div>
          <h1
            className="text-lg font-bold text-cyan-200 tracking-wider text-shadow-blue"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            SYSTEM SETTINGS
          </h1>
          <p className="text-xs text-[#9bbacf]">
            HUNTER CONFIGURATION &bull; VAULT &bull; CLOUD SYNC
          </p>
        </div>
        <Link
          href="/debug"
          className="text-xs text-cyan-300 border border-cyan-500/40 px-3 py-1.5 bg-cyan-950/40 min-h-[44px] flex items-center font-bold tracking-wider"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          DEBUG 🛠️
        </Link>
      </div>

      <div className="space-y-4 text-xs">
        {/* Account & Cloud Sync Section */}
        <HudFrame title="HUNTER ACCOUNT & CLOUD SYNC" icon="🛡️" delay={0}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: 'var(--font-cinzel)' }}>
                <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>STATUS</span>
              </div>
              {user && (
                <span className="text-[11px] px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold" style={{ fontFamily: 'var(--font-cinzel)' }}>
                  {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' : syncStatus === 'error' ? 'Sync Alert' : 'Cloud Connected'}
                </span>
              )}
            </div>

            {user ? (
              <div className="space-y-2">
                <div className="text-slate-200 text-xs">
                  Logged in as: <span className="text-cyan-200 font-bold">{user.email}</span>
                </div>
                <div className="flex justify-between text-[#9bbacf] text-xs">
                  <span>Cloud Revision: <strong className="text-cyan-300">Rev #{cloudRevision}</strong></span>
                  <span>Last Synced: <strong className="text-slate-200">{lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Initial sync pending'}</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={syncingNow}
                    className="min-h-[44px] bg-cyan-950/60 hover:bg-cyan-900/60 border-2 border-cyan-300 text-cyan-100 font-bold uppercase tracking-wider flex items-center justify-center transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-cinzel)' }}
                  >
                    {syncingNow ? 'SYNCING...' : 'SYNC NOW 🔄'}
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="min-h-[44px] bg-red-950/50 hover:bg-red-900/60 border border-red-500/60 text-red-300 font-bold uppercase tracking-wider flex items-center justify-center transition-colors"
                    style={{ fontFamily: 'var(--font-cinzel)' }}
                  >
                    LOG OUT 🚪
                  </button>
                </div>

                {/* Version History Rollback */}
                <div className="pt-2 border-t border-cyan-900/40">
                  <button
                    type="button"
                    onClick={handleLoadHistory}
                    className="w-full text-left text-cyan-300 hover:text-cyan-200 text-xs flex items-center justify-between py-1"
                    style={{ fontFamily: 'var(--font-cinzel)' }}
                  >
                    <span>RESTORE PREVIOUS VERSION</span>
                    <span>{showHistory ? '▲ Hide' : '▼ View History'}</span>
                  </button>

                  {showHistory && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {loadingHistory ? (
                        <div className="text-slate-400 py-2">Loading cloud history snapshots...</div>
                      ) : historyList.length === 0 ? (
                        <div className="text-slate-400 py-2">No previous version history recorded yet. Snapshots are stored every 12 hours.</div>
                      ) : (
                        historyList.map((rec) => (
                          <div
                            key={rec.id}
                            className="hud2-row justify-between text-xs p-2"
                          >
                            <div>
                              <div className="text-slate-200 font-bold">Revision #{rec.revision}</div>
                              <div className="text-[#9bbacf] text-[10px]">{new Date(rec.saved_at).toLocaleString()}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestoreVersion(rec)}
                              className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-200 uppercase font-bold text-[10px]"
                              style={{ fontFamily: 'var(--font-cinzel)' }}
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
                <div className="text-amber-300/90 leading-relaxed text-xs">
                  {systemMessages.auth.guest_warning}
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full min-h-[44px] bg-cyan-950/70 hover:bg-cyan-900/80 border-2 border-cyan-300 text-cyan-100 font-bold uppercase tracking-wider flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(92,200,255,0.4)]"
                  style={{ fontFamily: 'var(--font-cinzel)' }}
                >
                  LOG IN / CREATE ACCOUNT 🛡️
                </button>
              </div>
            )}
          </div>
        </HudFrame>

        {/* Sound Effects Preference */}
        <HudFrame title="SYSTEM AUDIO EFFECTS" icon="🔊" delay={40}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-[#9bbacf]">Synthesized digital chimes for quest completion and level ups.</p>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`min-h-[44px] px-3.5 font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                soundOn
                  ? 'border-cyan-300 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
              style={{ fontFamily: 'var(--font-cinzel)' }}
            >
              {soundOn ? 'SOUND ON 🔊' : 'MUTED 🔇'}
            </button>
          </div>
        </HudFrame>

        {/* Visual Effects (HUD Particle Field) */}
        <HudFrame title="VISUAL EFFECTS: HUD PARTICLES" icon="✨" delay={80}>
          <div className="space-y-2">
            <p className="text-xs text-[#9bbacf]">Control canvas nodes, drifting lines, light trails, and energy grid.</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleToggleEffects('full')}
                className={`min-h-[44px] font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                  effectsMode === 'full'
                    ? 'border-2 border-cyan-300 bg-cyan-950/80 text-cyan-200 shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                    : 'border border-cyan-900/50 bg-slate-950 text-slate-400'
                }`}
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                FULL ✨
              </button>
              <button
                type="button"
                onClick={() => handleToggleEffects('lite')}
                className={`min-h-[44px] font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                  effectsMode === 'lite'
                    ? 'border-2 border-cyan-300 bg-cyan-950/80 text-cyan-200 shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                    : 'border border-cyan-900/50 bg-slate-950 text-slate-400'
                }`}
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                LITE ⚡
              </button>
              <button
                type="button"
                onClick={() => handleToggleEffects('off')}
                className={`min-h-[44px] font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                  effectsMode === 'off'
                    ? 'border-2 border-white bg-slate-800 text-white shadow'
                    : 'border border-cyan-900/50 bg-slate-950 text-slate-400'
                }`}
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                OFF 🛑
              </button>
            </div>
          </div>
        </HudFrame>

        {/* Difficulty Mode Selection */}
        <HudFrame title="DIFFICULTY MODE" icon="⚔️" delay={120}>
          <p className="text-xs text-[#9bbacf] mb-3">
            Alters daily study block targets between Normal (8 blocks) and Easy (6 blocks).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('normal')}
              className={`min-h-[44px] py-2 font-bold border transition-all text-center flex items-center justify-center text-xs tracking-wider ${
                mode === 'normal'
                  ? 'border-2 border-cyan-300 bg-cyan-950/80 text-cyan-200 shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                  : 'border border-cyan-900/50 bg-slate-950 text-slate-400'
              }`}
              style={{ fontFamily: 'var(--font-cinzel)' }}
            >
              NORMAL (8 BLOCKS)
            </button>
            <button
              onClick={() => handleToggleMode('easy')}
              className={`min-h-[44px] py-2 font-bold border transition-all text-center flex items-center justify-center text-xs tracking-wider ${
                mode === 'easy'
                  ? 'border-2 border-cyan-300 bg-cyan-950/80 text-cyan-200 shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                  : 'border border-cyan-900/50 bg-slate-950 text-slate-400'
              }`}
              style={{ fontFamily: 'var(--font-cinzel)' }}
            >
              EASY (6 BLOCKS)
            </button>
          </div>
        </HudFrame>

        {/* Daily Quest Arrival Cutscene */}
        <HudFrame title="DAILY QUEST CUTSCENE" icon="🎬" delay={160}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-[#9bbacf]">Holographic globe cutscene once per day when entering System.</p>
            </div>
            <button
              type="button"
              onClick={handleToggleCutscene}
              className={`min-h-[44px] px-3.5 font-bold border transition-all text-xs tracking-wider uppercase flex items-center justify-center ${
                cutsceneOn
                  ? 'border-cyan-300 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(92,200,255,0.3)]'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
              style={{ fontFamily: 'var(--font-cinzel)' }}
            >
              {cutsceneOn ? 'ON 🎬' : 'OFF ⏭️'}
            </button>
          </div>
        </HudFrame>

        {/* Replay Intro */}
        <HudFrame title="REPLAY SYSTEM INTRO" icon="📜" delay={200}>
          <div className="space-y-2">
            <p className="text-xs text-[#9bbacf]">Re-experience the ARISE opening cutscene or awakening sequence.</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleReplayIntro}
                className="min-h-[44px] px-3 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-400 text-cyan-200 font-bold uppercase tracking-wider flex items-center justify-center shadow-[0_0_8px_rgba(92,200,255,0.3)] text-xs"
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                ARISE VIDEO 🎬
              </button>
              <Link
                href="/intro"
                className="min-h-[44px] px-3 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/60 text-cyan-300 font-bold uppercase tracking-wider flex items-center justify-center text-xs"
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                AWAKENING 📜
              </Link>
            </div>
          </div>
        </HudFrame>

        {/* JSON Backup & Restore (Local-First Protection) */}
        <HudFrame title="JSON BACKUP & RESTORE" icon="💾" delay={240}>
          <div className="space-y-3">
            <p className="text-xs text-[#9bbacf] leading-relaxed">
              All your data is stored offline in browser IndexedDB. Export periodic JSON backups to prevent data loss.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportBackup}
                className="min-h-[44px] py-2.5 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-400 text-cyan-200 font-bold uppercase tracking-wider text-center flex items-center justify-center text-xs"
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                EXPORT JSON 💾
              </button>

              <label className="min-h-[44px] py-2.5 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/60 text-cyan-300 font-bold uppercase tracking-wider text-center cursor-pointer flex items-center justify-center text-xs" style={{ fontFamily: 'var(--font-cinzel)' }}>
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
        </HudFrame>

        {/* Rulebook Modal Trigger */}
        <HudFrame title="SYSTEM DIRECTIVES & PROTOCOLS" icon="⚡" delay={280}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-[#9bbacf]">Review XP formulas, Mana caps, Ranks, and Streak penalties.</p>
              <button
                onClick={() => {
                  playSystemChime();
                  setShowRules(!showRules);
                }}
                className="min-h-[44px] px-3.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-200 font-bold uppercase tracking-wider flex items-center justify-center text-xs"
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                {showRules ? 'CLOSE' : 'VIEW'}
              </button>
            </div>

            {showRules && (
              <div className="border border-cyan-500/40 bg-slate-950/80 p-3 space-y-2 text-xs text-slate-200">
                <p>&bull; <strong className="text-cyan-200">Study Block:</strong> 50 min deep focus = 50 XP + 5 MP</p>
                <p>&bull; <strong className="text-cyan-200">Physical Conditioning:</strong> Daily workout = 50 XP + 10 MP</p>
                <p>&bull; <strong className="text-cyan-200">Night Review:</strong> Review errors & flashcards = 50 XP + 5 MP</p>
                <p>&bull; <strong className="text-cyan-200">Daily Quest Clear Bonus:</strong> Completing all 3 quests = +150 XP</p>
                <p>&bull; <strong className="text-cyan-200">Lazy Day Evaluation:</strong> App automatically evaluates past days, updates streak, applies penalties for missed days, and converts unspent MP to XP at 5:00 AM.</p>
                <p>&bull; <strong className="text-cyan-200">Emergency Lockout:</strong> Triggered if you fail 2 consecutive days. Must complete a 100-rep physical quest to unlock the system.</p>
              </div>
            )}
          </div>
        </HudFrame>

        {/* Danger Zone: Hard Reset */}
        <HudFrame title="SYSTEM PURGE PROTOCOL" icon="⚠️" delay={320}>
          <div className="space-y-2">
            <p className="text-xs text-[#9bbacf]">
              Permanently purges all local data and reinitializes factory defaults.
            </p>

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="min-h-[44px] w-full py-2 bg-red-950/50 hover:bg-red-900/60 border border-red-500/50 text-red-400 font-bold uppercase tracking-wider text-center flex items-center justify-center text-xs"
                style={{ fontFamily: 'var(--font-cinzel)' }}
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
                    className="min-h-[44px] py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-center flex items-center justify-center text-xs"
                    style={{ fontFamily: 'var(--font-cinzel)' }}
                  >
                    YES, PURGE ALL
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[44px] py-2 bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-center flex items-center justify-center text-xs"
                    style={{ fontFamily: 'var(--font-cinzel)' }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </HudFrame>
      </div>
    </div>
  );
}
