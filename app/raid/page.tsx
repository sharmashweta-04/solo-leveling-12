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
    <div className="select-none space-y-5">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <header className="flex justify-between items-end border-b border-[#5cc8ff]/30 pb-3 pt-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-wider text-shadow-blue flex items-center gap-2">
            <span>BOSS RAID CHAMBER</span>
          </h1>
          <p className="text-[15px] font-semibold text-[#8ab4d8] tracking-wide mt-0.5">
            3-HOUR MOCK TEST TIMING &bull; PW APP PROTOCOL
          </p>
        </div>
        <Link
          href="/stats"
          className="hud2-row !min-h-[44px] px-3 py-1 font-[family-name:var(--font-cinzel)] font-bold text-xs text-[#5cc8ff] border-[#5cc8ff]/50 hover:bg-[#5cc8ff]/20 flex items-center"
        >
          TRENDS 📊
        </Link>
      </header>

      {/* Briefing Card */}
      <HudFrame title="RAID BRIEFING" icon="⚠️" delay={0}>
        <p className="hud2-sub">
          Mock tests are taken in the <strong className="text-white">PW app</strong>. Submit your scores here to claim +500 XP and a 90-min Leisure Key.
        </p>
      </HudFrame>

      {/* 3-Hour Raid Countdown */}
      <HudFrame title={`RAID TIMER (${Math.round(RAID_DURATION_SECONDS / 60)} MINUTES)`} icon="⚔️" delay={60}>
        <div className="text-center py-2">
          <div className="text-5xl sm:text-6xl font-bold font-[family-name:var(--font-cinzel)] text-[#ff4d6d] tracking-wider my-3 drop-shadow-[0_0_15px_rgba(255,77,109,0.8)]">
            {formatTimer(elapsedSeconds)}
          </div>

          {!isActive ? (
            <div className="pt-2">
              <button
                onClick={handleStartRaid}
                className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-[#dff3ff] border-red-500/60 bg-red-950/40 hover:bg-red-900/60 shadow-[0_0_15px_rgba(255,77,109,0.4)]"
              >
                START {Math.round(RAID_DURATION_SECONDS / 60)}-MIN RAID
              </button>
            </div>
          ) : (
            <div className="hud2-row justify-center text-center text-[#5cc8ff] text-[15px] font-bold animate-pulse">
              ⚔️ Raid in progress. Complete your test in the PW app.
            </div>
          )}
        </div>
      </HudFrame>

      {/* Score Submission Form */}
      <HudFrame title="SUBMIT PW MOCK TEST RESULT" icon="📝" delay={120}>
        <form onSubmit={handleSubmitResult} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[14px] font-bold text-[#8ab4d8] block mb-1">TOTAL MARKS (/720):</label>
              <input
                type="number"
                required
                min={0}
                max={720}
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#5cc8ff]/40 rounded p-2 text-center text-lg font-bold font-[family-name:var(--font-cinzel)] text-[#5cc8ff] focus:border-[#5cc8ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[14px] font-bold text-[#8ab4d8] block mb-1">TIME TAKEN (MIN):</label>
              <input
                type="number"
                required
                value={timeTaken}
                onChange={(e) => setTimeTaken(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#5cc8ff]/40 rounded p-2 text-center text-lg font-bold font-[family-name:var(--font-cinzel)] text-[#5cc8ff] focus:border-[#5cc8ff] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[13px] font-bold text-[#8ab4d8] block mb-1">ATTEMPTED:</label>
              <input
                type="number"
                value={attempted}
                onChange={(e) => setAttempted(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#5cc8ff]/30 rounded p-1.5 text-center text-[15px] text-[#dff3ff] font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[13px] font-bold text-[#34d399] block mb-1">CORRECT:</label>
              <input
                type="number"
                value={correct}
                onChange={(e) => setCorrect(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#34d399]/40 rounded p-1.5 text-center text-[15px] text-[#34d399] font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[13px] font-bold text-[#ff4d6d] block mb-1">WRONG:</label>
              <input
                type="number"
                value={wrong}
                onChange={(e) => setWrong(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#ff4d6d]/40 rounded p-1.5 text-center text-[15px] text-[#ff4d6d] font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[13px] font-bold text-[#7fcbff] block mb-1">PHYSICS (/180):</label>
              <input
                type="number"
                value={physicsScore}
                onChange={(e) => setPhysicsScore(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#7fcbff]/40 rounded p-1.5 text-center text-[15px] text-[#7fcbff] font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[13px] font-bold text-[#c084fc] block mb-1">CHEMISTRY (/180):</label>
              <input
                type="number"
                value={chemistryScore}
                onChange={(e) => setChemistryScore(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#c084fc]/40 rounded p-1.5 text-center text-[15px] text-[#c084fc] font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[13px] font-bold text-[#34d399] block mb-1">BIOLOGY (/360):</label>
              <input
                type="number"
                value={biologyScore}
                onChange={(e) => setBiologyScore(Number(e.target.value))}
                className="min-h-[44px] w-full bg-[#030a18] border border-[#34d399]/40 rounded p-1.5 text-center text-[15px] text-[#34d399] font-bold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[14px] font-bold text-[#8ab4d8] block mb-1">MOCK ANALYSIS NOTES:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record major mistake patterns, negative marks, and timing gaps..."
              rows={2}
              className="w-full bg-[#030a18] border border-[#5cc8ff]/40 rounded p-2 text-[15px] text-[#dff3ff] focus:border-[#5cc8ff] focus:outline-none font-[family-name:var(--font-cormorant)] font-semibold"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-[#dff3ff] border-[#5cc8ff] bg-[#5cc8ff]/25 hover:bg-[#5cc8ff]/40 shadow-[0_0_15px_rgba(92,200,255,0.4)]"
            >
              CONFIRM RESULT & CLAIM 90-MIN KEY
            </button>
          </div>
        </form>
      </HudFrame>

      {/* Past Mocks Summary */}
      {pastMocks.length > 0 && (
        <HudFrame title={`RAID HISTORY (${pastMocks.length} CLEARED)`} icon="📜" delay={180}>
          <ul className="hud2-goals">
            {pastMocks.map((m, idx) => (
              <li key={idx}>
                <div className="hud2-row justify-between">
                  <div>
                    <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff] text-base">{m.total_marks}/720</span>
                    <span className="text-[14px] text-[#8ab4d8] ml-2">Day {m.day_number} &bull; {m.date}</span>
                  </div>
                  <div className="text-[14px] font-bold text-[#dff3ff]">
                    P:{m.physics_score} C:{m.chemistry_score} B:{m.biology_score}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </HudFrame>
      )}
    </div>
  );
}
