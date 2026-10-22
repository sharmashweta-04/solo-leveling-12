'use client';

import React from 'react';
import { useAuth } from '@/src/context/AuthContext';
import systemMessages from '@/config/system_messages.json';

export default function ConflictModal() {
  const { conflictData, resolveConflict } = useAuth();

  if (!conflictData) return null;

  const { cloudSnapshot, localSnapshot } = conflictData;

  const cloudXpTotal = cloudSnapshot.data?.xp_ledger?.reduce((acc: number, entry: any) => acc + (entry.amount || 0), 0) || 0;
  const localXpTotal = localSnapshot?.xp_ledger?.reduce((acc: number, entry: any) => acc + (entry.amount || 0), 0) || 0;

  const cloudQuestsCount = cloudSnapshot.data?.quest_logs?.filter((q: any) => q.is_completed)?.length || 0;
  const localQuestsCount = localSnapshot?.quest_logs?.filter((q: any) => q.is_completed)?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[var(--sys-bg-panel)] border-2 border-[var(--sys-accent-red)] rounded-lg shadow-2xl p-6 text-white animate-in fade-in duration-200">
        <div className="flex items-center gap-2 mb-3 text-[var(--sys-accent-red)] font-mono text-sm uppercase tracking-wider font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-accent-red)] animate-pulse" />
          [ SYSTEM ] Conflict Detected
        </div>

        <p className="text-sm text-slate-300 mb-6 font-mono">
          {systemMessages.auth.conflict}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Cloud Version Card */}
          <div className="bg-slate-900/80 border border-blue-500/40 rounded-lg p-4">
            <div className="text-xs text-blue-400 font-mono font-bold uppercase mb-2">
              ☁ Cloud Save (Rev {cloudSnapshot.revision})
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              <div>Total XP: <span className="text-blue-400 font-mono font-bold">+{cloudXpTotal}</span></div>
              <div>Cleared Quests: <span className="text-slate-200 font-mono">{cloudQuestsCount}</span></div>
              <div className="text-[11px] text-slate-400 pt-1">
                Updated: {new Date(cloudSnapshot.updated_at).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => resolveConflict('cloud')}
              className="mt-4 w-full min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase rounded transition-colors"
            >
              Keep Cloud Save
            </button>
          </div>

          {/* Local Version Card */}
          <div className="bg-slate-900/80 border border-emerald-500/40 rounded-lg p-4">
            <div className="text-xs text-emerald-400 font-mono font-bold uppercase mb-2">
              📱 This Device
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              <div>Total XP: <span className="text-emerald-400 font-mono font-bold">+{localXpTotal}</span></div>
              <div>Cleared Quests: <span className="text-slate-200 font-mono">{localQuestsCount}</span></div>
              <div className="text-[11px] text-slate-400 pt-1">
                Active on device
              </div>
            </div>
            <button
              onClick={() => resolveConflict('local')}
              className="mt-4 w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase rounded transition-colors"
            >
              Keep Device Save
            </button>
          </div>
        </div>

        {/* Download Both button */}
        <div className="border-t border-slate-800 pt-4">
          <button
            onClick={() => resolveConflict('download_both')}
            className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold uppercase rounded transition-colors flex items-center justify-center gap-2"
          >
            📥 Download Both Saves as JSON Backup (Recommended)
          </button>
        </div>
      </div>
    </div>
  );
}
