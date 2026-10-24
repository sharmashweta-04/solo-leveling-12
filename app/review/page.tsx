'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { currentGameDay } from '@/src/engine/time';
import { sfx } from '@/src/utils/systemAudio';
import { SRSCard } from '@/src/types';
import gameRules from '@/config/game_rules.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';

export default function ReviewPage() {
  const [dueCards, setDueCards] = useState<SRSCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const today = currentGameDay();

  const loadCards = async () => {
    const all = await db.srs_cards.toArray();
    // Cards due today or earlier
    const due = all.filter((c) => c.due_date <= today);
    setDueCards(due);
    setCurrentIndex(0);
    setIsFlipped(false);
    setLoading(false);
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleGrade = async (grade: 'Again' | 'Hard' | 'Good' | 'Easy') => {
    sfx.click();
    const card = dueCards[currentIndex];
    if (!card) return;

    let nextInterval = 1;
    const intervals = gameRules.srs_intervals_days; // [1, 3, 7, 14]

    if (grade === 'Again') {
      nextInterval = 1;
    } else if (grade === 'Hard') {
      nextInterval = Math.max(1, Math.round(card.interval_days * 1.2));
    } else if (grade === 'Good') {
      const foundIdx = intervals.indexOf(card.interval_days);
      if (foundIdx !== -1 && foundIdx < intervals.length - 1) {
        nextInterval = intervals[foundIdx + 1];
      } else {
        nextInterval = Math.round(card.interval_days * 2);
      }
    } else if (grade === 'Easy') {
      nextInterval = Math.round(card.interval_days * 2.5) + 3;
    }

    // Compute new due date
    const [y, m, d] = today.split('-').map(Number);
    const nextDateObj = new Date(Date.UTC(y, m - 1, d + nextInterval));
    const nextDueDate = `${nextDateObj.getUTCFullYear()}-${String(nextDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(
      nextDateObj.getUTCDate()
    ).padStart(2, '0')}`;

    await db.srs_cards.update(card.id!, {
      interval_days: nextInterval,
      repetition: (card.repetition || 0) + 1,
      due_date: nextDueDate,
      last_reviewed: today
    });

    // Check if that was the last card in the due queue
    if (currentIndex + 1 >= dueCards.length) {
      sfx.quest();
      // Completed all due reviews for today!
      // Complete grimoire_review daily quest
      const quests = await db.quest_logs.where({ date: today, quest_id: 'night_review' }).toArray();
      if (quests.length > 0 && !quests[0].is_completed) {
        const q = quests[0];
        const nowIso = new Date().toISOString();

        await db.quest_logs.update(q.id!, {
          is_completed: true,
          completed_blocks: 1,
          completed_at: nowIso
        });

        await db.xp_ledger.add({
          date: today,
          amount: q.xp_awarded,
          source: 'quest',
          reason: 'Cleared Night Review Quest',
          created_at: nowIso
        });

        await db.mp_ledger.add({
          date: today,
          amount: q.mp_awarded,
          source: 'quest',
          description: 'Cleared Night Review Quest',
          created_at: nowIso
        });

        setToastMessage(`[ REVIEWS COMPLETE ] All cards reviewed! Quest complete (+${q.xp_awarded} XP, +${q.mp_awarded} MP).`);
      } else {
        setToastMessage('[ REVIEWS COMPLETE ] All pending memory archives reviewed for today!');
      }

      await loadCards();
    } else {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const currentCard = dueCards[currentIndex];

  return (
    <div className="pb-24 max-w-md mx-auto select-none space-y-4 px-1">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#5cc8ff]/30 pb-3 mb-2">
        <div>
          <h1
            className="text-lg font-bold text-cyan-200 tracking-wider text-shadow-blue"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            SPACED REPETITION
          </h1>
          <p className="text-xs text-[#9bbacf]">
            MEMORY ARCHIVES &bull; {dueCards.length - currentIndex} DUE TODAY
          </p>
        </div>
        <Link
          href="/grimoire"
          className="text-xs text-cyan-300 border border-cyan-500/40 px-3 py-1.5 bg-cyan-950/40 min-h-[44px] flex items-center font-bold tracking-wider"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          GRIMOIRE 📜
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-cyan-300 animate-pulse text-xs tracking-wider" style={{ fontFamily: 'var(--font-cinzel)' }}>
          Loading Memory Decks...
        </div>
      ) : !currentCard ? (
        <HudFrame title="MEMORY DECK SYNCHRONIZED" icon="⚡" delay={0}>
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              No cards are currently due for review today. Add more mistake notes in the Grimoire or clear Gate Boss tests to spawn new SRS cards.
            </p>
            <div className="pt-2">
              <Link
                href="/grimoire"
                className="min-h-[44px] inline-flex items-center px-4 py-2 bg-cyan-950/60 hover:bg-cyan-900/60 border-2 border-cyan-300 text-cyan-100 font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                ADD TO GRIMOIRE
              </Link>
            </div>
          </div>
        </HudFrame>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between text-xs text-cyan-300" style={{ fontFamily: 'var(--font-cinzel)' }}>
            <span>CARD {currentIndex + 1} OF {dueCards.length}</span>
            <span>INTERVAL: {currentCard.interval_days} DAYS</span>
          </div>

          {/* Flashcard Component */}
          <div
            onClick={() => {
              sfx.click();
              setIsFlipped(!isFlipped);
            }}
            className="min-h-[220px] p-6 bg-slate-950/80 border-2 border-cyan-300 flex flex-col justify-between shadow-[0_0_20px_rgba(92,200,255,0.35)] cursor-pointer hover:border-white transition-all backdrop-blur-md"
            style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}
          >
            <div>
              <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-cinzel)' }}>
                {currentCard.subject} &bull; GATE {currentCard.chapter_id}
              </div>
              <div className="text-sm font-semibold text-slate-100 whitespace-pre-wrap leading-relaxed">
                {currentCard.front}
              </div>
            </div>

            {isFlipped ? (
              <div className="pt-4 mt-4 border-t border-cyan-500/40">
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-cinzel)' }}>
                  SOLUTION / APPROACH
                </div>
                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {currentCard.back}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-cyan-300 animate-pulse pt-4 tracking-widest" style={{ fontFamily: 'var(--font-cinzel)' }}>
                [ TAP TO REVEAL ANSWER ]
              </div>
            )}
          </div>

          {/* Grading Buttons */}
          {isFlipped && (
            <HudFrame title="EVALUATE RETENTION ACCURACY" icon="🎯" delay={0}>
              <div className="grid grid-cols-4 gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => handleGrade('Again')}
                  className="min-h-[48px] py-2 px-1 bg-red-950/60 border border-red-500 hover:bg-red-900/60 text-red-300 font-bold transition-all text-center flex flex-col items-center justify-center"
                >
                  <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-cinzel)' }}>AGAIN</div>
                  <div className="text-[10px] text-red-400 font-normal">1 Day</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('Hard')}
                  className="min-h-[48px] py-2 px-1 bg-amber-950/60 border border-amber-500 hover:bg-amber-900/60 text-amber-300 font-bold transition-all text-center flex flex-col items-center justify-center"
                >
                  <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-cinzel)' }}>HARD</div>
                  <div className="text-[10px] text-amber-400 font-normal">+{Math.round(currentCard.interval_days * 1.2)}d</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('Good')}
                  className="min-h-[48px] py-2 px-1 bg-blue-950/60 border border-blue-500 hover:bg-blue-900/60 text-blue-300 font-bold transition-all text-center flex flex-col items-center justify-center"
                >
                  <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-cinzel)' }}>GOOD</div>
                  <div className="text-[10px] text-blue-400 font-normal">Next step</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('Easy')}
                  className="min-h-[48px] py-2 px-1 bg-emerald-950/60 border border-emerald-500 hover:bg-emerald-900/60 text-emerald-300 font-bold transition-all text-center flex flex-col items-center justify-center"
                >
                  <div className="text-xs font-bold" style={{ fontFamily: 'var(--font-cinzel)' }}>EASY</div>
                  <div className="text-[10px] text-emerald-400 font-normal">Bonus</div>
                </button>
              </div>
            </HudFrame>
          )}
        </div>
      )}
    </div>
  );
}
