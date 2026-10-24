'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { seedDatabaseIfNeeded } from '@/src/db/seed';
import { ChapterProgress, Subject } from '@/src/types';
import { sfx } from '@/src/utils/systemAudio';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';

export default function DungeonPage() {
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | Subject | 'SHADOWS'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await seedDatabaseIfNeeded();
      const all = await db.chapter_progress.toArray();
      setChapters(all);
      setLoading(false);
    }
    load();
  }, []);

  const filteredChapters = chapters.filter((ch) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'SHADOWS') return ch.shadow_extracted;
    return ch.subject === activeTab;
  });

  const getWingBorderColor = (subject: Subject) => {
    if (subject === 'Physics') return 'border-blue-500/50 hover:border-blue-400 bg-blue-950/20';
    if (subject === 'Chemistry') return 'border-purple-500/50 hover:border-purple-400 bg-purple-950/20';
    return 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20';
  };

  const getStatusBadge = (ch: ChapterProgress) => {
    if (ch.shadow_extracted) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/60 border border-purple-400 text-purple-200 rounded font-bold shadow-[0_0_8px_rgba(168,85,247,0.5)]">
          SHADOW EXTRACTED 🌑
        </span>
      );
    }
    if (ch.boss_cleared) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/60 border border-emerald-400 text-emerald-200 rounded font-bold">
          GATE CLEARED ⚔️
        </span>
      );
    }
    if (ch.topics_completed.length > 0) {
      return (
        <span className="text-xs px-2 py-0.5 bg-blue-950 border border-blue-500 text-cyan-300 rounded font-semibold">
          IN PROGRESS ({ch.topics_completed.length}/{ch.total_topics})
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 rounded">
        LOCKED 🔒
      </span>
    );
  };

  return (
    <div className="font-mono pb-24 max-w-md mx-auto select-none space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-cyan-500/30 pb-3 mb-2">
        <div>
          <h1 className="text-base font-extrabold text-cyan-400 tracking-wider text-shadow-blue">
            [ 37-GATE DUNGEON ]
          </h1>
          <p className="text-xs text-slate-400">
            NCERT PCB MONARCH GATES &bull; SHADOW VAULT
          </p>
        </div>
        <Link
          href="/shadows"
          className="text-xs text-purple-300 border border-purple-500/50 bg-purple-950/40 hover:bg-purple-900/50 px-2.5 py-1.5 rounded font-bold min-h-[44px] flex items-center"
        >
          SHADOWS 🌑
        </Link>
      </div>

      {/* Wings Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        {(['ALL', 'Physics', 'Chemistry', 'Biology', 'SHADOWS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              sfx.click();
              setActiveTab(tab);
            }}
            className={`min-h-[44px] px-3 py-1.5 rounded border whitespace-nowrap transition-all text-xs flex items-center justify-center ${
              activeTab === tab
                ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'ALL'
              ? 'ALL (37)'
              : tab === 'Physics'
              ? 'PHYSICS (14)'
              : tab === 'Chemistry'
              ? 'CHEMISTRY (10)'
              : tab === 'Biology'
              ? 'BIOLOGY (13)'
              : 'SHADOW ARMY'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-cyan-400 animate-pulse text-xs">
          Scanning Dungeon Gates...
        </div>
      ) : (
        <HudFrame title={`DUNGEON GATES (${filteredChapters.length})`} icon="⛩️" delay={0}>
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredChapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/gate/${ch.id}`}
                className={`min-h-[44px] block p-3 rounded-lg border transition-all ${getWingBorderColor(
                  ch.subject
                )} hover:bg-slate-900/80 backdrop-blur-sm`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-cyan-300">{ch.id}</span>
                    <span className="text-xs font-semibold text-slate-100 truncate max-w-[200px]">
                      {ch.name}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span className="uppercase">{ch.subject} WING</span>
                  <div>{getStatusBadge(ch)}</div>
                </div>
              </Link>
            ))}
          </div>
        </HudFrame>
      )}
    </div>
  );
}
