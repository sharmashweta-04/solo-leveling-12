'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { currentGameDay } from '@/src/engine/time';
import { sfx } from '@/src/utils/systemAudio';
import { ChapterProgress, SRSCard } from '@/src/types';
import resourcesConfig from '@/config/resources.json';
import systemMessages from '@/config/system_messages.json';
import gameRules from '@/config/game_rules.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';

export default function GateDetailClient({ gateId }: { gateId: string }) {
  const router = useRouter();
  const normalizedGateId = gateId.toUpperCase();
  const chapterDef = CHAPTERS_DATA.find((c) => c.id.toUpperCase() === normalizedGateId);

  const [progress, setProgress] = useState<ChapterProgress | null>(null);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [bossScore, setBossScore] = useState<number>(15);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract resources from config/resources.json
  const getResources = () => {
    if (!chapterDef) return [];
    const subjKey = chapterDef.subject === 'Physics' ? 'PHY' : chapterDef.subject === 'Chemistry' ? 'CHEM' : 'BIO';
    const subjObj = (resourcesConfig as any)[subjKey];
    const chList = subjObj?.chapters?.[chapterDef.id] || [];
    return chList.filter((r: any) => r && r.url);
  };

  const resources = getResources();

  useEffect(() => {
    async function load() {
      if (!chapterDef) return;
      let record = await db.chapter_progress.get(chapterDef.id);
      if (!record) {
        record = {
          id: chapterDef.id,
          subject: chapterDef.subject,
          name: chapterDef.name,
          status: 'locked',
          topics_completed: [],
          total_topics: chapterDef.topics.length,
          boss_cleared: false,
          shadow_extracted: false,
          notes: '',
          updated_at: new Date().toISOString()
        };
        await db.chapter_progress.put(record);
      }
      setProgress(record);
      setCompletedTopics(record.topics_completed);
      setNotes(record.notes || '');
      if (record.boss_score !== undefined) setBossScore(record.boss_score);
      setLoading(false);
    }
    load();
  }, [chapterDef]);

  if (!chapterDef) {
    return (
      <div className="text-cyan-400 p-6 font-mono text-center">
        <h1 className="text-xl font-bold">[ GATE NOT FOUND ]</h1>
        <Link href="/dungeon" className="text-xs text-cyan-300 underline mt-4 inline-block min-h-[44px] flex items-center justify-center">
          Return to Dungeon
        </Link>
      </div>
    );
  }

  const toggleTopic = async (topic: string) => {
    sfx.click();
    const updated = completedTopics.includes(topic)
      ? completedTopics.filter((t) => t !== topic)
      : [...completedTopics, topic];

    setCompletedTopics(updated);

    const nowIso = new Date().toISOString();
    const newStatus = updated.length === chapterDef.topics.length ? 'cleared' : updated.length > 0 ? 'in_progress' : 'locked';

    await db.chapter_progress.update(chapterDef.id, {
      topics_completed: updated,
      status: progress?.shadow_extracted ? 'shadow' : newStatus,
      updated_at: nowIso
    });
  };

  const handleSaveNotes = async () => {
    sfx.click();
    await db.chapter_progress.update(chapterDef.id, {
      notes,
      updated_at: new Date().toISOString()
    });
    setToastMessage('[ SYSTEM ] Tactical notes saved.');
  };

  const handleSubmitBossTest = async () => {
    const isPassing = bossScore >= 15;
    const nowIso = new Date().toISOString();
    const today = currentGameDay();

    await db.chapter_progress.update(chapterDef.id, {
      boss_score: bossScore,
      boss_cleared: isPassing,
      shadow_extracted: isPassing,
      status: isPassing ? 'shadow' : progress?.status || 'in_progress',
      updated_at: nowIso
    });

    if (isPassing) {
      sfx.levelUp();
      // Award Boss Test XP
      await db.xp_ledger.add({
        date: today,
        amount: 250,
        source: 'boss_test',
        reason: `Cleared Boss Test: ${chapterDef.id} - ${chapterDef.name} (${bossScore}/20)`,
        created_at: nowIso
      });

      // Schedule Spaced Repetition Flashcards at D+1, D+3, D+7, D+14
      const intervals = gameRules.srs_intervals_days;
      const cardsToAdd: SRSCard[] = intervals.map((gapDays) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + gapDays);
        return {
          chapter_id: chapterDef.id,
          subject: chapterDef.subject,
          front: `Core review: ${chapterDef.name} (${gapDays}d after Boss test)`,
          back: `Review summary notes and key formulas for ${chapterDef.name}`,
          interval_days: gapDays,
          ease_factor: 2.5,
          repetition: 0,
          due_date: dueDate.toISOString().slice(0, 10)
        };
      });

      await db.srs_cards.bulkAdd(cardsToAdd);

      const shadowMsg = systemMessages.shadow
        .replace('{chapter}', chapterDef.name)
        .replace('{count}', '1');

      setToastMessage(`${shadowMsg} +250 XP awarded! Spaced repetition scheduled.`);
      setProgress((prev) => prev ? { ...prev, boss_cleared: true, shadow_extracted: true, status: 'shadow' } : null);
    } else {
      sfx.penalty();
      setToastMessage(`[ SYSTEM ] Boss score ${bossScore}/20 recorded. Score ≥ 15 required for Shadow Extraction.`);
    }
  };

  return (
    <div className="font-mono select-none space-y-4 pb-24 max-w-md mx-auto">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-cyan-500/30 pb-3 mb-2">
        <div>
          <span className="text-xs text-cyan-400 font-bold uppercase block tracking-widest">
            {chapterDef.subject} WING &bull; GATE {chapterDef.id}
          </span>
          <h1 className="text-base font-extrabold text-cyan-300 tracking-wide text-shadow-blue">
            {chapterDef.name}
          </h1>
        </div>
        <Link
          href="/dungeon"
          className="text-xs text-slate-400 border border-slate-700 hover:border-cyan-400 px-2.5 py-1.5 rounded min-h-[44px] flex items-center"
        >
          DUNGEON ⛩️
        </Link>
      </div>

      {/* Status Banner */}
      {progress?.shadow_extracted && (
        <HudFrame title="SHADOW MONARCH EXTRACTION" icon="🌑" delay={0}>
          <div className="text-center">
            <p className="text-xs text-purple-200 mt-1">
              This chapter now serves in your Shadow Army. Spaced repetition reviews active.
            </p>
          </div>
        </HudFrame>
      )}

      {/* Topic Checklist */}
      <HudFrame title="SYLLABUS TOPIC CHECKLIST" icon="📜" delay={80}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-slate-300">CURRICULUM TOPICS</span>
          <span className="text-xs text-cyan-300 font-bold">
            {completedTopics.length} / {chapterDef.topics.length} MASTERED
          </span>
        </div>

        <div className="space-y-2">
          {chapterDef.topics.map((topic, idx) => {
            const isDone = completedTopics.includes(topic);
            return (
              <label
                key={idx}
                className={`min-h-[44px] p-2.5 rounded border flex items-start gap-2.5 cursor-pointer transition-all text-xs ${
                  isDone
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-slate-400 line-through'
                    : 'border-slate-800 bg-slate-950/60 text-slate-100 hover:border-cyan-500/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleTopic(topic)}
                  className="mt-0.5 h-4 w-4 rounded border-cyan-400 text-cyan-400 focus:ring-0 bg-black cursor-pointer"
                />
                <span className="leading-snug">{topic}</span>
              </label>
            );
          })}
        </div>
      </HudFrame>

      {/* Chapter Resources from resources.json */}
      <HudFrame title="GATE RESOURCES & VIDEOS" icon="📺" delay={160}>
        {resources.length > 0 ? (
          <div className="space-y-2">
            {resources.map((res: any, idx: number) => (
              <a
                key={idx}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] p-2.5 bg-slate-950/80 border border-slate-800 hover:border-cyan-400 rounded text-xs text-cyan-300 hover:text-white transition-all flex items-center justify-between"
              >
                <span className="truncate max-w-[260px]">📺 {res.title}</span>
                <span className="text-xs text-cyan-400 underline font-bold">OPEN ↗</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic p-2 bg-slate-950/60 rounded border border-slate-800">
            No video links configured yet. (Add link in config/resources.json)
          </p>
        )}
      </HudFrame>

      {/* Notes Field */}
      <HudFrame title="TACTICAL GATE NOTES" icon="📝" delay={240}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record key formulas, weak concepts, and chapter notes here..."
          rows={3}
          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none mb-2"
        />
        <button
          onClick={handleSaveNotes}
          className="min-h-[44px] w-full py-2 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400 text-cyan-200 rounded text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center"
        >
          SAVE NOTES
        </button>
      </HudFrame>

      {/* Gate Boss Test Form */}
      <HudFrame title="GATE BOSS TEST (DPP)" icon="⚔️" delay={320}>
        <p className="text-xs text-slate-400 mb-3">
          Self-reported score out of 20 questions. Score ≥ 75% (15/20) triggers Shadow Extraction.
        </p>

        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-slate-400">SCORE:</label>
          <input
            type="number"
            min={0}
            max={20}
            value={bossScore}
            onChange={(e) => setBossScore(Math.max(0, Math.min(20, Number(e.target.value))))}
            className="w-20 min-h-[44px] bg-slate-950 border border-cyan-400 rounded p-1.5 text-center font-bold text-cyan-300 text-sm focus:outline-none"
          />
          <span className="text-xs text-slate-400">/ 20</span>
          <span className="text-xs font-bold text-cyan-300 ml-auto">
            {Math.round((bossScore / 20) * 100)}%
          </span>
        </div>

        <button
          onClick={handleSubmitBossTest}
          className="min-h-[44px] w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center"
        >
          SUBMIT BOSS TEST & EXTRACT SHADOW
        </button>
      </HudFrame>
    </div>
  );
}
