'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { seedDatabaseIfNeeded } from '@/src/db/seed';
import { ChapterProgress, Subject } from '@/src/types';
import Link from 'next/link';

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
    if (subject === 'Physics') return 'border-blue-500/40 hover:border-blue-400';
    if (subject === 'Chemistry') return 'border-purple-500/40 hover:border-purple-400';
    return 'border-green-500/40 hover:border-green-400';
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
        <span className="text-[10px] px-1.5 py-0.5 bg-green-900/60 border border-green-400 text-green-200 rounded font-bold">
          GATE CLEARED ⚔️
        </span>
      );
    }
    if (ch.topics_completed.length > 0) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/60 border border-hunter-blue text-hunter-cyan rounded">
          IN PROGRESS ({ch.topics_completed.length}/{ch.total_topics})
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 bg-hunter-900 border border-hunter-800 text-hunter-gray rounded">
        LOCKED 🔒
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-hunter-blue tracking-wider text-shadow-blue">
            [ 37-GATE DUNGEON ]
          </h1>
          <p className="text-[10px] text-hunter-gray">
            NCERT PCB MONARCH GATES &bull; SHADOW VAULT
          </p>
        </div>
        <Link
          href="/shadows"
          className="text-xs text-purple-300 border border-purple-500/50 bg-purple-950/40 hover:bg-purple-900/50 px-2 py-1 rounded font-bold"
        >
          SHADOWS 🌑
        </Link>
      </div>

      {/* Wings Filter Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 text-xs">
        {(['ALL', 'Physics', 'Chemistry', 'Biology', 'SHADOWS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1.5 rounded border whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'border-hunter-blue bg-hunter-blue/20 text-white font-bold shadow-[0_0_10px_rgba(0,217,255,0.3)]'
                : 'border-hunter-800 bg-hunter-950 text-hunter-gray hover:text-white'
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
        <div className="text-center py-12 text-hunter-blue animate-pulse text-xs">
          Scanning Dungeon Gates...
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredChapters.map((ch) => (
            <Link
              key={ch.id}
              href={`/gate/${ch.id}`}
              className={`block p-3 rounded-lg bg-hunter-900/80 border transition-all ${getWingBorderColor(
                ch.subject
              )} hover:bg-hunter-900`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-hunter-cyan">{ch.id}</span>
                  <span className="text-xs font-semibold text-hunter-100 truncate max-w-[200px]">
                    {ch.name}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-hunter-gray pt-1 border-t border-hunter-800">
                <span className="uppercase">{ch.subject} WING</span>
                <div>{getStatusBadge(ch)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
