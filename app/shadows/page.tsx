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
    <div className="pb-24 max-w-md mx-auto select-none space-y-4 px-1">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#5cc8ff]/30 pb-3 mb-2">
        <div>
          <h1
            className="text-lg font-bold text-cyan-200 tracking-wider text-shadow-blue flex items-center gap-2"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            SHADOW MONARCH ARMY
          </h1>
          <p className="text-xs text-[#9bbacf]">
            EXTRACTED REVISION SOULS &bull; {shadows.length} / 37 ACTIVE
          </p>
        </div>
        <Link
          href="/dungeon"
          className="text-xs text-cyan-300 border border-cyan-500/40 px-3 py-1.5 bg-cyan-950/40 min-h-[44px] flex items-center font-bold tracking-wider"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          DUNGEON ⛩️
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-cyan-300 animate-pulse text-xs tracking-wider" style={{ fontFamily: 'var(--font-cinzel)' }}>
          Summoning Shadow Army...
        </div>
      ) : shadows.length === 0 ? (
        <HudFrame title="NO SHADOWS EXTRACTED YET" icon="🌑" delay={0}>
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              Clear Gate Boss tests (score &ge; 75% on PW DPPs) in the Dungeon to extract chapters into your Shadow Army.
            </p>
            <Link
              href="/dungeon"
              className="min-h-[44px] inline-flex items-center mt-2 px-4 py-2 bg-cyan-950/60 hover:bg-cyan-900/60 border-2 border-cyan-300 text-cyan-100 font-bold uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-cinzel)' }}
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
                className="hud2-row block p-3 transition-all hover:border-white"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-cyan-200" style={{ fontFamily: 'var(--font-cinzel)' }}>
                    {sh.id} &bull; {sh.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-200 font-bold" style={{ fontFamily: 'var(--font-cinzel)' }}>
                    PW SCORE: {sh.boss_score}/20
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[#9bbacf] pt-1 border-t border-cyan-900/40">
                  <span className="uppercase">{sh.subject} SOLDIER</span>
                  <span className="text-cyan-300 font-bold" style={{ fontFamily: 'var(--font-cinzel)' }}>VIEW GATE ↗</span>
                </div>
              </Link>
            ))}
          </div>
        </HudFrame>
      )}
    </div>
  );
}
