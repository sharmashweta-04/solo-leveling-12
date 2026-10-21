'use client';

import { useState, useEffect } from 'react';
import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { currentGameDay } from '@/src/engine/time';
import { playSystemChime } from '@/src/utils/audio';
import { GrimoireEntry, Subject } from '@/src/types';
import Toast from '@/src/components/Toast';
import Link from 'next/link';

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

    playSystemChime();
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
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-purple-500/40 pb-3 mb-4">
        <div>
          <h1 className="text-lg font-extrabold text-purple-400 tracking-wider flex items-center gap-1.5">
            <span>[ ERROR GRIMOIRE ]</span>
          </h1>
          <p className="text-[10px] text-hunter-gray">
            DEATH & MISTAKE CHRONICLES &bull; {entries.length} RECORDED
          </p>
        </div>
        <Link
          href="/review"
          className="text-xs text-hunter-cyan border border-hunter-blue/40 px-2 py-1 rounded bg-hunter-blue/10"
        >
          SRS REVIEW 📜
        </Link>
      </div>

      {/* Error Notebook Entry Form */}
      <form onSubmit={handleAddEntry} className="border border-purple-500/40 bg-hunter-900/80 rounded-lg p-3.5 mb-6 space-y-3 text-xs shadow-[0_0_15px_rgba(168,85,247,0.15)]">
        <div className="text-xs font-bold text-purple-300">[ LOG FATAL QUESTION ERROR ]</div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-hunter-gray block mb-1">SUBJECT:</label>
            <select
              value={subject}
              onChange={(e) => {
                const sub = e.target.value as Subject;
                setSubject(sub);
                const first = CHAPTERS_DATA.find((c) => c.subject === sub);
                if (first) setChapterId(first.id);
              }}
              className="w-full bg-hunter-950 border border-hunter-800 rounded p-1.5 text-hunter-100 focus:outline-none"
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-hunter-gray block mb-1">CHAPTER GATE:</label>
            <select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="w-full bg-hunter-950 border border-hunter-800 rounded p-1.5 text-hunter-100 focus:outline-none"
            >
              {availableChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.id} — {ch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-hunter-gray block mb-1">ERROR TAG:</label>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {(['concept', 'calculation', 'formula', 'misread'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`py-1 rounded uppercase text-[10px] font-bold border transition-all ${
                  tag === t
                    ? 'border-purple-400 bg-purple-900/40 text-purple-200'
                    : 'border-hunter-800 bg-hunter-950 text-hunter-gray'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-hunter-gray block mb-1">THE QUESTION:</label>
          <textarea
            required
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What question tricked or defeated you?"
            className="w-full bg-hunter-950 border border-hunter-800 rounded p-2 text-hunter-100 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-red-400 block mb-1">MY FLAWED THOUGHT PROCESS (THE MISTAKE):</label>
          <textarea
            required
            rows={2}
            value={mistake}
            onChange={(e) => setMistake(e.target.value)}
            placeholder="Why did you pick the wrong option or miscalculate?"
            className="w-full bg-hunter-950 border border-red-900/60 rounded p-2 text-hunter-100 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-hunter-green block mb-1">CORRECT HUNTER APPROACH:</label>
          <textarea
            required
            rows={2}
            value={correctApproach}
            onChange={(e) => setCorrectApproach(e.target.value)}
            placeholder="The definitive theorem, formula, or shortcut."
            className="w-full bg-hunter-950 border border-green-900/60 rounded p-2 text-hunter-100 focus:border-green-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400 text-purple-200 font-extrabold rounded tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
        >
          BIND ERROR TO GRIMOIRE (+SCHEDULE SRS)
        </button>
      </form>

      {/* Recorded Grimoire Entries */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-hunter-gray">[ ARCHIVED MISTAKES ]</div>
        {entries.length === 0 ? (
          <p className="text-xs text-hunter-gray italic text-center py-6">
            No errors recorded yet. Record mistakes from DPPs and mock tests to fuel your SRS deck.
          </p>
        ) : (
          entries.map((entry, idx) => (
            <div
              key={idx}
              className="p-3 bg-hunter-900/80 rounded border border-hunter-800 text-xs space-y-2 hover:border-purple-500/40 transition-all"
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-purple-300">
                  {entry.subject} &bull; {entry.chapter_id}
                </span>
                <span className="px-1.5 py-0.5 bg-purple-950 rounded border border-purple-500/40 text-purple-300 uppercase">
                  {entry.tag}
                </span>
              </div>
              <p className="font-semibold text-hunter-100 text-[11px]">{entry.question}</p>
              <div className="text-[10px] text-red-300 bg-red-950/20 p-2 rounded border border-red-900/40">
                <span className="font-bold">MISTAKE: </span>{entry.mistake}
              </div>
              <div className="text-[10px] text-green-300 bg-green-950/20 p-2 rounded border border-green-900/40">
                <span className="font-bold">CORRECT: </span>{entry.correct_approach}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
