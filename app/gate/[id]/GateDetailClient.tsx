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
    <div className="select-none space-y-5">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <header className="flex justify-between items-end border-b border-[#5cc8ff]/30 pb-3 pt-1">
        <div>
          <span className="text-xs font-bold font-[family-name:var(--font-cinzel)] text-[#5cc8ff] uppercase block tracking-widest">
            {chapterDef.subject} WING &bull; GATE {chapterDef.id}
          </span>
          <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-wider text-shadow-blue">
            {chapterDef.name}
          </h1>
        </div>
        <Link
          href="/dungeon"
          className="hud2-row !min-h-[44px] px-3 py-1 font-[family-name:var(--font-cinzel)] font-bold text-xs text-[#5cc8ff] border-[#5cc8ff]/50 hover:bg-[#5cc8ff]/20 flex items-center"
        >
          DUNGEON ⛩️
        </Link>
      </header>

      {/* Status Banner */}
      {progress?.shadow_extracted && (
        <HudFrame title="SHADOW MONARCH" icon="🌑" delay={0}>
          <div className="text-center py-1">
            <p className="text-[16px] font-semibold text-[#c084fc] drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]">
              This chapter serves in your Shadow Army. Spaced repetition reviews active.
            </p>
          </div>
        </HudFrame>
      )}

      {/* Topic Checklist */}
      <HudFrame title="SYLLABUS TOPIC CHECKLIST" icon="📜" delay={60}>
        <div className="flex justify-between items-center mb-3 px-1 text-[15px] font-semibold text-[#8ab4d8]">
          <span>CURRICULUM TOPICS</span>
          <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff]">
            {completedTopics.length} / {chapterDef.topics.length} MASTERED
          </span>
        </div>

        <ul className="hud2-goals">
          {chapterDef.topics.map((topic, idx) => {
            const isDone = completedTopics.includes(topic);
            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className="hud2-row justify-between text-left"
                >
                  <span className={`hud2-label text-[15px] ${isDone ? 'line-through text-[#8ab4d8]' : 'text-[#dff3ff]'}`}>
                    {topic}
                  </span>
                  <span className={`hud2-check ${isDone ? 'on' : ''}`}>
                    {isDone ? '✓' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </HudFrame>

      {/* Chapter Resources from resources.json */}
      <HudFrame title="GATE RESOURCES & VIDEOS" icon="📺" delay={120}>
        {resources.length > 0 ? (
          <ul className="hud2-goals">
            {resources.map((res: any, idx: number) => (
              <li key={idx}>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hud2-row justify-between hover:border-[#5cc8ff]"
                >
                  <span className="truncate max-w-[260px] font-semibold text-[15px] text-[#dff3ff]">📺 {res.title}</span>
                  <span className="font-[family-name:var(--font-cinzel)] font-bold text-xs text-[#5cc8ff]">OPEN ↗</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hud2-row justify-center text-center text-[#8ab4d8] text-[15px] italic">
            No video links configured yet for this gate.
          </p>
        )}
      </HudFrame>

      {/* Notes Field */}
      <HudFrame title="TACTICAL GATE NOTES" icon="📝" delay={180}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record key formulas, weak concepts, and chapter notes here..."
          rows={3}
          className="w-full bg-[#030a18] border border-[#5cc8ff]/40 rounded p-3 text-[15px] text-[#dff3ff] focus:border-[#5cc8ff] focus:outline-none mb-3 font-[family-name:var(--font-cormorant)]"
        />
        <button
          onClick={handleSaveNotes}
          className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-[#dff3ff] hover:bg-[#5cc8ff]/20"
        >
          SAVE NOTES
        </button>
      </HudFrame>

      {/* Gate Boss Test Form */}
      <HudFrame title="GATE BOSS TEST (DPP)" icon="⚔️" delay={240}>
        <p className="text-[15px] text-[#8ab4d8] mb-3 px-1 leading-relaxed">
          Self-reported score out of 20 questions. Score ≥ 75% (15/20) triggers Shadow Extraction.
        </p>

        <div className="hud2-row justify-between mb-3">
          <label className="text-[15px] font-bold text-[#8ab4d8]">YOUR SCORE:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={20}
              value={bossScore}
              onChange={(e) => setBossScore(Math.max(0, Math.min(20, Number(e.target.value))))}
              className="w-16 min-h-[44px] bg-[#030a18] border border-[#5cc8ff] text-center font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff] text-lg focus:outline-none"
            />
            <span className="text-[15px] font-semibold text-[#8ab4d8]">/ 20</span>
            <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#34d399] ml-2 text-base">
              ({Math.round((bossScore / 20) * 100)}%)
            </span>
          </div>
        </div>

        <button
          onClick={handleSubmitBossTest}
          className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-[#dff3ff] border-[#5cc8ff] bg-[#5cc8ff]/20 hover:bg-[#5cc8ff]/30 shadow-[0_0_15px_rgba(92,200,255,0.4)]"
        >
          SUBMIT BOSS TEST & EXTRACT SHADOW
        </button>
      </HudFrame>
    </div>
  );
}
