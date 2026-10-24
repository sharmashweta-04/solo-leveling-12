'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/src/db/db';
import { currentGameDay, getPlanDayNumber } from '@/src/engine/time';
import { sfx } from '@/src/utils/systemAudio';
import { MockResult } from '@/src/types';
import gameRules from '@/config/game_rules.json';
import systemMessages from '@/config/system_messages.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import planConfig from '@/config/plan_45days.json';
import HudFrame from '@/src/components/hud/HudFrame';

export default function BossRaidPage() {
  const today = currentGameDay();
  const dayNum = getPlanDayNumber(today);
  const planDay = planConfig.days.find((d) => d.day === Math.max(1, dayNum));
  const dayType = (planDay?.day_type || 'raid_full') as keyof typeof gameRules.day_types;
  const dayTypeConfig = gameRules.day_types[dayType];
  const raidMinutes = (dayTypeConfig && 'raid_minutes' in dayTypeConfig) ? (dayTypeConfig as any).raid_minutes : 180;
  const RAID_DURATION_SECONDS = raidMinutes * 60;
  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pastMocks, setPastMocks] = useState<MockResult[]>([]);

  // Form fields
  const [totalMarks, setTotalMarks] = useState<number>(540);
  const [attempted, setAttempted] = useState<number>(160);
  const [correct, setCorrect] = useState<number>(140);
  const [wrong, setWrong] = useState<number>(20);
  const [physicsScore, setPhysicsScore] = useState<number>(140);
  const [chemistryScore, setChemistryScore] = useState<number>(150);
  const [biologyScore, setBiologyScore] = useState<number>(250);
  const [timeTaken, setTimeTaken] = useState<number>(175);
  const [notes, setNotes] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load past mocks & restore active session
  useEffect(() => {
    async function load() {
      const results = await db.mock_results.toArray();
      setPastMocks(results);

      const savedStartedAt = localStorage.getItem('raid_started_at');
      if (savedStartedAt) {
        const startTime = new Date(savedStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed < RAID_DURATION_SECONDS) {
          setIsActive(true);
          setElapsedSeconds(elapsed);
        } else {
          setElapsedSeconds(RAID_DURATION_SECONDS);
        }
      }
    }
    load();
  }, [RAID_DURATION_SECONDS]);

  // Timer loop
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= RAID_DURATION_SECONDS) {
            setIsActive(false);
            return RAID_DURATION_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, RAID_DURATION_SECONDS]);

  const handleStartRaid = () => {
    sfx.activate();
    const nowIso = new Date().toISOString();
    localStorage.setItem('raid_started_at', nowIso);
    setIsActive(true);
    setElapsedSeconds(0);
    setToastMessage(systemMessages.raid_start);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    sfx.levelUp();
    const nowIso = new Date().toISOString();

    const mockEntry: MockResult = {
      date: today,
      day_number: Math.max(1, dayNum),
      total_marks: Number(totalMarks),
      attempted: Number(attempted),
      correct: Number(correct),
      wrong: Number(wrong),
      physics_score: Number(physicsScore),
      chemistry_score: Number(chemistryScore),
      biology_score: Number(biologyScore),
      time_taken_minutes: Number(timeTaken),
      notes,
      created_at: nowIso
    };

    await db.mock_results.add(mockEntry);

    // Award +500 XP
    await db.xp_ledger.add({
      date: today,
      amount: 500,
      source: 'boss_raid',
      reason: `Boss Raid Cleared (Day ${dayNum} Mock Test: ${totalMarks}/720)`,
      created_at: nowIso
    });

    // Award 90-min Leisure Key
    const keyMins = gameRules.shop.raid_reward_minutes || 90;
    const currentSavedSecs = Number(localStorage.getItem(`screen_unlocked_today_${today}`) || 0);
    const newSecs = currentSavedSecs + keyMins * 60;
    localStorage.setItem(`screen_unlocked_today_${today}`, String(newSecs));

    // Reset raid timer state
    localStorage.removeItem('raid_started_at');
    setIsActive(false);
    setElapsedSeconds(0);

    const clearMsg = systemMessages.raid_clear.replace('{minutes}', String(keyMins));
    setToastMessage(`${clearMsg} +500 XP awarded!`);

    const updated = await db.mock_results.toArray();
    setPastMocks(updated);
  };

  const formatTimer = (secs: number) => {
    const rem = Math.max(0, RAID_DURATION_SECONDS - secs);
    const h = Math.floor(rem / 3600);
    const m = Math.floor((rem % 3600) / 60);
    const s = rem % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="font-mono pb-24 max-w-md mx-auto select-none space-y-4">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-red-500/40 pb-3 mb-2">
        <div>
          <h1 className="text-base font-extrabold text-red-400 tracking-wider flex items-center gap-2">
            <span>[ BOSS RAID CHAMBER ]</span>
          </h1>
          <p className="text-xs text-slate-400">
            3-HOUR MOCK TEST TIMING &bull; PW APP PROTOCOL
          </p>
        </div>
        <Link
          href="/stats"
          className="text-xs text-cyan-400 border border-cyan-500/40 px-2.5 py-1.5 rounded bg-cyan-950/40 min-h-[44px] flex items-center"
        >
          TRENDS 📊
        </Link>
      </div>

      {/* Briefing Card */}
      <HudFrame title="RAID BRIEFING: OPEN PW APP" icon="⚠️" delay={0}>
        <p className="text-slate-200 leading-relaxed text-xs">
          Mock tests are taken directly inside the <span className="text-cyan-300 font-bold">PW app</span>. 
          This Chamber times your 3-hour exam without pause. When finished, submit your scores below to claim the 
          <span className="text-cyan-400 font-bold"> +500 XP</span> and 
          <span className="text-emerald-400 font-bold"> 90-minute Monarch&apos;s Leisure Key</span>.
        </p>
      </HudFrame>

      {/* 3-Hour Raid Countdown */}
      <HudFrame title={`RAID TIMER (${Math.round(RAID_DURATION_SECONDS / 60)} MINUTES)`} icon="⚔️" delay={80}>
        <div className="text-center py-2">
          <div className="text-4xl sm:text-5xl font-black text-red-500 tracking-tight my-3">
            {formatTimer(elapsedSeconds)}
          </div>

          {!isActive ? (
            <button
              onClick={handleStartRaid}
              className="min-h-[48px] w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-lg tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(255,51,102,0.4)] flex items-center justify-center text-xs"
            >
              START {Math.round(RAID_DURATION_SECONDS / 60)}-MIN RAID
            </button>
          ) : (
            <div className="text-xs text-cyan-300 animate-pulse">
              ⚔️ Raid in progress. Complete your test in the PW app.
            </div>
          )}
        </div>
      </HudFrame>

      {/* Score Submission Form */}
      <HudFrame title="SUBMIT PW MOCK TEST RESULT" icon="📝" delay={160}>
        <form onSubmit={handleSubmitResult} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">TOTAL MARKS (/720):</label>
              <input
                type="number"
                required
                min={0}
                max={720}
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">TIME TAKEN (MIN):</label>
              <input
                type="number"
                required
                value={timeTaken}
                onChange={(e) => setTimeTaken(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">ATTEMPTED:</label>
              <input
                type="number"
                value={attempted}
                onChange={(e) => setAttempted(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-center text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-emerald-400 block mb-1">CORRECT:</label>
              <input
                type="number"
                value={correct}
                onChange={(e) => setCorrect(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-emerald-700/60 rounded p-1.5 text-center text-xs text-emerald-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-red-400 block mb-1">WRONG:</label>
              <input
                type="number"
                value={wrong}
                onChange={(e) => setWrong(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-red-700/60 rounded p-1.5 text-center text-xs text-red-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-blue-400 block mb-1">PHYSICS (/180):</label>
              <input
                type="number"
                value={physicsScore}
                onChange={(e) => setPhysicsScore(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-blue-700/60 rounded p-1.5 text-center text-xs text-blue-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-purple-400 block mb-1">CHEMISTRY (/180):</label>
              <input
                type="number"
                value={chemistryScore}
                onChange={(e) => setChemistryScore(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-purple-700/60 rounded p-1.5 text-center text-xs text-purple-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-emerald-400 block mb-1">BIOLOGY (/360):</label>
              <input
                type="number"
                value={biologyScore}
                onChange={(e) => setBiologyScore(Number(e.target.value))}
                className="min-h-[44px] w-full bg-slate-950 border border-emerald-700/60 rounded p-1.5 text-center text-xs text-emerald-300 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">MOCK ANALYSIS NOTES:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record major mistake patterns, negative marks, and timing gaps..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center text-xs"
          >
            CONFIRM RAID RESULT & CLAIM 90-MIN KEY
          </button>
        </form>
      </HudFrame>

      {/* Past Mocks Summary */}
      {pastMocks.length > 0 && (
        <HudFrame title={`RAID HISTORY (${pastMocks.length} CLEARED)`} icon="📜" delay={240}>
          <div className="space-y-2">
            {pastMocks.map((m, idx) => (
              <div key={idx} className="p-2.5 bg-slate-950/80 rounded border border-slate-800 flex justify-between items-center text-xs min-h-[44px]">
                <div>
                  <span className="font-bold text-cyan-300">{m.total_marks}/720</span>
                  <span className="text-xs text-slate-400 ml-2">Day {m.day_number} &bull; {m.date}</span>
                </div>
                <div className="text-xs text-cyan-400">
                  P:{m.physics_score} C:{m.chemistry_score} B:{m.biology_score}
                </div>
              </div>
            ))}
          </div>
        </HudFrame>
      )}
    </div>
  );
}
