'use client';

import { useGameState } from '@/src/hooks/useGameState';
import IntroScreen from '@/src/components/IntroScreen';
import Toast from '@/src/components/Toast';
import LevelUpModal from '@/src/components/LevelUpModal';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';
import QuestInfoPanel from '@/src/components/hud/QuestInfoPanel';
import { sfx } from '@/src/utils/systemAudio';

export default function Dashboard() {
  const {
    loading,
    totalXP,
    totalMP,
    streak,
    levelInfo,
    rankInfo,
    stats,
    introCompleted,
    todayQuests,
    todayPlan,
    toastMessage,
    levelUpEvent,
    rankUpEvent,
    gameDate,
    isBeforeStart,
    countdownToStart,
    completeQuest,
    clearToast,
    clearLevelUpEvent,
    clearRankUpEvent,
    refreshState
  } = useGameState();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-cyan-400 font-mono min-h-[60vh]">
        <div className="text-base font-bold tracking-widest animate-pulse">[ SYSTEM INITIALIZING ]</div>
        <p className="text-xs text-slate-400 mt-2">Connecting Hunter to NCERT Gate Network...</p>
      </div>
    );
  }

  // Show intro screen if first time launch
  if (!introCompleted) {
    return <IntroScreen level={1} onComplete={refreshState} />;
  }

  const handleToggleQuest = (questId: string) => {
    sfx.click();
    const q = todayQuests.find((item) => item.quest_id === questId);
    if (q && !q.is_completed) {
      sfx.quest();
      completeQuest(questId);
    }
  };

  const questItems = todayQuests.map((q) => ({
    id: q.quest_id,
    label: q.title,
    done: q.is_completed ? q.required_blocks || 1 : q.completed_blocks || 0,
    target: q.required_blocks || 1,
    unit: q.required_blocks > 1 ? ' BLOCKS' : ''
  }));

  return (
    <div className="font-mono select-none space-y-4">
      <Toast message={toastMessage} onClose={clearToast} />
      <LevelUpModal
        levelEvent={levelUpEvent}
        rankEvent={rankUpEvent}
        onClose={() => {
          clearLevelUpEvent();
          clearRankUpEvent();
        }}
      />

      {/* Top Header: System Window Status */}
      <header className="flex justify-between items-center border-b border-cyan-500/30 pb-3 mb-2">
        <div>
          <h1 className="text-base font-extrabold text-cyan-400 tracking-wider text-shadow-blue flex items-center gap-1.5">
            <span>[ STATUS WINDOW ]</span>
          </h1>
          <p className="text-xs text-slate-400 tracking-wide mt-0.5">
            {todayPlan ? `DAY ${todayPlan.day} OF 45` : `PRE-SEASON`} &bull; {gameDate}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-cyan-300">{streak} DAY STREAK 🔥</div>
          <div className="text-xs text-cyan-500 font-semibold">{totalMP} MP AVAILABLE</div>
        </div>
      </header>

      {/* Before Day 1: Prominent Empty State */}
      {isBeforeStart && (
        <HudFrame title="SYSTEM STANDBY: GATE COUNTDOWN" icon="⏳" delay={0}>
          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
            The 45-Day PCB Dungeon commences on <strong className="text-white">2026-11-01 at 05:00 IST</strong>.
            Your Hunter Awakening ritual is complete. Review syllabus topics ahead of time or study in the Dungeon.
          </p>
          <div className="my-3 text-center text-sm font-bold text-cyan-400 bg-slate-950/80 p-2.5 rounded-lg border border-cyan-500/40 tracking-widest shadow-inner">
            {countdownToStart.days}d {countdownToStart.hours}h {countdownToStart.minutes}m {countdownToStart.seconds}s
          </div>
          <Link
            href="/dungeon"
            className="min-h-[44px] w-full bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500 text-cyan-300 hover:text-white rounded-lg text-xs font-bold tracking-wider uppercase flex items-center justify-center transition-all"
          >
            EXPLORE SYLLABUS GATES ⛩️
          </Link>
        </HudFrame>
      )}

      {/* 1. Today's 45-Day Plan Schedule */}
      {todayPlan && (
        <HudFrame title="TODAY'S GATE OBJECTIVES" icon="⚔️" delay={80}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs text-slate-300 italic">{todayPlan.label}</span>
            <span className="text-xs text-cyan-300 font-bold">DAY {todayPlan.day} OF 45</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-blue-950/50 border border-blue-500/40 p-2 rounded">
              <span className="text-xs text-blue-400 block font-semibold mb-0.5">PHYSICS</span>
              <span className="font-bold text-white text-xs">{todayPlan.PHY.join(', ') || '—'}</span>
            </div>
            <div className="bg-purple-950/50 border border-purple-500/40 p-2 rounded">
              <span className="text-xs text-purple-400 block font-semibold mb-0.5">CHEMISTRY</span>
              <span className="font-bold text-white text-xs">{todayPlan.CHEM.join(', ') || '—'}</span>
            </div>
            <div className="bg-emerald-950/50 border border-emerald-500/40 p-2 rounded">
              <span className="text-xs text-emerald-400 block font-semibold mb-0.5">BIOLOGY</span>
              <span className="font-bold text-white text-xs">{todayPlan.BIO.join(', ') || '—'}</span>
            </div>
          </div>
        </HudFrame>
      )}

      {/* 2. Daily Quests Board using authentic QuestInfoPanel */}
      <QuestInfoPanel
        heading="QUEST INFO"
        subtitle="Daily Quest: Preparation to Become Strong has arrived."
        items={questItems}
        warning="Failure to complete daily quests will result in a penalty of -150 XP."
        onToggle={handleToggleQuest}
      />

      {/* 3. Hunter Rank & Level Card */}
      <HudFrame title="HUNTER STATUS" icon="⚡" delay={160}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-950 border-2 border-cyan-400 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(0,255,255,0.4)]">
              <span className="text-[10px] text-cyan-300 font-bold leading-none">RANK</span>
              <span className="text-xl font-black text-white leading-tight">{rankInfo.rank}</span>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">{rankInfo.title}</div>
              <div className="text-sm font-bold text-white tracking-wide">
                HUNTER LEVEL {levelInfo.level}
              </div>
              <div className="text-xs text-cyan-400 font-semibold">
                XP Multiplier: {rankInfo.multiplier}x
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">TOTAL EXP</span>
            <span className="text-sm font-bold text-cyan-300">{totalXP.toLocaleString()}</span>
          </div>
        </div>

        {/* Level XP Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>EXP TO LEVEL {levelInfo.level + 1}</span>
            <span>{levelInfo.xpInCurrentLevel} / {levelInfo.nextLevelXp - levelInfo.currentLevelXp} XP ({levelInfo.progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_8px_rgba(0,255,255,0.7)]"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </HudFrame>

      {/* 4. Hunter Attributes (INT, VIT, AGI, PER) */}
      <HudFrame title="CORE ATTRIBUTES" icon="📊" delay={240}>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* INT */}
          <div className="bg-slate-950/60 p-2.5 rounded border border-blue-500/30">
            <div className="flex justify-between text-blue-400 font-bold mb-1">
              <span>INT (Intellect)</span>
              <span>{stats.INT}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, stats.INT * 2)}%` }} />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Focus blocks mastered</span>
          </div>

          {/* VIT */}
          <div className="bg-slate-950/60 p-2.5 rounded border border-emerald-500/30">
            <div className="flex justify-between text-emerald-400 font-bold mb-1">
              <span>VIT (Vitality)</span>
              <span>{stats.VIT}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, stats.VIT * 2)}%` }} />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Physical training & sleep</span>
          </div>

          {/* AGI */}
          <div className="bg-slate-950/60 p-2.5 rounded border border-amber-500/30">
            <div className="flex justify-between text-amber-400 font-bold mb-1">
              <span>AGI (Agility)</span>
              <span>{stats.AGI}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, stats.AGI * 2)}%` }} />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Speed & daily consistency</span>
          </div>

          {/* PER */}
          <div className="bg-slate-950/60 p-2.5 rounded border border-purple-500/30">
            <div className="flex justify-between text-purple-400 font-bold mb-1">
              <span>PER (Perception)</span>
              <span>{stats.PER}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, stats.PER * 2)}%` }} />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Grimoire error retention</span>
          </div>
        </div>
      </HudFrame>
    </div>
  );
}
