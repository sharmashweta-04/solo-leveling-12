'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/src/db/db';
import { currentGameDay, getPlanDayNumber } from '@/src/engine/time';
import { awardXP } from '@/src/engine/xp';
import { playSystemChime } from '@/src/utils/audio';
import { MockResult } from '@/src/types';
import gameRules from '@/config/game_rules.json';
import systemMessages from '@/config/system_messages.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import planConfig from '@/config/plan_45days.json';

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
  }, []);

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
  }, [isActive]);

  const handleStartRaid = () => {
    playSystemChime();
    const nowIso = new Date().toISOString();
    localStorage.setItem('raid_started_at', nowIso);
    setIsActive(true);
    setElapsedSeconds(0);
    setToastMessage(systemMessages.raid_start);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    playSystemChime();
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

    // Award Raid Bonus XP (500 XP)
    const raidXp = awardXP(gameRules.raid_bonus_xp);
    await db.xp_ledger.add({
      date: today,
      amount: raidXp,
      source: 'boss_raid',
      reason: `Cleared Boss Raid Mock Test: ${totalMarks}/720 Marks`,
      created_at: nowIso
    });

    // Award 90-minute Monarch's Leisure Gate
    const leisureMins = gameRules.shop.raid_reward_minutes; // 90 min
    const unlockDurationMs = leisureMins * 60 * 1000;
    const endTime = Date.now() + unlockDurationMs;
    localStorage.setItem('active_screen_unlock_end', String(endTime));

    // Clear active raid timer
    localStorage.removeItem('raid_started_at');
    setIsActive(false);

    // Clear emergency lockout if active
    await db.settings.put({ key: 'emergency_lockout_active', value: false });

    // Mark boss_raid quest complete if present in daily quests
    const raidQuest = await db.quest_logs.where({ date: today, quest_id: 'boss_raid' }).first();
    if (raidQuest && !raidQuest.is_completed) {
      await db.quest_logs.update(raidQuest.id!, {
        is_completed: true,
        completed_blocks: 1,
        completed_at: nowIso
      });
    }

    const clearMsg = systemMessages.raid_clear.replace('{minutes}', String(leisureMins));
    setToastMessage(`${clearMsg} +${raidXp} XP awarded!`);

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
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-red-500/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-red-500 tracking-wider flex items-center gap-2">
            <span>[ BOSS RAID CHAMBER ]</span>
          </h1>
          <p className="text-[10px] text-hunter-gray">
            3-HOUR MOCK TEST TIMING &bull; PW APP PROTOCOL
          </p>
        </div>
        <Link
          href="/stats"
          className="text-xs text-hunter-cyan border border-hunter-blue/40 px-2 py-1 rounded bg-hunter-blue/10"
        >
          TRENDS 📊
        </Link>
      </div>

      {/* Briefing Card */}
      <div className="border border-red-500/40 bg-red-950/20 rounded-lg p-3.5 mb-4 text-xs space-y-2">
        <div className="font-bold text-red-400 flex items-center gap-1.5">
          <span>⚠️</span>
          <span>[ RAID INSTRUCTIONS: OPEN PW APP ]</span>
        </div>
        <p className="text-hunter-200 leading-relaxed text-[11px]">
          Mock tests are taken directly inside the <span className="text-hunter-cyan font-bold">PW app</span>. 
          This Chamber times your 3-hour exam without pause. When finished, submit your scores below to claim the 
          <span className="text-hunter-blue font-bold"> +500 XP</span> and 
          <span className="text-hunter-green font-bold"> 90-minute Monarch&apos;s Leisure Key</span>.
        </p>
      </div>

      {/* 3-Hour Raid Countdown */}
      <div className="border-2 border-red-500 bg-hunter-900/90 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(255,51,102,0.25)] mb-6">
        <div className="text-[10px] text-red-400 font-bold tracking-widest uppercase">
          RAID TIMER (3 HOURS)
        </div>
        <div className="text-5xl font-black text-red-500 tracking-tight my-4">
          {formatTimer(elapsedSeconds)}
        </div>

        {!isActive ? (
          <button
            onClick={handleStartRaid}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-lg tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(255,51,102,0.4)]"
          >
            START 3-HOUR RAID
          </button>
        ) : (
          <div className="text-xs text-hunter-cyan animate-pulse">
            ⚔️ Raid in progress. Complete your test in the PW app.
          </div>
        )}
      </div>

      {/* Score Submission Form */}
      <form onSubmit={handleSubmitResult} className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-4 mb-6 space-y-3 text-xs">
        <div className="text-xs font-bold text-hunter-blue">[ SUBMIT PW MOCK TEST RESULT ]</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-hunter-gray block mb-1">TOTAL MARKS (/720):</label>
            <input
              type="number"
              required
              min={0}
              max={720}
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-hunter-800 rounded p-2 text-hunter-100 font-bold focus:border-hunter-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-hunter-gray block mb-1">TIME TAKEN (MIN):</label>
            <input
              type="number"
              required
              value={timeTaken}
              onChange={(e) => setTimeTaken(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-hunter-800 rounded p-2 text-hunter-100 font-bold focus:border-hunter-blue focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] text-hunter-gray block mb-1">ATTEMPTED:</label>
            <input
              type="number"
              value={attempted}
              onChange={(e) => setAttempted(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-hunter-800 rounded p-1.5 text-center text-hunter-100 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] text-hunter-green block mb-1">CORRECT:</label>
            <input
              type="number"
              value={correct}
              onChange={(e) => setCorrect(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-green-800 rounded p-1.5 text-center text-hunter-green focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] text-red-400 block mb-1">WRONG:</label>
            <input
              type="number"
              value={wrong}
              onChange={(e) => setWrong(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-red-800 rounded p-1.5 text-center text-red-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] text-blue-400 block mb-1">PHYSICS (/180):</label>
            <input
              type="number"
              value={physicsScore}
              onChange={(e) => setPhysicsScore(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-blue-800 rounded p-1.5 text-center text-blue-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] text-purple-400 block mb-1">CHEMISTRY (/180):</label>
            <input
              type="number"
              value={chemistryScore}
              onChange={(e) => setChemistryScore(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-purple-800 rounded p-1.5 text-center text-purple-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] text-green-400 block mb-1">BIOLOGY (/360):</label>
            <input
              type="number"
              value={biologyScore}
              onChange={(e) => setBiologyScore(Number(e.target.value))}
              className="w-full bg-hunter-950 border border-green-800 rounded p-1.5 text-center text-green-300 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-hunter-gray block mb-1">MOCK ANALYSIS NOTES:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record major mistake patterns, negative marks, and timing gaps..."
            rows={2}
            className="w-full bg-hunter-950 border border-hunter-800 rounded p-2 text-hunter-100 focus:border-hunter-blue focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-hunter-blue hover:bg-hunter-cyan text-black font-extrabold rounded tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,217,255,0.4)]"
        >
          CONFIRM RAID RESULT & CLAIM 90-MIN KEY
        </button>
      </form>

      {/* Past Mocks Summary */}
      {pastMocks.length > 0 && (
        <div className="border border-hunter-blue/30 bg-hunter-900/60 rounded-lg p-3.5">
          <div className="text-xs font-bold text-hunter-cyan mb-2">
            [ RAID HISTORY ({pastMocks.length} CLEARED) ]
          </div>
          <div className="space-y-2">
            {pastMocks.map((m, idx) => (
              <div key={idx} className="p-2 bg-hunter-950 rounded border border-hunter-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-hunter-blue">{m.total_marks}/720</span>
                  <span className="text-[10px] text-hunter-gray ml-2">Day {m.day_number} &bull; {m.date}</span>
                </div>
                <div className="text-[10px] text-hunter-cyan">
                  P:{m.physics_score} C:{m.chemistry_score} B:{m.biology_score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
