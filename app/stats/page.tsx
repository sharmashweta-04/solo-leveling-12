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
import HudFrame from '@/src/components/hud/HudFrame';

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
    <div className="pb-24 max-w-md mx-auto p-2 select-none space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#5cc8ff]/30 pb-3 mb-2">
        <div>
          <h1
            className="text-lg font-bold text-cyan-200 tracking-wider text-shadow-blue"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            HUNTER ANALYTICS
          </h1>
          <p className="text-xs text-[#9bbacf]">
            COMBAT STATS &bull; XP PROGRESSION &bull; MOCK TRENDS
          </p>
        </div>
        <div
          className="text-xs font-bold text-cyan-300"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          {streak} DAYS 🔥
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-cyan-300 animate-pulse text-xs tracking-wider" style={{ fontFamily: 'var(--font-cinzel)' }}>
          Computing Hunter Analytics...
        </div>
      ) : (
        <div className="space-y-4">
          {/* XP Progression Chart */}
          <HudFrame title="EXP ACCUMULATION CURVE" icon="📈" delay={0}>
            <div className="h-44 w-full pt-2">
              {xpHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={xpHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#102544" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#030a18', border: '1px solid #5cc8ff', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="cumulativeXp" stroke="#5cc8ff" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Complete focus blocks to build XP curve.
                </div>
              )}
            </div>
          </HudFrame>

          {/* PW Mock Test Trends */}
          <HudFrame title="PW MOCK SCORE TRAJECTORY" icon="⚔️" delay={40}>
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs text-[#9bbacf]">NEET Score Evaluation (/720)</span>
              <Link
                href="/raid"
                className="text-xs text-cyan-300 font-bold min-h-[44px] flex items-center"
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                RECORD RAID ↗
              </Link>
            </div>
            <div className="h-44 w-full">
              {mocks.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mocks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#102544" />
                    <XAxis dataKey="day_number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `D${v}`} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 720]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#030a18', border: '1px solid #ff4466', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="total_marks" stroke="#ff4466" strokeWidth={2} dot={{ r: 3 }} name="Total (/720)" />
                    <Line type="monotone" dataKey="physics_score" stroke="#5cc8ff" strokeWidth={1} dot={false} name="PHY (/180)" />
                    <Line type="monotone" dataKey="chemistry_score" stroke="#b388ff" strokeWidth={1} dot={false} name="CHEM (/180)" />
                    <Line type="monotone" dataKey="biology_score" stroke="#4ade80" strokeWidth={1} dot={false} name="BIO (/360)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  No Boss Raid mock results recorded yet.
                </div>
              )}
            </div>
          </HudFrame>

          {/* Subject Study Hours */}
          <HudFrame title="STUDY HOURS PER SUBJECT" icon="⌛" delay={80}>
            <div className="h-36 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#102544" />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="h" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#030a18', border: '1px solid #5cc8ff', fontSize: '12px' }}
                  />
                  <Bar dataKey="hours" fill="#5cc8ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </HudFrame>

          {/* Weakest Chapters Retrospective */}
          <HudFrame title="WEAKEST CHAPTER RETROSPECTIVE" icon="🎯" delay={120}>
            <p className="text-xs text-[#9bbacf] mb-3">
              Identified by Grimoire error frequency. Target these in your next focus sessions.
            </p>
            {weakestChapters.length > 0 ? (
              <div className="space-y-1.5">
                {weakestChapters.map((w, idx) => (
                  <div key={idx} className="hud2-row justify-between text-xs p-2.5 min-h-[44px]">
                    <span className="font-bold text-cyan-200" style={{ fontFamily: 'var(--font-cinzel)' }}>{w.chapter}</span>
                    <span className="text-xs text-red-400 font-semibold">{w.count} errors recorded</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-2">
                No weak chapters logged yet. Keep solving DPPs!
              </p>
            )}
          </HudFrame>
        </div>
      )}
    </div>
  );
}
