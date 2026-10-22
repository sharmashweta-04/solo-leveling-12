'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { ChapterProgress } from '@/src/types';
import Link from 'next/link';

export default function ShadowsPage() {
  const [shadows, setShadows] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const records = await db.chapter_progress.where({ shadow_extracted: 1 as any }).toArray();
      setShadows(records);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-purple-500/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-purple-400 tracking-wider flex items-center gap-2">
            <span>[ SHADOW MONARCH ARMY ]</span>
          </h1>
          <p className="text-xs text-hunter-400">
            EXTRACTED REVISION SOULS &bull; {shadows.length} / 37 ACTIVE
          </p>
        </div>
        <Link
          href="/dungeon"
          className="text-xs text-hunter-cyan border border-hunter-blue/40 px-2.5 py-1.5 rounded bg-hunter-blue/10 min-h-[44px] flex items-center"
        >
          DUNGEON ⛩️
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-purple-400 animate-pulse text-xs">
          Summoning Shadow Army...
        </div>
      ) : shadows.length === 0 ? (
        <div className="border border-purple-500/30 bg-purple-950/20 rounded-xl p-8 text-center space-y-3">
          <div className="text-3xl animate-pulse">🌑</div>
          <h2 className="text-sm font-bold text-purple-300">[ NO SHADOWS EXTRACTED YET ]</h2>
          <p className="text-xs text-hunter-400 leading-relaxed">
            Clear Gate Boss tests (score ≥ 75% on PW DPPs) in the Dungeon to extract chapters into your Shadow Army.
          </p>
          <Link
            href="/dungeon"
            className="min-h-[44px] inline-flex items-center mt-2 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400 text-purple-200 rounded text-xs font-bold uppercase tracking-wider"
          >
            ENTER THE DUNGEON
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {shadows.map((sh) => (
            <Link
              key={sh.id}
              href={`/gate/${sh.id}`}
              className="min-h-[44px] block p-3.5 rounded-lg bg-purple-950/30 border border-purple-500/40 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-extrabold text-sm text-purple-300">{sh.id} &bull; {sh.name}</span>
                <span className="text-xs px-2 py-0.5 bg-purple-900/60 rounded text-purple-200 font-bold">
                  PW SCORE: {sh.boss_score}/20
                </span>
              </div>
              <div className="flex justify-between text-xs text-hunter-400 pt-1 border-t border-purple-900/40">
                <span className="uppercase">{sh.subject} SOLDIER</span>
                <span className="text-hunter-cyan underline font-bold">VIEW GATE ↗</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
