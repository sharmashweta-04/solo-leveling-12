'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/src/db/db';
import { seedDatabaseIfNeeded, PLAN_DAYS } from '@/src/db/seed';
import { currentGameDay, getPlanDayNumber, isBeforeDay1, getCountdownToStart } from '@/src/engine/time';
import { computeLevel, getLevelProgress } from '@/src/engine/level';
import { computeRank, RankInfo } from '@/src/engine/rank';
import { generateDailyQuests } from '@/src/engine/quests';
import { awardXP } from '@/src/engine/xp';
import { awardMP } from '@/src/engine/mana';
import { runLazyEvaluation } from '@/src/engine/lazyEvaluation';
import { QuestLog, DayPlan, DifficultyMode } from '@/src/types';
import systemMessages from '@/config/system_messages.json';

export interface HunterStats {
  INT: number;
  VIT: number;
  AGI: number;
  PER: number;
}

export function useGameState() {
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [totalMP, setTotalMP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [levelInfo, setLevelInfo] = useState(getLevelProgress(0));
  const [rankInfo, setRankInfo] = useState<RankInfo>(computeRank(0));
  const [stats, setStats] = useState<HunterStats>({ INT: 10, VIT: 10, AGI: 10, PER: 10 });
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('normal');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [introCompleted, setIntroCompleted] = useState(false);
  const [todayQuests, setTodayQuests] = useState<QuestLog[]>([]);
  const [currentDayNumber, setCurrentDayNumber] = useState(1);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<{ level: number } | null>(null);
  const [rankUpEvent, setRankUpEvent] = useState<{ rank: string; title: string } | null>(null);

  const gameDate = currentGameDay();

  const refreshState = useCallback(async () => {
    await seedDatabaseIfNeeded();

    // Run lazy day evaluation for past unevaluated days
    const evalResults = await runLazyEvaluation();
    if (evalResults.length > 0) {
      const last = evalResults[evalResults.length - 1];
      setToastMessage(last.summaryMessage);
    }

    // 1. Settings
    const introSet = await db.settings.get('intro_completed');
    setIntroCompleted(Boolean(introSet?.value));

    const diffSet = await db.settings.get('difficulty_mode');
    const mode: DifficultyMode = (diffSet?.value as DifficultyMode) || 'normal';
    setDifficultyMode(mode);

    const startSet = await db.settings.get('start_date');
    const start = (startSet?.value as string) || '2026-11-01';
    setStartDate(start);

    const streakSet = await db.settings.get('current_streak');
    const currentStreak = Number(streakSet?.value || 0);
    setStreak(currentStreak);

    // 2. Ledgers
    const allXpEntries = await db.xp_ledger.toArray();
    const sumXP = allXpEntries.reduce((acc, curr) => acc + curr.amount, 0);
    setTotalXP(sumXP);

    const allMpEntries = await db.mp_ledger.toArray();
    const sumMP = allMpEntries.reduce((acc, curr) => acc + curr.amount, 0);
    setTotalMP(Math.max(0, sumMP));

    const lvl = getLevelProgress(sumXP);
    const rnk = computeRank(sumXP);
    setLevelInfo(lvl);
    setRankInfo(rnk);

    // 3. Stats based on completed quests & focus sessions
    const focusCount = await db.focus_sessions.where({ completed: 1 as any }).count();
    const completedQuests = await db.quest_logs.where({ is_completed: 1 as any }).toArray();
    
    let intVal = 10 + focusCount * 2;
    let vitVal = 10;
    let agiVal = 10;
    let perVal = 10;

    for (const q of completedQuests) {
      if (q.quest_id.includes('focus')) intVal += 1;
      if (q.quest_id.includes('physical')) vitVal += 3;
      if (q.quest_id.includes('battle')) agiVal += 2;
      if (q.quest_id.includes('grimoire') || q.quest_id.includes('night')) perVal += 2;
    }
    setStats({ INT: intVal, VIT: vitVal, AGI: agiVal, PER: perVal });

    // 4. Plan day
    const dayNum = getPlanDayNumber(gameDate, start);
    setCurrentDayNumber(dayNum);

    const plan = PLAN_DAYS.find((d) => d.day === Math.max(1, Math.min(45, dayNum))) || null;
    setTodayPlan(plan);

    // 5. Quests for today
    let quests = await db.quest_logs.where({ date: gameDate }).toArray();
    if (quests.length === 0) {
      const generated = generateDailyQuests(gameDate, Math.max(1, dayNum), mode);
      await db.quest_logs.bulkAdd(generated);
      quests = await db.quest_logs.where({ date: gameDate }).toArray();
    }
    setTodayQuests(quests);

    setLoading(false);
  }, [gameDate]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Complete a quest action
  const completeQuest = async (questId: string) => {
    const quest = todayQuests.find((q) => q.quest_id === questId);
    if (!quest || quest.is_completed) return;

    const previousLevel = computeLevel(totalXP);
    const previousRank = computeRank(totalXP).rank;

    const awardedXp = awardXP(quest.xp_awarded, rankInfo.multiplier, streak);
    const mpRes = awardMP(totalMP, quest.mp_awarded);

    const now = new Date().toISOString();

    // Mark quest completed
    await db.quest_logs.update(quest.id!, {
      is_completed: true,
      completed_blocks: quest.required_blocks,
      completed_at: now
    });

    // Write XP Ledger
    await db.xp_ledger.add({
      date: gameDate,
      amount: awardedXp,
      source: 'quest',
      reason: `Completed quest: ${quest.title}`,
      created_at: now
    });

    // Write MP Ledger
    if (mpRes.awarded > 0) {
      await db.mp_ledger.add({
        date: gameDate,
        amount: mpRes.awarded,
        source: 'quest',
        description: `Completed quest: ${quest.title}`,
        created_at: now
      });
    }

    // Check level up and rank up
    const newTotalXP = totalXP + awardedXp;
    const newLevel = computeLevel(newTotalXP);
    const newRank = computeRank(newTotalXP);

    if (newLevel > previousLevel) {
      setLevelUpEvent({ level: newLevel });
    }
    if (newRank.rank !== previousRank) {
      setRankUpEvent({ rank: newRank.rank, title: newRank.title });
    }

    // System toast message from config/system_messages.json
    const toast = systemMessages.quest_complete
      .replace('{xp}', String(awardedXp))
      .replace('{mp}', String(mpRes.awarded));
    setToastMessage(toast);

    await refreshState();
  };

  const clearToast = () => setToastMessage(null);
  const clearLevelUpEvent = () => setLevelUpEvent(null);
  const clearRankUpEvent = () => setRankUpEvent(null);

  return {
    loading,
    totalXP,
    totalMP,
    streak,
    levelInfo,
    rankInfo,
    stats,
    difficultyMode,
    startDate,
    introCompleted,
    todayQuests,
    currentDayNumber,
    todayPlan,
    toastMessage,
    levelUpEvent,
    rankUpEvent,
    gameDate,
    isBeforeStart: isBeforeDay1(gameDate, startDate),
    countdownToStart: getCountdownToStart(startDate),
    completeQuest,
    clearToast,
    clearLevelUpEvent,
    clearRankUpEvent,
    refreshState
  };
}
