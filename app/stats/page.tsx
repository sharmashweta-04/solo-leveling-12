'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { MockResult, XPLedgerEntry, FocusSession, GrimoireEntry } from '@/src/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid
} from 'recharts';
import Link from 'next/link';

export default function StatsPage() {
  const [xpHistory, setXpHistory] = useState<{ date: string; cumulativeXp: number }[]>([]);
  const [mocks, setMocks] = useState<MockResult[]>([]);
  const [subjectHours, setSubjectHours] = useState<{ subject: string; hours: number }[]>([]);
  const [weakestChapters, setWeakestChapters] = useState<{ chapter: string; count: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // 1. XP Over Time
      const xpEntries = await db.xp_ledger.orderBy('date').toArray();
      let runningTotal = 0;
      const groupedMap = new Map<string, number>();

      xpEntries.forEach((e) => {
        runningTotal += e.amount;
        groupedMap.set(e.date, runningTotal);
      });

      const xpData = Array.from(groupedMap.entries()).map(([date, cumulativeXp]) => ({
        date: date.slice(5), // MM-DD
        cumulativeXp
      }));
      setXpHistory(xpData);

      // 2. Mock Test Results
      const mockList = await db.mock_results.orderBy('day_number').toArray();
      setMocks(mockList);

      // 3. Hours per subject from focus_sessions
      const sessions = await db.focus_sessions.toArray();
      const hoursMap: Record<string, number> = { Physics: 0, Chemistry: 0, Biology: 0 };
      sessions.forEach((s) => {
        if (hoursMap[s.subject] !== undefined) {
          hoursMap[s.subject] += s.duration_minutes / 60;
        }
      });
      setSubjectHours([
        { subject: 'Physics', hours: Math.round(hoursMap.Physics * 10) / 10 },
        { subject: 'Chemistry', hours: Math.round(hoursMap.Chemistry * 10) / 10 },
        { subject: 'Biology', hours: Math.round(hoursMap.Biology * 10) / 10 }
      ]);

      // 4. Weakest Chapters from Grimoire
      const grimoireEntries = await db.grimoire.toArray();
      const countMap: Record<string, number> = {};
      grimoireEntries.forEach((g) => {
        countMap[g.chapter_id] = (countMap[g.chapter_id] || 0) + 1;
      });
      const sortedWeak = Object.entries(countMap)
        .map(([chapter, count]) => ({ chapter, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setWeakestChapters(sortedWeak);

      // 5. Streak
      const strk = await db.settings.get('current_streak');
      setStreak(Number(strk?.value || 0));

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-hunter-blue tracking-wider text-shadow-blue">
            [ HUNTER ANALYTICS ]
          </h1>
          <p className="text-[10px] text-hunter-gray">
            COMBAT STATS &bull; XP PROGRESSION &bull; MOCK TRENDS
          </p>
        </div>
        <div className="text-xs font-bold text-hunter-cyan">{streak} DAYS 🔥</div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-hunter-blue animate-pulse text-xs">
          Computing Hunter Analytics...
        </div>
      ) : (
        <div className="space-y-4">
          {/* XP Progression Chart */}
          <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
            <div className="text-xs font-bold text-hunter-blue mb-2">[ EXP ACCUMULATION CURVE ]</div>
            <div className="h-44 w-full">
              {xpHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={xpHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" stroke="#5f8a9a" fontSize={10} tickLine={false} />
                    <YAxis stroke="#5f8a9a" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #00d4ff', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="cumulativeXp" stroke="#00d4ff" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-hunter-gray italic">
                  Complete focus blocks to build XP curve.
                </div>
              )}
            </div>
          </div>

          {/* PW Mock Test Trends */}
          <div className="border border-red-500/40 bg-hunter-900/80 rounded-lg p-3.5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-red-400">[ PW MOCK SCORE TRAJECTORY ]</span>
              <Link href="/raid" className="text-[10px] text-hunter-cyan underline">RECORD RAID ↗</Link>
            </div>
            <div className="h-44 w-full">
              {mocks.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mocks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="day_number" stroke="#5f8a9a" fontSize={10} tickFormatter={(v) => `D${v}`} />
                    <YAxis stroke="#5f8a9a" fontSize={10} domain={[0, 720]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #ff3366', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="total_marks" stroke="#ff3366" strokeWidth={2} dot={{ r: 3 }} name="Total (/720)" />
                    <Line type="monotone" dataKey="physics_score" stroke="#3b82f6" strokeWidth={1} dot={false} name="PHY (/180)" />
                    <Line type="monotone" dataKey="chemistry_score" stroke="#a855f7" strokeWidth={1} dot={false} name="CHEM (/180)" />
                    <Line type="monotone" dataKey="biology_score" stroke="#22c55e" strokeWidth={1} dot={false} name="BIO (/360)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-hunter-gray italic">
                  No Boss Raid mock results recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Subject Study Hours */}
          <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5">
            <div className="text-xs font-bold text-hunter-cyan mb-2">[ STUDY HOURS PER SUBJECT ]</div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="subject" stroke="#5f8a9a" fontSize={10} />
                  <YAxis stroke="#5f8a9a" fontSize={10} unit="h" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #00d4ff', fontSize: '11px' }}
                  />
                  <Bar dataKey="hours" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weakest Chapters Retrospective */}
          <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5">
            <div className="text-xs font-bold text-purple-400 mb-2">[ WEAKEST CHAPTER RETROSPECTIVE ]</div>
            <p className="text-[10px] text-hunter-gray mb-3">
              Identified by Grimoire error frequency. Target these in your next focus sessions.
            </p>
            {weakestChapters.length > 0 ? (
              <div className="space-y-1.5">
                {weakestChapters.map((w, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-hunter-950 rounded border border-hunter-800">
                    <span className="font-bold text-hunter-cyan">{w.chapter}</span>
                    <span className="text-[10px] text-red-400 font-semibold">{w.count} errors recorded</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-hunter-gray italic text-center py-2">
                No weak chapters logged yet. Keep solving DPPs!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
