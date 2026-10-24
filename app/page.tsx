'use client';

import { useState, useEffect } from 'react';
import { useGameState } from '@/src/hooks/useGameState';
import IntroScreen from '@/src/components/IntroScreen';
import Toast from '@/src/components/Toast';
import LevelUpModal from '@/src/components/LevelUpModal';
import Link from 'next/link';
import HudFrame from '@/src/components/hud/HudFrame';
import QuestInfoPanel from '@/src/components/hud/QuestInfoPanel';
import QuestArrival from '@/src/components/hud/QuestArrival';
import type { EffectsLevel } from '@/src/components/hud/IntroVideo';
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
    currentDayNumber,
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

  const [effectsMode, setEffectsMode] = useState<EffectsLevel>('full');

  useEffect(() => {
    const updateEff = () => {
      try {
        const stored = localStorage.getItem('solo_visual_effects') as EffectsLevel | null;
        if (stored) setEffectsMode(stored);
      } catch {}
    };
    updateEff();
    window.addEventListener('solo_effects_changed', updateEff);
    return () => window.removeEventListener('solo_effects_changed', updateEff);
  }, []);

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
    <div className="select-none space-y-5">
      {!isBeforeStart && currentDayNumber >= 1 && currentDayNumber <= 45 && (
        <QuestArrival dayKey={gameDate} effects={effectsMode} />
      )}
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
      <header className="flex justify-between items-end border-b border-[#5cc8ff]/30 pb-3 pt-1">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-wider text-shadow-blue flex items-center gap-2">
            <span>STATUS WINDOW</span>
          </h1>
          <p className="text-[15px] font-semibold text-[#8ab4d8] tracking-wide mt-0.5">
            {todayPlan ? `DAY ${todayPlan.day} OF 45` : `PRE-SEASON`} &bull; {gameDate}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-bold font-[family-name:var(--font-cinzel)] text-[#5cc8ff] drop-shadow-[0_0_8px_rgba(92,200,255,0.7)]">
            {streak} DAY STREAK 🔥
          </div>
          <div className="text-[15px] text-[#8ab4d8] font-semibold">
            {totalMP} MP AVAILABLE
          </div>
        </div>
      </header>

      {/* Before Day 1: Prominent Empty State */}
      {isBeforeStart && (
        <HudFrame title="SYSTEM STANDBY" icon="⏳" delay={0}>
          <p className="hud2-sub">
            The 45-Day PCB Dungeon commences on <strong className="text-white">2026-11-01 at 05:00 IST</strong>.
          </p>
          <div className="hud2-div" />
          <div className="hud2-row my-2 justify-center text-center font-[family-name:var(--font-cinzel)] text-lg font-bold text-[#5cc8ff]">
            {countdownToStart.days}d {countdownToStart.hours}h {countdownToStart.minutes}m {countdownToStart.seconds}s
          </div>
          <div className="pt-2">
            <Link
              href="/dungeon"
              className="hud2-row justify-center text-center font-[family-name:var(--font-cinzel)] font-bold text-sm tracking-widest text-[#dff3ff] hover:bg-[#5cc8ff]/20 transition-all"
            >
              EXPLORE SYLLABUS GATES ⛩️
            </Link>
          </div>
        </HudFrame>
      )}

      {/* 1. Today's 45-Day Plan Schedule */}
      {todayPlan && (
        <HudFrame title="GATE OBJECTIVES" icon="⚔️" delay={60}>
          <div className="flex justify-between items-center mb-2 px-1 text-[15px] font-semibold text-[#8ab4d8]">
            <span className="italic">{todayPlan.label}</span>
            <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#5cc8ff]">DAY {todayPlan.day} OF 45</span>
          </div>
          <ul className="hud2-goals">
            <li>
              <div className="hud2-row">
                <span className="hud2-label font-bold text-[#7fcbff]">PHYSICS</span>
                <span className="hud2-count text-[#dff3ff] font-semibold">{todayPlan.PHY.join(', ') || '—'}</span>
              </div>
            </li>
            <li>
              <div className="hud2-row">
                <span className="hud2-label font-bold text-[#c084fc]">CHEMISTRY</span>
                <span className="hud2-count text-[#dff3ff] font-semibold">{todayPlan.CHEM.join(', ') || '—'}</span>
              </div>
            </li>
            <li>
              <div className="hud2-row">
                <span className="hud2-label font-bold text-[#34d399]">BIOLOGY</span>
                <span className="hud2-count text-[#dff3ff] font-semibold">{todayPlan.BIO.join(', ') || '—'}</span>
              </div>
            </li>
          </ul>
        </HudFrame>
      )}

      {/* 2. Daily Quests Board using authentic QuestInfoPanel */}
      <QuestInfoPanel
        heading="QUEST INFO"
        subtitle="Daily Quest: Preparation to Become Strong has arrived."
        items={questItems}
        warning="Failure to complete the daily quest will result in an appropriate penalty."
        onToggle={handleToggleQuest}
      />

      {/* 3. Hunter Rank & Level Card */}
      <HudFrame title="HUNTER STATUS" icon="⚡" delay={120}>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 border border-[#5cc8ff] bg-[#050f24]/80 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(92,200,255,0.4)]">
              <span className="text-[10px] font-bold font-[family-name:var(--font-cinzel)] text-[#5cc8ff] leading-none">RANK</span>
              <span className="text-2xl font-bold font-[family-name:var(--font-cinzel)] text-white leading-tight">{rankInfo.rank}</span>
            </div>
            <div>
              <div className="text-[14px] text-[#8ab4d8] font-bold uppercase tracking-wider">{rankInfo.title}</div>
              <div className="text-lg font-bold font-[family-name:var(--font-cinzel)] text-[#dff3ff] tracking-wide">
                HUNTER LEVEL {levelInfo.level}
              </div>
              <div className="text-[14px] text-[#5cc8ff] font-semibold">
                XP Multiplier: {rankInfo.multiplier}x
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[13px] text-[#8ab4d8] font-semibold block uppercase">TOTAL EXP</span>
            <span className="text-lg font-bold font-[family-name:var(--font-cinzel)] text-[#5cc8ff] text-shadow-blue">
              {totalXP.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="px-1 pt-1">
          <div className="flex justify-between text-[14px] text-[#8ab4d8] mb-1 font-semibold">
            <span>EXP TO LEVEL {levelInfo.level + 1}</span>
            <span className="font-[family-name:var(--font-cinzel)] font-bold text-[#dff3ff]">
              {levelInfo.xpInCurrentLevel} / {levelInfo.nextLevelXp - levelInfo.currentLevelXp} XP ({levelInfo.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#030a18] overflow-hidden border border-[#5cc8ff]/40">
            <div
              className="h-full bg-gradient-to-r from-[#1e5aab] via-[#5cc8ff] to-[#e8f8ff] transition-all duration-500 shadow-[0_0_10px_rgba(92,200,255,0.8)]"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </HudFrame>

      {/* 4. Hunter Attributes (INT, VIT, AGI, PER) */}
      <HudFrame title="CORE ATTRIBUTES" icon="📊" delay={180}>
        <div className="space-y-2">
          {/* INT */}
          <div className="hud2-row justify-between">
            <div className="flex-1 mr-3">
              <div className="flex justify-between text-[16px] font-bold text-[#7fcbff] mb-1">
                <span>INT (Intellect)</span>
                <span className="font-[family-name:var(--font-cinzel)]">{stats.INT}</span>
              </div>
              <div className="w-full h-1.5 bg-[#030a18] overflow-hidden border border-[#5cc8ff]/30">
                <div className="h-full bg-[#5cc8ff]" style={{ width: `${Math.min(100, stats.INT * 2)}%` }} />
              </div>
            </div>
          </div>

          {/* VIT */}
          <div className="hud2-row justify-between">
            <div className="flex-1 mr-3">
              <div className="flex justify-between text-[16px] font-bold text-[#34d399] mb-1">
                <span>VIT (Vitality)</span>
                <span className="font-[family-name:var(--font-cinzel)]">{stats.VIT}</span>
              </div>
              <div className="w-full h-1.5 bg-[#030a18] overflow-hidden border border-[#34d399]/30">
                <div className="h-full bg-[#34d399]" style={{ width: `${Math.min(100, stats.VIT * 2)}%` }} />
              </div>
            </div>
          </div>

          {/* AGI */}
          <div className="hud2-row justify-between">
            <div className="flex-1 mr-3">
              <div className="flex justify-between text-[16px] font-bold text-[#fbbf24] mb-1">
                <span>AGI (Agility)</span>
                <span className="font-[family-name:var(--font-cinzel)]">{stats.AGI}</span>
              </div>
              <div className="w-full h-1.5 bg-[#030a18] overflow-hidden border border-[#fbbf24]/30">
                <div className="h-full bg-[#fbbf24]" style={{ width: `${Math.min(100, stats.AGI * 2)}%` }} />
              </div>
            </div>
          </div>

          {/* PER */}
          <div className="hud2-row justify-between">
            <div className="flex-1 mr-3">
              <div className="flex justify-between text-[16px] font-bold text-[#c084fc] mb-1">
                <span>PER (Perception)</span>
                <span className="font-[family-name:var(--font-cinzel)]">{stats.PER}</span>
              </div>
              <div className="w-full h-1.5 bg-[#030a18] overflow-hidden border border-[#c084fc]/30">
                <div className="h-full bg-[#c084fc]" style={{ width: `${Math.min(100, stats.PER * 2)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </HudFrame>
    </div>
  );
}
