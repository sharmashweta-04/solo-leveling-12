'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { currentGameDay } from '@/src/engine/time';
import { sfx } from '@/src/utils/systemAudio';
import { Subject } from '@/src/types';
import gameRules from '@/config/game_rules.json';
import systemMessages from '@/config/system_messages.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';

const BLOCK_DURATION_SECONDS = gameRules.block_minutes * 60; // 50 * 60 = 3000s
const MIN_RATIO = gameRules.min_completion_ratio; // 0.9 (45 mins)

export default function FocusTimerPage() {
  const [subject, setSubject] = useState<Subject>('Physics');
  const [chapterId, setChapterId] = useState('P1');
  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    sfx.activate();
    const nowIso = new Date().toISOString();
    localStorage.setItem('focus_started_at', nowIso);
    localStorage.setItem('focus_subject', subject);
    localStorage.setItem('focus_chapter', chapterId);
    localStorage.setItem('focus_interruptions', '0');

    setIsActive(true);
    setElapsedSeconds(0);
    setInterruptions(0);
    setToastMessage(`[ FOCUS PROTOCOL ENGAGED ] 50-minute deep study started for ${chapterId}.`);
  };

  const handleCompleteBlock = async (isAuto = false) => {
    const today = currentGameDay();
    const durationMinutes = Math.floor(elapsedSeconds / 60);
    const ratio = elapsedSeconds / BLOCK_DURATION_SECONDS;
    const isQualifying = ratio >= MIN_RATIO; // >= 45 min
    const nowIso = new Date().toISOString();

    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    localStorage.removeItem('focus_started_at');
    localStorage.removeItem('focus_subject');
    localStorage.removeItem('focus_chapter');
    localStorage.removeItem('focus_interruptions');

    // 1. Record focus session
    await db.focus_sessions.add({
      date: today,
      subject,
      chapter_id: chapterId,
      started_at: nowIso,
      duration_minutes: durationMinutes,
      target_minutes: 50,
      completed: isQualifying,
      interruptions
    });

    if (isQualifying) {
      sfx.quest();
      // Award XP & MP
      await db.xp_ledger.add({
        date: today,
        amount: 50,
        source: 'quest',
        reason: `Completed Focus Block: ${chapterId} (${durationMinutes}m)`,
        created_at: nowIso
      });

      await db.mp_ledger.add({
        date: today,
        amount: 5,
        source: 'quest',
        description: `Completed Focus Block: ${chapterId}`,
        created_at: nowIso
      });

      // Update today's quest blocks
      const questId = `study_${subject.toLowerCase()}`;
      const matchingQuests = await db.quest_logs.where({ date: today, quest_id: questId }).toArray();

      if (matchingQuests.length > 0) {
        const q = matchingQuests[0];
        const newBlocks = (q.completed_blocks || 0) + 1;
        const completeNow = newBlocks >= q.required_blocks;

        await db.quest_logs.update(q.id!, {
          completed_blocks: newBlocks,
          is_completed: completeNow,
          completed_at: completeNow ? nowIso : undefined
        });
      }

      setToastMessage(
        `[ FOCUS BLOCK COMPLETE ] Qualified session! +50 XP and +5 MP awarded. (${interruptions} interruptions)`
      );
    } else {
      sfx.penalty();
      setToastMessage(
        `[ INCOMPLETE BLOCK ] Completed ${durationMinutes}m. Need ≥ 45m (90%) for full rewards.`
      );
    }
  };

  const formatTime = (secs: number) => {
    const rem = Math.max(0, BLOCK_DURATION_SECONDS - secs);
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (elapsedSeconds / BLOCK_DURATION_SECONDS) * 100);

  return (
    <div className="select-none space-y-5">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <header className="flex justify-between items-end border-b border-[#5cc8ff]/30 pb-3 pt-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-wider text-shadow-blue flex items-center gap-2">
            <span>FOCUS CHAMBER</span>
          </h1>
          <p className="text-[15px] font-semibold text-[#8ab4d8] tracking-wide mt-0.5">
            50-MINUTE DEEP DIVE &bull; 90% COMPLETION RULE
          </p>
        </div>
        <Link
          href="/"
          className="hud2-row !min-h-[44px] px-3 py-1 font-[family-name:var(--font-cinzel)] font-bold text-xs text-[#5cc8ff] border-[#5cc8ff]/50 hover:bg-[#5cc8ff]/20 flex items-center"
        >
          STATUS ⚡
        </Link>
      </header>

      {/* Selection Form */}
      <HudFrame title="CHAMBER CONFIGURATION" icon="⚙️" delay={0}>
        <div className="space-y-3">
          <div>
            <label className="text-[15px] font-bold text-[#8ab4d8] block mb-1">SELECT SUBJECT:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Physics', 'Chemistry', 'Biology'] as Subject[]).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  disabled={isActive}
                  onClick={() => {
                    sfx.click();
                    setSubject(sub);
                    const firstCh = CHAPTERS_DATA.find((c) => c.subject === sub);
                    if (firstCh) setChapterId(firstCh.id);
                  }}
                  className={`min-h-[44px] py-2 px-1 rounded border text-center transition-all font-[family-name:var(--font-cinzel)] font-bold text-xs flex items-center justify-center ${
                    subject === sub
                      ? 'border-[#5cc8ff] bg-[#5cc8ff]/20 text-[#dff3ff] shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                      : 'border-[#1b3558]/70 bg-[#050f24]/70 text-[#8ab4d8] hover:text-[#dff3ff]'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[15px] font-bold text-[#8ab4d8] block mb-1">SELECT CHAPTER GATE:</label>
            <select
              value={chapterId}
              disabled={isActive}
              onChange={(e) => setChapterId(e.target.value)}
              className="min-h-[44px] w-full bg-[#030a18] border border-[#5cc8ff]/40 rounded p-2 text-[15px] text-[#dff3ff] focus:border-[#5cc8ff] focus:outline-none font-[family-name:var(--font-cormorant)] font-semibold"
            >
              {availableChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.id} — {ch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </HudFrame>

      {/* Holographic Timer Display */}
      <HudFrame title="FOCUS CHAMBER COUNTDOWN" icon="⏱️" delay={80}>
        <div className="text-center py-2">
          <div className="text-[15px] font-bold font-[family-name:var(--font-cinzel)] text-[#8ab4d8] tracking-widest uppercase mb-1">
            {subject} &bull; {chapterId}
          </div>

          <div className="text-6xl sm:text-7xl font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-tight my-4 text-shadow-blue drop-shadow-[0_0_20px_rgba(92,200,255,0.9)]">
            {formatTime(elapsedSeconds)}
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-[#030a18] overflow-hidden border border-[#5cc8ff]/40 mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#1e5aab] via-[#5cc8ff] to-[#e8f8ff] transition-all duration-300 shadow-[0_0_12px_rgba(92,200,255,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[15px] text-[#8ab4d8] mb-4 font-semibold px-1">
            <span>PROGRESS: {Math.floor(progressPercent)}%</span>
            <span>
              {interruptions > 0 ? (
                <span className="text-red-400 font-bold">⚠️ {interruptions} TAB SWITCHES</span>
              ) : (
                <span className="text-[#34d399] font-bold">PERFECT FOCUS</span>
              )}
            </span>
          </div>

          {/* Timer Controls */}
          <div className="pt-2">
            {!isActive ? (
              <button
                onClick={handleStartTimer}
                className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-[#dff3ff] border-[#5cc8ff] bg-[#5cc8ff]/25 hover:bg-[#5cc8ff]/40 shadow-[0_0_15px_rgba(92,200,255,0.4)]"
              >
                START 50-MIN FOCUS
              </button>
            ) : (
              <button
                onClick={() => handleCompleteBlock(false)}
                className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-red-300 border-red-500/50 hover:bg-red-950/40"
              >
                FINISH / ABORT BLOCK
              </button>
            )}
          </div>
        </div>
      </HudFrame>
    </div>
  );
}
