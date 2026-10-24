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
    <div className="select-none space-y-5">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-[#5cc8ff]/30 pb-3 pt-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-wider text-shadow-blue">
            37-GATE DUNGEON
          </h1>
          <p className="text-[15px] font-semibold text-[#8ab4d8] tracking-wide mt-0.5">
            NCERT PCB MONARCH GATES &bull; SHADOW VAULT
          </p>
        </div>
        <Link
          href="/shadows"
          className="hud2-row !min-h-[44px] px-3 py-1 font-[family-name:var(--font-cinzel)] font-bold text-xs text-[#c084fc] border-[#c084fc]/50 hover:bg-[#c084fc]/20 flex items-center"
        >
          SHADOWS 🌑
        </Link>
      </header>

      {/* Wings Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        {(['ALL', 'Physics', 'Chemistry', 'Biology', 'SHADOWS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              sfx.click();
              setActiveTab(tab);
            }}
            className={`min-h-[44px] px-3.5 py-1.5 rounded border whitespace-nowrap transition-all font-[family-name:var(--font-cinzel)] font-bold text-xs flex items-center justify-center ${
              activeTab === tab
                ? 'border-[#5cc8ff] bg-[#5cc8ff]/20 text-[#dff3ff] shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                : 'border-[#1b3558]/70 bg-[#050f24]/70 text-[#8ab4d8] hover:text-[#dff3ff]'
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
        <div className="text-center py-12 text-[#5cc8ff] animate-pulse text-sm font-semibold">
          Scanning Dungeon Gates...
        </div>
      ) : (
        <HudFrame title={`DUNGEON GATES (${filteredChapters.length})`} icon="⛩️" delay={0}>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredChapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/gate/${ch.id}`}
                className="hud2-row justify-between mb-2 hover:border-[#5cc8ff] transition-all"
              >
                <div className="flex-1 truncate mr-2">
                  <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff] mr-2">[{ch.id}]</span>
                  <span className="text-[#dff3ff] font-semibold text-[15px]">{ch.name}</span>
                </div>
                <div className="text-right flex-shrink-0 text-xs font-[family-name:var(--font-cinzel)] font-bold">
                  {getStatusBadge(ch)}
                </div>
              </Link>
            ))}
          </div>
        </HudFrame>
      )}
    </div>
  );
}
