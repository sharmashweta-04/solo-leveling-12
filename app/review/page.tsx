'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { currentGameDay } from '@/src/engine/time';
import { awardXP } from '@/src/engine/xp';
import { awardMP } from '@/src/engine/mana';
import { playSystemChime } from '@/src/utils/audio';
import { SRSCard } from '@/src/types';
import gameRules from '@/config/game_rules.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';

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
    playSystemChime();
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
      repetition: card.repetition + 1,
      due_date: nextDueDate,
      last_reviewed: today
    });

    // Check if that was the last card in the due queue
    if (currentIndex + 1 >= dueCards.length) {
      // Completed all due reviews for today!
      // Complete grimoire_review daily quest
      const quests = await db.quest_logs.where({ date: today, quest_id: 'grimoire_review' }).toArray();
      if (quests.length > 0 && !quests[0].is_completed) {
        const q = quests[0];
        const nowIso = new Date().toISOString();
        const xpAw = awardXP(q.xp_awarded);
        const mpAw = awardMP(0, q.mp_awarded).awarded;

        await db.quest_logs.update(q.id!, {
          is_completed: true,
          completed_blocks: 1,
          completed_at: nowIso
        });

        await db.xp_ledger.add({
          date: today,
          amount: xpAw,
          source: 'quest',
          reason: 'Cleared Grimoire Review Quest',
          created_at: nowIso
        });

        if (mpAw > 0) {
          await db.mp_ledger.add({
            date: today,
            amount: mpAw,
            source: 'quest',
            description: 'Grimoire Review MP Reward',
            created_at: nowIso
          });
        }

        setToastMessage(`[ ALL DUE REVIEWS CLEARED ] +${xpAw} XP & +${mpAw} MP awarded! Daily quest completed.`);
      } else {
        setToastMessage('[ ALL DUE REVIEWS CLEARED ] Excellent memory retention, Hunter.');
      }
    }

    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const currentCard = dueCards[currentIndex];

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-hunter-blue tracking-wider text-shadow-blue">
            [ SPACED REPETITION ]
          </h1>
          <p className="text-[10px] text-hunter-gray">
            MEMORY ARCHIVES &bull; {dueCards.length - currentIndex} DUE TODAY
          </p>
        </div>
        <Link
          href="/grimoire"
          className="text-xs text-purple-300 border border-purple-500/40 px-2 py-1 rounded bg-purple-950/20"
        >
          GRIMOIRE 📜
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-hunter-blue animate-pulse text-xs">
          Loading Memory Decks...
        </div>
      ) : !currentCard ? (
        <div className="border border-hunter-blue/30 bg-hunter-900/60 rounded-xl p-8 text-center space-y-3">
          <div className="text-3xl animate-bounce">⚡</div>
          <h2 className="text-sm font-bold text-hunter-blue">[ MEMORY DECK SYNCHRONIZED ]</h2>
          <p className="text-xs text-hunter-gray leading-relaxed">
            No cards are currently due for review today. Add more mistake notes in the Grimoire or clear Gate Boss tests to spawn new SRS cards.
          </p>
          <div className="pt-2">
            <Link
              href="/grimoire"
              className="inline-block px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400 text-purple-200 rounded text-xs font-bold uppercase tracking-wider"
            >
              ADD TO GRIMOIRE
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between text-[11px] text-hunter-cyan">
            <span>CARD {currentIndex + 1} OF {dueCards.length}</span>
            <span>INTERVAL: {currentCard.interval_days} DAYS</span>
          </div>

          {/* Flashcard Component */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[220px] p-6 rounded-2xl bg-hunter-900/90 border-2 border-hunter-blue flex flex-col justify-between shadow-[0_0_25px_rgba(0,217,255,0.25)] cursor-pointer hover:border-hunter-cyan transition-all"
          >
            <div>
              <div className="text-[10px] text-hunter-gray font-bold uppercase tracking-wider mb-2">
                {currentCard.subject} &bull; GATE {currentCard.chapter_id}
              </div>
              <div className="text-sm font-semibold text-hunter-100 whitespace-pre-wrap leading-relaxed">
                {currentCard.front}
              </div>
            </div>

            {isFlipped ? (
              <div className="pt-4 mt-4 border-t border-hunter-blue/40">
                <div className="text-[10px] text-hunter-green font-bold uppercase tracking-widest mb-1">
                  [ SOLUTION / APPROACH ]
                </div>
                <div className="text-xs text-hunter-200 whitespace-pre-wrap leading-relaxed">
                  {currentCard.back}
                </div>
              </div>
            ) : (
              <div className="text-center text-[10px] text-hunter-gray animate-pulse pt-4">
                [ TAP TO REVEAL ANSWER ]
              </div>
            )}
          </div>

          {/* Grading Buttons */}
          {isFlipped && (
            <div className="space-y-2 pt-2 animate-in fade-in duration-200">
              <div className="text-[10px] text-hunter-gray text-center uppercase tracking-wider">
                EVALUATE RETENTION ACCURACY
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleGrade('Again')}
                  className="py-2.5 rounded bg-red-950/60 border border-red-500 hover:bg-red-900/60 text-red-300 font-bold transition-all text-center"
                >
                  <div>AGAIN</div>
                  <div className="text-[9px] text-red-400 font-normal">1 Day</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('Hard')}
                  className="py-2.5 rounded bg-yellow-950/60 border border-yellow-500 hover:bg-yellow-900/60 text-yellow-300 font-bold transition-all text-center"
                >
                  <div>HARD</div>
                  <div className="text-[9px] text-yellow-400 font-normal">Slow</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('Good')}
                  className="py-2.5 rounded bg-blue-950/60 border border-hunter-blue hover:bg-blue-900/60 text-hunter-cyan font-bold transition-all text-center"
                >
                  <div>GOOD</div>
                  <div className="text-[9px] text-hunter-blue font-normal">Normal</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGrade('Easy')}
                  className="py-2.5 rounded bg-green-950/60 border border-green-500 hover:bg-green-900/60 text-green-300 font-bold transition-all text-center"
                >
                  <div>EASY</div>
                  <div className="text-[9px] text-green-400 font-normal">Fast</div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
