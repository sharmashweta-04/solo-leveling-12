'use client';

import React from 'react';
import { useAuth } from '@/src/context/AuthContext';

export default function GuestUploadModal() {
  const { guestUploadData, resolveGuestUpload } = useAuth();

  if (!guestUploadData) return null;

  const { guestSnapshot } = guestUploadData;
  const guestXpTotal = guestSnapshot?.xp_ledger?.reduce((acc: number, entry: any) => acc + (entry.amount || 0), 0) || 0;
  const guestQuestsCount = guestSnapshot?.quest_logs?.filter((q: any) => q.is_completed)?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--sys-bg-panel)] border border-[var(--sys-border)] rounded-lg shadow-2xl p-6 text-white animate-in fade-in duration-200">
        <div className="flex items-center gap-2 mb-3 text-cyan-400 font-mono text-sm uppercase tracking-wider font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          [ SYSTEM ] Guest Progress Detected
        </div>

        <p className="text-sm text-slate-300 mb-4 font-mono">
          We found existing progress on this device from guest play:
        </p>

        <div className="bg-slate-900/90 border border-slate-800 rounded p-3 mb-6 space-y-1 text-xs font-mono">
          <div className="text-slate-400">Total XP on device: <span className="text-cyan-400 font-bold">+{guestXpTotal} XP</span></div>
          <div className="text-slate-400">Quests Cleared: <span className="text-slate-200 font-bold">{guestQuestsCount}</span></div>
        </div>

        <p className="text-xs text-slate-400 mb-6 font-mono">
          Would you like to upload this progress to your new hunter account?
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => resolveGuestUpload(true)}
            className="flex-1 min-h-[44px] bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold uppercase rounded transition-colors"
          >
            Upload to Account
          </button>
          <button
            onClick={() => resolveGuestUpload(false)}
            className="flex-1 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold uppercase rounded transition-colors"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
