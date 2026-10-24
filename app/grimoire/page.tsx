'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { currentGameDay } from '@/src/engine/time';
import { sfx } from '@/src/utils/systemAudio';
import { GrimoireEntry, Subject } from '@/src/types';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';

export default function GrimoirePage() {
  const [entries, setEntries] = useState<GrimoireEntry[]>([]);
  const [subject, setSubject] = useState<Subject>('Physics');
  const [chapterId, setChapterId] = useState('P1');
  const [question, setQuestion] = useState('');
  const [mistake, setMistake] = useState('');
  const [correctApproach, setCorrectApproach] = useState('');
  const [tag, setTag] = useState<'concept' | 'calculation' | 'formula' | 'misread'>('concept');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const today = currentGameDay();
  const availableChapters = CHAPTERS_DATA.filter((c) => c.subject === subject);

  const loadEntries = async () => {
    const records = await db.grimoire.toArray();
    setEntries(records.reverse());
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !mistake.trim() || !correctApproach.trim()) return;

    sfx.quest();
    const nowIso = new Date().toISOString();

    // 1. Add Grimoire Entry
    const grimoireId = await db.grimoire.add({
      subject,
      chapter_id: chapterId,
      question,
      mistake,
      correct_approach: correctApproach,
      tag,
      created_at: nowIso
    });

    // 2. Auto-create SRS Card due tomorrow (D+1)
    const [y, m, d] = today.split('-').map(Number);
    const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
    const tomorrowStr = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')}-${String(
      tomorrow.getUTCDate()
    ).padStart(2, '0')}`;

    await db.srs_cards.add({
      grimoire_id: Number(grimoireId),
      chapter_id: chapterId,
      subject,
      front: `[ ${chapterId} — ${tag.toUpperCase()} ERROR ]\n${question}`,
      back: `MY MISTAKE:\n${mistake}\n\nCORRECT APPROACH:\n${correctApproach}`,
      interval_days: 1,
      repetition: 0,
      ease_factor: 2.5,
      due_date: tomorrowStr
    });

    setQuestion('');
    setMistake('');
    setCorrectApproach('');
    setToastMessage('[ GRIMOIRE RECORDED ] Error bound to Grimoire. Spaced repetition card scheduled for tomorrow!');
    await loadEntries();
  };

  return (
    <div className="pb-24 max-w-md mx-auto select-none space-y-4 px-1">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#5cc8ff]/30 pb-3 mb-2">
        <div>
          <h1
            className="text-lg font-bold text-cyan-200 tracking-wider text-shadow-blue flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            ERROR GRIMOIRE
          </h1>
          <p className="text-xs text-[#9bbacf]">
            DEATH &amp; MISTAKE CHRONICLES &bull; {entries.length} RECORDED
          </p>
        </div>
        <Link
          href="/review"
          className="text-xs text-cyan-300 border border-cyan-500/40 px-3 py-1.5 bg-cyan-950/40 min-h-[44px] flex items-center font-bold tracking-wider"
          style={{ fontFamily: 'var(--font-cinzel)' }}
        >
          SRS REVIEW 📜
        </Link>
      </div>

      {/* Error Notebook Entry Form */}
      <HudFrame title="RECORD FATAL MISTAKE" icon="📖" delay={0}>
        <form onSubmit={handleAddEntry} className="space-y-3 text-xs">
          {/* Wing Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {(['Physics', 'Chemistry', 'Biology'] as Subject[]).map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => {
                  setSubject(subj);
                  const firstCh = CHAPTERS_DATA.find((c) => c.subject === subj);
                  if (firstCh) setChapterId(firstCh.id);
                }}
                className={`min-h-[44px] py-1.5 text-xs font-bold uppercase transition-all flex items-center justify-center ${
                  subject === subj
                    ? 'border-2 border-cyan-300 bg-cyan-950/70 text-cyan-100 shadow-[0_0_12px_rgba(92,200,255,0.4)]'
                    : 'border border-cyan-800/40 bg-slate-950/60 text-slate-400'
                }`}
                style={{ fontFamily: 'var(--font-cinzel)' }}
              >
                {subj}
              </button>
            ))}
          </div>

          {/* Chapter Selector */}
          <div>
            <label className="text-xs text-cyan-300 block mb-1">CHAPTER GATE:</label>
            <select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="min-h-[44px] w-full bg-slate-950 border border-cyan-800/60 p-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              {availableChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Selector */}
          <div>
            <label className="text-xs text-cyan-300 block mb-1">MISTAKE NATURE:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['concept', 'calculation', 'formula', 'misread'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`min-h-[44px] py-1 text-xs font-bold uppercase transition-all flex items-center justify-center ${
                    tag === t
                      ? 'border-2 border-cyan-300 bg-cyan-950/70 text-cyan-200 shadow-[0_0_8px_rgba(92,200,255,0.3)]'
                      : 'border border-cyan-900/50 bg-slate-950/60 text-slate-400'
                  }`}
                  style={{ fontFamily: 'var(--font-cinzel)' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-cyan-300 block mb-1">THE QUESTION:</label>
            <textarea
              required
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What question tricked or defeated you?"
              className="w-full bg-slate-950 border border-cyan-800/60 p-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-red-400 block mb-1">MY FLAWED THOUGHT PROCESS (THE MISTAKE):</label>
            <textarea
              required
              rows={2}
              value={mistake}
              onChange={(e) => setMistake(e.target.value)}
              placeholder="Why did you pick the wrong option or miscalculate?"
              className="w-full bg-slate-950 border border-red-900/60 p-2 text-xs text-slate-100 focus:border-red-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-emerald-400 block mb-1">CORRECT HUNTER APPROACH:</label>
            <textarea
              required
              rows={2}
              value={correctApproach}
              onChange={(e) => setCorrectApproach(e.target.value)}
              placeholder="The definitive theorem, formula, or shortcut."
              className="w-full bg-slate-950 border border-emerald-900/60 p-2 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] w-full py-3 bg-cyan-950/60 hover:bg-cyan-900/60 border-2 border-cyan-300 text-cyan-100 font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(92,200,255,0.4)] flex items-center justify-center text-xs"
            style={{ fontFamily: 'var(--font-cinzel)' }}
          >
            BIND ERROR TO GRIMOIRE (+SCHEDULE SRS)
          </button>
        </form>
      </HudFrame>

      {/* Recorded Grimoire Entries */}
      <HudFrame title={`GRIMOIRE VAULT (${entries.length} LOGS)`} icon="📜" delay={80}>
        {entries.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            No errors recorded yet. Record mistakes from DPPs and mock tests to fuel your SRS deck.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {entries.map((entry, idx) => (
              <div
                key={idx}
                className="hud2-row flex-col items-start gap-1.5 p-3 text-xs"
              >
                <div className="w-full flex justify-between items-center text-xs">
                  <span className="font-bold text-cyan-200" style={{ fontFamily: 'var(--font-cinzel)' }}>
                    {entry.subject} &bull; {entry.chapter_id}
                  </span>
                  <span className="px-1.5 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 uppercase text-[10px]" style={{ fontFamily: 'var(--font-cinzel)' }}>
                    {entry.tag}
                  </span>
                </div>
                <p className="font-semibold text-slate-100 text-xs">{entry.question}</p>
                <div className="w-full text-xs text-red-300 bg-red-950/40 p-2 border border-red-900/40">
                  <span className="font-bold">MISTAKE: </span>{entry.mistake}
                </div>
                <div className="w-full text-xs text-emerald-300 bg-emerald-950/40 p-2 border border-emerald-900/40">
                  <span className="font-bold">CORRECT: </span>{entry.correct_approach}
                </div>
              </div>
            ))}
          </div>
        )}
      </HudFrame>
    </div>
  );
}
