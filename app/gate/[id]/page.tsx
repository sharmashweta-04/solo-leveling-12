'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import { currentGameDay } from '@/src/engine/time';
import { awardXP } from '@/src/engine/xp';
import { playSystemChime } from '@/src/utils/audio';
import { ChapterProgress, SRSCard, Subject } from '@/src/types';
import resourcesConfig from '@/config/resources.json';
import systemMessages from '@/config/system_messages.json';
import gameRules from '@/config/game_rules.json';
import Toast from '@/src/components/Toast';
import Link from 'next/link';

export default function GateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gateId = (params.id as string).toUpperCase();

  const chapterDef = CHAPTERS_DATA.find((c) => c.id.toUpperCase() === gateId);
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
      <div className="min-h-screen bg-hunter-950 text-hunter-blue p-6 font-mono text-center">
        <h1 className="text-xl font-bold">[ GATE NOT FOUND ]</h1>
        <Link href="/dungeon" className="text-xs text-hunter-cyan underline mt-4 inline-block">
          Return to Dungeon
        </Link>
      </div>
    );
  }

  const toggleTopic = async (topic: string) => {
    playSystemChime();
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
    playSystemChime();
    await db.chapter_progress.update(chapterDef.id, {
      notes,
      updated_at: new Date().toISOString()
    });
    setToastMessage('[ SYSTEM ] Gate tactical notes saved.');
  };

  const handleSubmitBossTest = async () => {
    playSystemChime();
    const today = currentGameDay();
    const nowIso = new Date().toISOString();
    const passThreshold = (gameRules.gate_boss.pass_percent / 100) * gameRules.gate_boss.questions; // 75% of 20 = 15
    const isPass = bossScore >= passThreshold;

    if (isPass) {
      // Gate Cleared and Shadow Extracted
      await db.chapter_progress.update(chapterDef.id, {
        boss_score: bossScore,
        boss_cleared: true,
        shadow_extracted: true,
        status: 'shadow',
        updated_at: nowIso
      });

      // Award Boss XP (+150 XP)
      const bossXp = awardXP(150);
      await db.xp_ledger.add({
        date: today,
        amount: bossXp,
        source: 'boss_test',
        reason: `Cleared Gate Boss: ${chapterDef.id} — ${chapterDef.name} (${bossScore}/20)`,
        created_at: nowIso
      });

      // Schedule 4 SRS Review Cards at D+1, D+3, D+7, D+14
      const intervals = gameRules.srs_intervals_days; // [1, 3, 7, 14]
      const [y, m, d] = today.split('-').map(Number);

      const cardsToAdd: SRSCard[] = intervals.map((intv) => {
        const dueDateObj = new Date(Date.UTC(y, m - 1, d + intv));
        const yyyy = dueDateObj.getUTCFullYear();
        const mm = String(dueDateObj.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dueDateObj.getUTCDate()).padStart(2, '0');
        const dueDate = `${yyyy}-${mm}-${dd}`;

        return {
          chapter_id: chapterDef.id,
          subject: chapterDef.subject,
          front: `[ ${chapterDef.id} SHADOW REVIEW ] Key concepts from ${chapterDef.name}`,
          back: `Review topics: ${chapterDef.topics.slice(0, 3).join('; ')}... Notes: ${notes || 'Review NCERT summary'}`,
          interval_days: intv,
          repetition: 0,
          ease_factor: 2.5,
          due_date: dueDate
        };
      });

      await db.srs_cards.bulkAdd(cardsToAdd);

      const totalShadows = await db.chapter_progress.where({ shadow_extracted: 1 as any }).count();
      const shadowMsg = systemMessages.shadow
        .replace('{chapter}', `${chapterDef.id} — ${chapterDef.name}`)
        .replace('{count}', String(totalShadows + 1));

      setToastMessage(shadowMsg);
      setProgress((prev) => (prev ? { ...prev, boss_cleared: true, shadow_extracted: true } : null));
    } else {
      await db.chapter_progress.update(chapterDef.id, {
        boss_score: bossScore,
        updated_at: nowIso
      });
      setToastMessage(`[ SYSTEM ] Boss score ${bossScore}/20 recorded. Score ≥ 15 required for Shadow Extraction.`);
    }
  };

  return (
    <div className="min-h-screen bg-hunter-950 text-hunter-100 font-mono pb-24 max-w-md mx-auto p-4 select-none">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-hunter-blue/40 pb-3 mb-4">
        <div>
          <span className="text-[10px] text-hunter-cyan font-bold uppercase block tracking-widest">
            {chapterDef.subject} WING &bull; GATE {chapterDef.id}
          </span>
          <h1 className="text-base font-extrabold text-hunter-blue tracking-wide text-shadow-blue">
            {chapterDef.name}
          </h1>
        </div>
        <Link
          href="/dungeon"
          className="text-xs text-hunter-gray border border-hunter-800 hover:border-hunter-blue px-2 py-1 rounded"
        >
          DUNGEON ⛩️
        </Link>
      </div>

      {/* Status Banner */}
      {progress?.shadow_extracted && (
        <div className="p-3 mb-4 rounded border border-purple-500 bg-purple-950/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] text-center">
          <div className="text-xs font-bold text-purple-300 tracking-wider">
            [ 🌑 SHADOW MONARCH EXTRACTION COMPLETE ]
          </div>
          <p className="text-[10px] text-purple-200 mt-0.5">
            This chapter now serves in your Shadow Army. Spaced repetition reviews active.
          </p>
        </div>
      )}

      {/* Topic Checklist */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-hunter-blue">[ SYLLABUS TOPIC CHECKLIST ]</span>
          <span className="text-[10px] text-hunter-cyan">
            {completedTopics.length} / {chapterDef.topics.length} MASTERED
          </span>
        </div>

        <div className="space-y-2">
          {chapterDef.topics.map((topic, idx) => {
            const isDone = completedTopics.includes(topic);
            return (
              <label
                key={idx}
                className={`p-2.5 rounded border flex items-start gap-2.5 cursor-pointer transition-all text-xs ${
                  isDone
                    ? 'border-hunter-green/40 bg-green-950/20 text-hunter-gray line-through'
                    : 'border-hunter-800 bg-hunter-950 text-hunter-100 hover:border-hunter-blue/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleTopic(topic)}
                  className="mt-0.5 rounded border-hunter-blue text-hunter-blue focus:ring-0 bg-black cursor-pointer"
                />
                <span className="leading-snug">{topic}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Chapter Resources from resources.json */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4">
        <div className="text-xs font-bold text-hunter-cyan mb-2">[ GATE RESOURCES & VIDEOS ]</div>
        {resources.length > 0 ? (
          <div className="space-y-2">
            {resources.map((res: any, idx: number) => (
              <a
                key={idx}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 bg-hunter-950 border border-hunter-800 hover:border-hunter-blue rounded text-xs text-hunter-blue hover:text-white transition-all flex items-center justify-between"
              >
                <span className="truncate max-w-[260px]">📺 {res.title}</span>
                <span className="text-[10px] text-hunter-cyan underline">OPEN ↗</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-hunter-gray italic p-2 bg-hunter-950 rounded border border-hunter-800">
            No video links configured yet. (Add link in config/resources.json)
          </p>
        )}
      </div>

      {/* Notes Field */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4">
        <div className="text-xs font-bold text-hunter-blue mb-2">[ TACTICAL GATE NOTES ]</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record key formulas, weak concepts, and chapter notes here..."
          rows={3}
          className="w-full bg-hunter-950 border border-hunter-800 rounded p-2 text-xs text-hunter-100 focus:border-hunter-blue focus:outline-none mb-2"
        />
        <button
          onClick={handleSaveNotes}
          className="w-full py-1.5 bg-hunter-blue/20 hover:bg-hunter-blue/30 border border-hunter-blue/50 text-hunter-blue rounded text-xs font-bold tracking-wider uppercase transition-all"
        >
          SAVE NOTES
        </button>
      </div>

      {/* Gate Boss Test Form */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-hunter-cyan">[ GATE BOSS TEST ]</span>
          <span className="text-[10px] text-hunter-gray">PW DPP / CHAPTER TEST</span>
        </div>
        <p className="text-[10px] text-hunter-gray mb-3">
          Self-reported score out of 20 questions. Score ≥ 75% (15/20) triggers Shadow Extraction.
        </p>

        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-hunter-gray">SCORE:</label>
          <input
            type="number"
            min={0}
            max={20}
            value={bossScore}
            onChange={(e) => setBossScore(Math.max(0, Math.min(20, Number(e.target.value))))}
            className="w-20 bg-hunter-950 border border-hunter-blue rounded p-1.5 text-center font-bold text-hunter-blue text-sm focus:outline-none"
          />
          <span className="text-xs text-hunter-gray">/ 20</span>
          <span className="text-xs font-bold text-hunter-cyan ml-auto">
            {Math.round((bossScore / 20) * 100)}%
          </span>
        </div>

        <button
          onClick={handleSubmitBossTest}
          className="w-full py-2.5 bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue hover:text-white rounded text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,217,255,0.3)]"
        >
          SUBMIT BOSS TEST & EXTRACT SHADOW
        </button>
      </div>
    </div>
  );
}
