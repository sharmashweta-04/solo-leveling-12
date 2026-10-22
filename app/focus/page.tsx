'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { currentGameDay } from '@/src/engine/time';
import { awardXP } from '@/src/engine/xp';
import { awardMP } from '@/src/engine/mana';
import { playSystemChime } from '@/src/utils/audio';
import { Subject } from '@/src/types';
import gameRules from '@/config/game_rules.json';
import systemMessages from '@/config/system_messages.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';

const BLOCK_DURATION_SECONDS = gameRules.block_minutes * 60; // 50 * 60 = 3000s
const MIN_RATIO = gameRules.min_completion_ratio; // 0.9 (45 mins)

export default function FocusTimerPage() {
  const [subject, setSubject] = useState<Subject>('Physics');
  const [chapterId, setChapterId] = useState('P1');
  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter chapters by selected subject
  const availableChapters = CHAPTERS_DATA.filter((ch) => ch.subject === subject);

  // Restore active session from localStorage if available
  useEffect(() => {
    const savedStartedAt = localStorage.getItem('focus_started_at');
    const savedSubject = localStorage.getItem('focus_subject') as Subject | null;
    const savedChapter = localStorage.getItem('focus_chapter');
    const savedInterruptions = localStorage.getItem('focus_interruptions');

    if (savedStartedAt) {
      const startTime = new Date(savedStartedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);

      if (elapsed < BLOCK_DURATION_SECONDS) {
        setIsActive(true);
        setElapsedSeconds(elapsed);
        if (savedSubject) setSubject(savedSubject);
        if (savedChapter) setChapterId(savedChapter);
        if (savedInterruptions) setInterruptions(Number(savedInterruptions));
      } else {
        // Expired while away
        setElapsedSeconds(BLOCK_DURATION_SECONDS);
        localStorage.removeItem('focus_started_at');
      }
    }
  }, []);

  // Timer interval
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= BLOCK_DURATION_SECONDS) {
            handleCompleteBlock(true);
            return BLOCK_DURATION_SECONDS;
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

  // Tab switch detection (interruptions)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        setInterruptions((prev) => {
          const next = prev + 1;
          localStorage.setItem('focus_interruptions', String(next));
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  const handleStartTimer = () => {
    playSystemChime();
    const nowIso = new Date().toISOString();
    localStorage.setItem('focus_started_at', nowIso);
    localStorage.setItem('focus_subject', subject);
    localStorage.setItem('focus_chapter', chapterId);
    localStorage.setItem('focus_interruptions', '0');

    setElapsedSeconds(0);
    setInterruptions(0);
    setIsActive(true);
    setIsCompleted(false);
  };

  const handleCompleteBlock = async (auto: boolean = false) => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const ratio = elapsedSeconds / BLOCK_DURATION_SECONDS;
    const qualifies = ratio >= MIN_RATIO;
    const today = currentGameDay();
    const nowIso = new Date().toISOString();

    // Log focus session in Dexie
    await db.focus_sessions.add({
      date: today,
      subject,
      chapter_id: chapterId,
      started_at: localStorage.getItem('focus_started_at') || nowIso,
      ended_at: nowIso,
      duration_minutes: Math.round(elapsedSeconds / 60),
      target_minutes: gameRules.block_minutes,
      completed: qualifies,
      interruptions
    });

    localStorage.removeItem('focus_started_at');
    localStorage.removeItem('focus_interruptions');

    if (qualifies) {
      playSystemChime();
      setIsCompleted(true);
      const xpAmount = awardXP(gameRules.quests.focus_block.xp);
      const mpAmount = awardMP(0, gameRules.quests.focus_block.mp).awarded;

      // Add XP & MP to ledgers
      await db.xp_ledger.add({
        date: today,
        amount: xpAmount,
        source: 'quest',
        reason: `Completed 50-min Focus Block: ${subject} (${chapterId})`,
        created_at: nowIso
      });

      if (mpAmount > 0) {
        await db.mp_ledger.add({
          date: today,
          amount: mpAmount,
          source: 'quest',
          description: `Focus Block MP: ${subject} (${chapterId})`,
          created_at: nowIso
        });
      }

      setToastMessage(`[ FOCUS COMPLETE ] +${xpAmount} XP & +${mpAmount} MP awarded! (${interruptions} interruptions)`);
    } else {
      setToastMessage(`[ BLOCK ABORTED ] Elapsed time was under 90% threshold (45 min). No XP awarded.`);
    }
  };

  const formatTime = (secs: number) => {
    const remaining = Math.max(0, BLOCK_DURATION_SECONDS - secs);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (elapsedSeconds / BLOCK_DURATION_SECONDS) * 100);

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 mb-6">
        <div>
          <h1 className="text-lg font-extrabold text-hunter-blue tracking-wider text-shadow-blue">
            [ FOCUS CHAMBER ]
          </h1>
          <p className="text-xs text-hunter-400">
            50-MINUTE PROTOCOL &bull; 90% THRESHOLD (45 MIN)
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-hunter-blue border border-hunter-blue/40 px-2.5 py-1.5 rounded bg-hunter-blue/10 hover:bg-hunter-blue/30 font-bold min-h-[44px] flex items-center"
        >
          STATUS ⚡
        </Link>
      </div>

      {/* Selection Form (Disabled while timer runs) */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-4 mb-6 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
        <div className="text-xs text-hunter-cyan font-bold tracking-wider mb-3">
          [ CHAMBER CONFIGURATION ]
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-xs text-hunter-400 block mb-1">SELECT SUBJECT:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Physics', 'Chemistry', 'Biology'] as Subject[]).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  disabled={isActive}
                  onClick={() => {
                    setSubject(sub);
                    const firstCh = CHAPTERS_DATA.find((c) => c.subject === sub);
                    if (firstCh) setChapterId(firstCh.id);
                  }}
                  className={`min-h-[44px] py-2 px-1 rounded border text-center transition-all text-xs flex items-center justify-center ${
                    subject === sub
                      ? 'border-hunter-blue bg-hunter-blue/20 text-white font-bold shadow-[0_0_10px_rgba(0,217,255,0.3)]'
                      : 'border-hunter-800 bg-hunter-950 text-hunter-400 hover:text-white'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-hunter-400 block mb-1">SELECT CHAPTER GATE:</label>
            <select
              value={chapterId}
              disabled={isActive}
              onChange={(e) => setChapterId(e.target.value)}
              className="min-h-[44px] w-full bg-hunter-950 border border-hunter-800 rounded p-2 text-xs text-hunter-100 focus:border-hunter-blue focus:outline-none"
            >
              {availableChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.id} — {ch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Holographic Timer Display */}
      <div className="border-2 border-hunter-blue bg-hunter-900/90 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(0,217,255,0.25)] mb-6">
        <div className="text-xs text-hunter-400 tracking-widest uppercase mb-1">
          {subject} &bull; {chapterId}
        </div>

        <div className="text-6xl font-black text-hunter-blue tracking-tighter my-4 text-shadow-blue">
          {formatTime(elapsedSeconds)}
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-hunter-950 rounded-full overflow-hidden border border-hunter-800 mb-3">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-hunter-blue to-hunter-cyan transition-all duration-300 shadow-[0_0_10px_rgba(0,217,255,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-hunter-400 mb-4">
          <span>PROGRESS: {Math.floor(progressPercent)}%</span>
          <span>
            {interruptions > 0 ? (
              <span className="text-red-400 font-bold">⚠️ {interruptions} TAB SWITCHES</span>
            ) : (
              <span className="text-hunter-green">PERFECT FOCUS</span>
            )}
          </span>
        </div>

        {/* Timer Controls */}
        <div className="flex gap-3 justify-center">
          {!isActive ? (
            <button
              onClick={handleStartTimer}
              className="min-h-[48px] w-full py-3 bg-hunter-blue hover:bg-hunter-cyan text-black font-extrabold rounded-lg tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,217,255,0.4)] active:scale-95 flex items-center justify-center text-xs"
            >
              START 50-MIN FOCUS
            </button>
          ) : (
            <button
              onClick={() => handleCompleteBlock(false)}
              className="min-h-[48px] w-full py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500 text-red-300 font-bold rounded-lg tracking-widest uppercase transition-all flex items-center justify-center text-xs"
            >
              FINISH / ABORT BLOCK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
