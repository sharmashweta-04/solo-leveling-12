'use client';

import { playSystemChime } from '@/src/utils/audio';
import { useEffect } from 'react';

interface LevelUpModalProps {
  levelEvent: { level: number } | null;
  rankEvent: { rank: string; title: string } | null;
  onClose: () => void;
}

export default function LevelUpModal({ levelEvent, rankEvent, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (levelEvent || rankEvent) {
      playSystemChime();
    }
  }, [levelEvent, rankEvent]);

  if (!levelEvent && !rankEvent) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono select-none cursor-pointer animate-in fade-in duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-hunter-950 border-2 border-hunter-blue p-6 rounded-xl shadow-[0_0_35px_rgba(0,217,255,0.6)] text-center space-y-4"
      >
        <div className="text-xs text-hunter-cyan tracking-widest uppercase">[ SYSTEM NOTIFICATION ]</div>

        {rankEvent && (
          <div className="py-2 space-y-2 border-b border-hunter-blue/40">
            <div className="text-xs text-hunter-gray tracking-wider">RANK INCREASED</div>
            <div className="text-4xl font-extrabold text-hunter-blue text-shadow-blue">
              {rankEvent.rank}-RANK
            </div>
            <div className="text-sm font-semibold text-hunter-100">{rankEvent.title}</div>
          </div>
        )}

        {levelEvent && (
          <div className="py-2 space-y-2">
            <div className="text-xs text-hunter-gray tracking-wider">STATUS ADVANCEMENT</div>
            <div className="text-3xl font-extrabold text-hunter-cyan text-shadow-cyan">
              LEVEL {levelEvent.level}
            </div>
            <p className="text-xs text-hunter-300">All attributes enhanced. Mana pool expanded.</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue hover:text-white rounded font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,217,255,0.4)]"
        >
          CLAIM REWARD
        </button>
      </div>
    </div>
  );
}
