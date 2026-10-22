'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { seedDatabaseIfNeeded } from '@/src/db/seed';
import { DifficultyMode } from '@/src/types';
import { playSystemChime } from '@/src/utils/audio';
import gameRules from '@/config/game_rules.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<DifficultyMode>('normal');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    async function load() {
      const modeSetting = await db.settings.get('difficulty_mode');
      if (modeSetting) setMode(modeSetting.value);
      const startSetting = await db.settings.get('start_date');
      if (startSetting) setStartDate(startSetting.value);
    }
    load();
  }, []);

  const handleToggleMode = async (newMode: DifficultyMode) => {
    playSystemChime();
    setMode(newMode);
    await db.settings.put({ key: 'difficulty_mode', value: newMode });
    setToastMessage(`[ SYSTEM ] Difficulty changed to ${newMode.toUpperCase()} mode.`);
  };

  const handleExportBackup = async () => {
    playSystemChime();
    // Gather all 9 Dexie tables
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
      settings: await db.settings.toArray()
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
    // Reset file input
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
          <p className="text-[10px] text-hunter-gray">
            HUNTER CONFIGURATION &bull; BACKUP VAULT
          </p>
        </div>
        <Link
          href="/debug"
          className="text-xs text-hunter-cyan border border-hunter-blue/40 px-2 py-1 rounded bg-hunter-blue/10"
        >
          DEBUG 🛠️
        </Link>
      </div>

      <div className="space-y-4 text-xs">
        {/* Difficulty Mode Selection */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5">
          <div className="text-xs font-bold text-hunter-blue mb-2">[ DIFFICULTY MODE ]</div>
          <p className="text-[10px] text-hunter-gray mb-3">
            Alters daily study block targets between Normal (8 blocks) and Easy (6 blocks).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('normal')}
              className={`py-2 rounded font-bold border transition-all text-center ${
                mode === 'normal'
                  ? 'border-hunter-blue bg-hunter-blue/30 text-white shadow-[0_0_10px_rgba(0,217,255,0.4)]'
                  : 'border-hunter-800 bg-hunter-950 text-hunter-gray'
              }`}
            >
              NORMAL (8 BLOCKS)
            </button>
            <button
              onClick={() => handleToggleMode('easy')}
              className={`py-2 rounded font-bold border transition-all text-center ${
                mode === 'easy'
                  ? 'border-hunter-cyan bg-hunter-cyan/30 text-white shadow-[0_0_10px_rgba(0,217,255,0.4)]'
                  : 'border-hunter-800 bg-hunter-950 text-hunter-gray'
              }`}
            >
              EASY (6 BLOCKS)
            </button>
          </div>
        </div>

        {/* Replay Intro */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 flex justify-between items-center">
          <div>
            <div className="font-bold text-hunter-100">[ REPLAY INTRO MESSAGE ]</div>
            <p className="text-[10px] text-hunter-gray">Experience the System awakening sequence again.</p>
          </div>
          <Link
            href="/intro"
            className="px-3 py-1.5 bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue hover:text-white rounded text-xs font-bold uppercase tracking-wider"
          >
            REPLAY
          </Link>
        </div>

        {/* JSON Backup & Restore (Local-First Protection) */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 space-y-3">
          <div className="text-xs font-bold text-hunter-cyan">[ JSON BACKUP & RESTORE ]</div>
          <p className="text-[10px] text-hunter-gray leading-relaxed">
            All your data is stored offline in browser IndexedDB. Export periodic JSON backups to prevent data loss.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportBackup}
              className="py-2.5 bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue rounded font-bold uppercase tracking-wider text-center"
            >
              EXPORT JSON 💾
            </button>

            <label className="py-2.5 bg-hunter-cyan/20 hover:bg-hunter-cyan/30 border border-hunter-cyan text-hunter-cyan rounded font-bold uppercase tracking-wider text-center cursor-pointer">
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

        {/* Read-Only Game Rules Viewer */}
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5">
          <div className="flex justify-between items-center">
            <div className="font-bold text-hunter-100">[ SYSTEM RULES ENCYCLOPEDIA ]</div>
            <button
              onClick={() => setShowRules(!showRules)}
              className="text-xs text-hunter-cyan underline"
            >
              {showRules ? 'HIDE' : 'VIEW'}
            </button>
          </div>

          {showRules && (
            <div className="mt-3 pt-3 border-t border-hunter-800 text-[11px] space-y-2 text-hunter-200">
              <div className="flex justify-between">
                <span>Game Day Boundary:</span>
                <span className="text-hunter-blue font-bold">{gameRules.day.reset_time} to {gameRules.day.expire_time} IST</span>
              </div>
              <div className="flex justify-between">
                <span>Daily MP Cap:</span>
                <span className="text-hunter-blue font-bold">{gameRules.mp.daily_cap} MP</span>
              </div>
              <div className="flex justify-between">
                <span>MP-to-XP Midnight Rate:</span>
                <span className="text-hunter-blue font-bold">1 MP = {gameRules.mp.unspent_to_xp} XP</span>
              </div>
              <div className="flex justify-between">
                <span>Failed Day Penalty:</span>
                <span className="text-red-400 font-bold">{gameRules.penalties.failed_daily_quest_xp} XP</span>
              </div>
              <div className="flex justify-between">
                <span>Boss Raid Bonus:</span>
                <span className="text-hunter-green font-bold">+{gameRules.raid_bonus_xp} XP</span>
              </div>
              <div className="flex justify-between">
                <span>Rest Tokens Available:</span>
                <span className="text-hunter-cyan font-bold">{gameRules.rest_tokens} Tokens</span>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone: Purge & Reset */}
        <div className="border border-red-500/40 bg-red-950/20 rounded-lg p-3.5 space-y-2">
          <div className="text-xs font-bold text-red-400">[ DANGER ZONE: SYSTEM RESET ]</div>
          <p className="text-[10px] text-red-300">
            Irreversibly deletes all ledgers, progress, and cards. Export a backup first.
          </p>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500 text-red-300 rounded font-bold uppercase tracking-wider"
            >
              RESET ALL DATA
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] text-red-400 font-bold text-center">
                ARE YOU ABSOLUTELY CERTAIN?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleResetDatabase}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded uppercase tracking-wider"
                >
                  CONFIRM PURGE
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-2 bg-hunter-800 text-hunter-gray rounded uppercase tracking-wider"
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
