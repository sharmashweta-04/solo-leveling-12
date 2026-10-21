'use client';

import { useEffect, useState } from 'react';
import { db } from '@/src/db/db';
import { seedDatabaseIfNeeded, PLAN_DAYS } from '@/src/db/seed';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { currentGameDay, getPlanDayNumber } from '@/src/engine/time';
import { ChapterProgress } from '@/src/types';
import Link from 'next/link';

export default function DebugPage() {
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const today = currentGameDay();
  const dayNumber = getPlanDayNumber(today);

  useEffect(() => {
    async function load() {
      await seedDatabaseIfNeeded();
      const allChapters = await db.chapter_progress.toArray();
      setChapters(allChapters);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 p-4 font-mono max-w-md mx-auto">
      <div className="border border-hunter-blue/40 bg-hunter-900/80 p-4 rounded shadow-[0_0_15px_rgba(0,217,255,0.2)] mb-4">
        <h1 className="text-xl text-hunter-blue font-bold tracking-wider mb-2">[ SYSTEM DEBUG WINDOW ]</h1>
        <p className="text-xs text-hunter-gray">Game Time (IST 05:00 boundary): <span className="text-hunter-blue">{today}</span></p>
        <p className="text-xs text-hunter-gray">Plan Day: <span className="text-hunter-cyan">{dayNumber <= 0 ? `Before Day 1 (${dayNumber})` : `Day ${dayNumber} of 45`}</span></p>
        <div className="mt-2 flex gap-2 text-xs">
          <Link href="/" className="px-2 py-1 bg-hunter-blue/20 border border-hunter-blue/50 text-hunter-blue hover:bg-hunter-blue/30 rounded">
            Dashboard
          </Link>
          <Link href="/intro" className="px-2 py-1 bg-hunter-cyan/20 border border-hunter-cyan/50 text-hunter-cyan hover:bg-hunter-cyan/30 rounded">
            Intro Test
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-hunter-blue animate-pulse">Initializing System Tables...</div>
      ) : (
        <div className="space-y-6 text-xs">
          {/* Chapters Count */}
          <section className="border border-hunter-blue/30 bg-hunter-900/60 p-3 rounded">
            <h2 className="text-sm text-hunter-blue font-bold mb-2">
              NCERT SYLLABUS GATES ({chapters.length} / {CHAPTERS_DATA.length})
            </h2>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {chapters.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between border-b border-hunter-800 pb-1">
                  <span className="font-bold text-hunter-cyan">{ch.id}</span>
                  <span className="truncate max-w-[190px] text-hunter-200">{ch.name}</span>
                  <span className="text-hunter-gray text-[10px]">{ch.subject}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 45 Plan Days */}
          <section className="border border-hunter-cyan/30 bg-hunter-900/60 p-3 rounded">
            <h2 className="text-sm text-hunter-cyan font-bold mb-2">
              45-DAY REVISION SCHEDULE ({PLAN_DAYS.length} Days)
            </h2>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {PLAN_DAYS.map((d) => (
                <div key={d.day} className="flex items-center justify-between text-[11px] border-b border-hunter-800 pb-1">
                  <span className="font-bold text-hunter-blue">Day {d.day}</span>
                  <span className="text-hunter-gray text-[10px]">{d.date}</span>
                  <div className="flex gap-1 text-[10px]">
                    <span className="px-1 bg-blue-900/50 rounded">{d.PHY.join(', ')}</span>
                    <span className="px-1 bg-purple-900/50 rounded">{d.CHEM.join(', ')}</span>
                    <span className="px-1 bg-green-900/50 rounded">{d.BIO.join(', ')}</span>
                  </div>
                  {d.is_raid && <span className="text-red-400 font-bold text-[10px]">[RAID]</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
