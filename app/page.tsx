'use client';

import { useGameState } from '@/src/hooks/useGameState';
import IntroScreen from '@/src/components/IntroScreen';
import Toast from '@/src/components/Toast';
import LevelUpModal from '@/src/components/LevelUpModal';
import Link from 'next/link';

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-hunter-blue font-mono min-h-[60vh]">
        <div className="text-base font-bold tracking-widest animate-pulse">[ SYSTEM INITIALIZING ]</div>
        <p className="text-xs text-hunter-400 mt-2">Connecting Hunter to NCERT Gate Network...</p>
      </div>
    );
  }

  // Show intro screen if first time launch
  if (!introCompleted) {
    return <IntroScreen level={1} onComplete={refreshState} />;
  }

  const nextQuest = todayQuests.find((q) => !q.is_completed);

  return (
    <div className="font-mono select-none">
      <Toast message={toastMessage} onClose={clearToast} />
      <LevelUpModal
        levelEvent={levelUpEvent}
        rankEvent={rankUpEvent}
        onClose={() => {
          clearLevelUpEvent();
          clearRankUpEvent();
        }}
      />

      {/* Top Header: System Window Title */}
      <header className="flex justify-between items-center border-b border-hunter-blue/30 pb-3 mb-4">
        <div>
          <h1 className="text-base font-extrabold text-hunter-blue tracking-wider text-shadow-blue flex items-center gap-1.5">
            <span>[ STATUS WINDOW ]</span>
          </h1>
          <p className="text-xs text-hunter-400 tracking-wide mt-0.5">
            {todayPlan ? `DAY ${todayPlan.day} OF 45` : `PRE-SEASON`} &bull; {gameDate}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-hunter-cyan">{streak} DAY STREAK 🔥</div>
          <div className="text-xs text-hunter-blue font-semibold">{totalMP} MP AVAILABLE</div>
        </div>
      </header>

      {/* Before Day 1: Prominent Empty State */}
      {isBeforeStart && (
        <div className="border border-hunter-blue/60 bg-hunter-900/90 p-4 rounded-xl mb-4 shadow-[0_0_20px_rgba(0,217,255,0.25)]">
          <div className="text-xs font-bold text-hunter-cyan mb-1 flex items-center gap-1.5">
            <span className="animate-pulse text-base">⏳</span>
            <span>[ SYSTEM STANDBY: GATE COUNTDOWN ]</span>
          </div>
          <p className="text-xs text-hunter-200 mt-1 leading-relaxed">
            The 45-Day PCB Dungeon commences on <strong className="text-white">2026-11-01 at 05:00 IST</strong>.
            Your Hunter Awakening ritual is complete. Review syllabus topics ahead of time or study in the Dungeon.
          </p>
          <div className="my-3 text-center text-sm font-bold text-hunter-blue bg-hunter-950 p-2.5 rounded-lg border border-hunter-blue/40 tracking-widest shadow-inner">
            {countdownToStart.days}d {countdownToStart.hours}h {countdownToStart.minutes}m {countdownToStart.seconds}s
          </div>
          <Link
            href="/dungeon"
            className="min-h-[44px] w-full bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue hover:text-white rounded-lg text-xs font-bold tracking-wider uppercase flex items-center justify-center transition-all"
          >
            EXPLORE SYLLABUS GATES ⛩️
          </Link>
        </div>
      )}

      {/* 1. Today's 45-Day Plan Schedule (Shown FIRST per Prompt B) */}
      {todayPlan && (
        <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold text-hunter-blue">[ TODAY&apos;S GATE OBJECTIVES ]</span>
            <span className="text-xs text-hunter-cyan font-bold">DAY {todayPlan.day} OF 45</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
            <div className="bg-blue-950/70 border border-blue-600/40 p-2 rounded">
              <span className="text-xs text-blue-400 block font-semibold mb-0.5">PHYSICS</span>
              <span className="font-bold text-white text-xs">{todayPlan.PHY.join(', ') || '—'}</span>
            </div>
            <div className="bg-purple-950/70 border border-purple-600/40 p-2 rounded">
              <span className="text-xs text-purple-400 block font-semibold mb-0.5">CHEMISTRY</span>
              <span className="font-bold text-white text-xs">{todayPlan.CHEM.join(', ') || '—'}</span>
            </div>
            <div className="bg-green-950/70 border border-green-600/40 p-2 rounded">
              <span className="text-xs text-green-400 block font-semibold mb-0.5">BIOLOGY</span>
              <span className="font-bold text-white text-xs">{todayPlan.BIO.join(', ') || '—'}</span>
            </div>
          </div>
          <p className="text-xs text-hunter-300 italic truncate">{todayPlan.label}</p>
        </div>
      )}

      {/* 2. Daily Quests Board (Shown IMMEDIATELY after Objectives) */}
      <div className="border border-hunter-blue/40 bg-hunter-900/80 rounded-lg p-3.5 mb-4 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-xs font-bold text-hunter-blue flex items-center gap-1.5">
              <span>[ DAILY QUESTS ]</span>
              {nextQuest && (
                <span className="text-xs text-hunter-cyan font-semibold">
                  ({todayQuests.filter((q) => q.is_completed).length}/{todayQuests.length} DONE)
                </span>
              )}
            </div>
            <div className="text-xs text-red-400 font-medium mt-0.5">
              Warning: Failure results in -150 XP penalty
            </div>
          </div>
          <Link
            href="/focus"
            className="min-h-[44px] px-3 bg-hunter-blue/20 border border-hunter-blue text-hunter-blue hover:text-white rounded-lg hover:bg-hunter-blue/40 transition-all font-bold text-xs flex items-center"
          >
            TIMER ⏱️
          </Link>
        </div>

        <div className="space-y-2">
          {todayQuests.map((quest) => (
            <div
              key={quest.quest_id}
              className={`p-3 rounded-lg border transition-all flex items-center justify-between text-xs min-h-[44px] ${
                quest.is_completed
                  ? 'border-hunter-green/40 bg-green-950/20 text-hunter-400 line-through'
                  : 'border-hunter-800 bg-hunter-950 hover:border-hunter-blue/50 text-hunter-100'
              }`}
            >
              <div className="flex-1 mr-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>{quest.is_completed ? '✅' : '⚔️'}</span>
                  <span className={quest.is_completed ? 'text-hunter-green' : 'text-hunter-100'}>
                    {quest.title}
                  </span>
                </div>
                <div className="text-xs text-hunter-cyan mt-0.5">
                  +{quest.xp_awarded} XP &bull; +{quest.mp_awarded} MP
                </div>
              </div>

              {!quest.is_completed && (
                <button
                  type="button"
                  onClick={() => completeQuest(quest.quest_id)}
                  className="min-h-[44px] min-w-[70px] px-3 py-1.5 rounded bg-hunter-blue/20 hover:bg-hunter-blue/40 border border-hunter-blue text-hunter-blue hover:text-white text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(0,217,255,0.3)] flex items-center justify-center"
                >
                  COMPLETE
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Hunter Rank & Level Card (Moved below quests per Prompt B) */}
      <div className="border border-hunter-blue/50 bg-hunter-900/80 rounded-lg p-3.5 mb-4 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-hunter-950 border-2 border-hunter-blue flex flex-col items-center justify-center shadow-[0_0_12px_rgba(0,217,255,0.4)]">
              <span className="text-xs text-hunter-cyan font-bold leading-none">RANK</span>
              <span className="text-xl font-black text-hunter-blue leading-tight">{rankInfo.rank}</span>
            </div>
            <div>
              <div className="text-xs text-hunter-400 uppercase tracking-wider">{rankInfo.title}</div>
              <div className="text-base font-bold text-white tracking-wide">
                HUNTER LEVEL {levelInfo.level}
              </div>
              <div className="text-xs text-hunter-cyan font-semibold">
                XP Multiplier: {rankInfo.multiplier}x
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-hunter-400 block">TOTAL EXP</span>
            <span className="text-sm font-bold text-hunter-blue">{totalXP.toLocaleString()}</span>
          </div>
        </div>

        {/* Level XP Bar */}
        <div>
          <div className="flex justify-between text-xs text-hunter-400 mb-1">
            <span>EXP TO LEVEL {levelInfo.level + 1}</span>
            <span>{levelInfo.xpInCurrentLevel} / {levelInfo.nextLevelXp - levelInfo.currentLevelXp} XP ({levelInfo.progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-hunter-950 rounded-full overflow-hidden border border-hunter-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-hunter-blue to-hunter-cyan transition-all duration-500 shadow-[0_0_8px_rgba(0,217,255,0.7)]"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Hunter Attributes (INT, VIT, AGI, PER) (Moved below quests per Prompt B) */}
      <div className="border border-hunter-blue/40 bg-hunter-900/70 rounded-lg p-3.5 mb-4">
        <div className="text-xs text-hunter-cyan font-bold tracking-wider mb-2.5 flex justify-between items-center">
          <span>[ HUNTER ATTRIBUTES ]</span>
          <span className="text-xs text-hunter-400">NCERT PROFICIENCY METRICS</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* INT */}
          <div className="bg-hunter-950/80 p-2.5 rounded border border-hunter-blue/30">
            <div className="flex justify-between text-hunter-blue font-bold mb-1">
              <span>INT (Intellect)</span>
              <span>{stats.INT}</span>
            </div>
            <div className="w-full h-2 bg-hunter-900 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, stats.INT * 2)}%` }} />
            </div>
            <span className="text-xs text-hunter-400 mt-1 block">Focus blocks mastered</span>
          </div>

          {/* VIT */}
          <div className="bg-hunter-950/80 p-2.5 rounded border border-hunter-blue/30">
            <div className="flex justify-between text-hunter-green font-bold mb-1">
              <span>VIT (Vitality)</span>
              <span>{stats.VIT}</span>
            </div>
            <div className="w-full h-2 bg-hunter-900 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, stats.VIT * 2)}%` }} />
            </div>
            <span className="text-xs text-hunter-400 mt-1 block">Physical training & sleep</span>
          </div>

          {/* AGI */}
          <div className="bg-hunter-950/80 p-2.5 rounded border border-hunter-blue/30">
            <div className="flex justify-between text-yellow-400 font-bold mb-1">
              <span>AGI (Agility)</span>
              <span>{stats.AGI}</span>
            </div>
            <div className="w-full h-2 bg-hunter-900 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, stats.AGI * 2)}%` }} />
            </div>
            <span className="text-xs text-hunter-400 mt-1 block">Battle exercises & speed</span>
          </div>

          {/* PER */}
          <div className="bg-hunter-950/80 p-2.5 rounded border border-hunter-blue/30">
            <div className="flex justify-between text-purple-400 font-bold mb-1">
              <span>PER (Perception)</span>
              <span>{stats.PER}</span>
            </div>
            <div className="w-full h-2 bg-hunter-900 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, stats.PER * 2)}%` }} />
            </div>
            <span className="text-xs text-hunter-400 mt-1 block">Grimoire error retention</span>
          </div>
        </div>
      </div>
    </div>
  );
}
