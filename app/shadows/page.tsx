'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { ChapterProgress } from '@/src/types';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';

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
    <div className="font-mono pb-24 max-w-md mx-auto select-none space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-purple-500/40 pb-3 mb-2">
        <div>
          <h1 className="text-base font-extrabold text-purple-400 tracking-wider flex items-center gap-2">
            <span>[ SHADOW MONARCH ARMY ]</span>
          </h1>
          <p className="text-xs text-slate-400">
            EXTRACTED REVISION SOULS &bull; {shadows.length} / 37 ACTIVE
          </p>
        </div>
        <Link
          href="/dungeon"
          className="text-xs text-cyan-300 border border-cyan-500/40 px-2.5 py-1.5 rounded bg-cyan-950/40 min-h-[44px] flex items-center"
        >
          DUNGEON ⛩️
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-purple-400 animate-pulse text-xs">
          Summoning Shadow Army...
        </div>
      ) : shadows.length === 0 ? (
        <HudFrame title="NO SHADOWS EXTRACTED YET" icon="🌑" delay={0}>
          <div className="text-center py-4 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Clear Gate Boss tests (score ≥ 75% on PW DPPs) in the Dungeon to extract chapters into your Shadow Army.
            </p>
            <Link
              href="/dungeon"
              className="min-h-[44px] inline-flex items-center mt-2 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400 text-purple-200 rounded text-xs font-bold uppercase tracking-wider"
            >
              ENTER THE DUNGEON
            </Link>
          </div>
        </HudFrame>
      ) : (
        <HudFrame title={`SHADOW VAULT (${shadows.length} / 37 ACTIVE)`} icon="🌑" delay={80}>
          <div className="space-y-2.5">
            {shadows.map((sh) => (
              <Link
                key={sh.id}
                href={`/gate/${sh.id}`}
                className="min-h-[44px] block p-3 rounded-lg bg-slate-950/80 border border-purple-500/40 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-extrabold text-xs text-purple-300">{sh.id} &bull; {sh.name}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-purple-900/60 rounded text-purple-200 font-bold">
                    PW SCORE: {sh.boss_score}/20
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-purple-900/40">
                  <span className="uppercase">{sh.subject} SOLDIER</span>
                  <span className="text-cyan-300 underline font-bold">VIEW GATE ↗</span>
                </div>
              </Link>
            ))}
          </div>
        </HudFrame>
      )}
    </div>
  );
}
