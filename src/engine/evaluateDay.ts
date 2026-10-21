import gameRules from '@/config/game_rules.json';
import { MPLedgerEntry, QuestLog, XPLedgerEntry } from '@/src/types';
import { convertUnspentMPToXP } from './mana';

export interface DayEvaluationInput {
  date: string; // YYYY-MM-DD
  questLogs: QuestLog[];
  unspentMP: number;
  currentStreak: number;
  restTokenUsed: boolean;
  missedDaysInLast7: number;
}

export interface DayEvaluationResult {
  date: string;
  isAllClear: boolean;
  isFailed: boolean;
  isRest: boolean;
  newStreak: number;
  emergencyLockoutTriggered: boolean;
  xpEntries: XPLedgerEntry[];
  mpEntries: MPLedgerEntry[];
  restTokensDelta: number;
  summaryMessage: string;
}

/**
 * Pure evaluation function for a completed game day.
 */
export function evaluateDay(input: DayEvaluationInput): DayEvaluationResult {
  const { date, questLogs, unspentMP, currentStreak, restTokenUsed, missedDaysInLast7 } = input;
  const now = new Date().toISOString();

  const xpEntries: XPLedgerEntry[] = [];
  const mpEntries: MPLedgerEntry[] = [];

  // Case 1: Rest token used (Honours rest token, preserves streak, no penalty)
  if (restTokenUsed) {
    // Convert unspent MP if any
    if (unspentMP > 0) {
      const conv = convertUnspentMPToXP(unspentMP);
      xpEntries.push({
        date,
        amount: conv.xpEarned,
        source: 'mp_conversion',
        reason: `Midnight Mana conversion (${unspentMP} MP -> ${conv.xpEarned} XP)`,
        created_at: now
      });
      mpEntries.push({
        date,
        amount: -conv.mpDeducted,
        source: 'midnight_conversion',
        description: `Unspent MP converted to XP`,
        created_at: now
      });
    }

    return {
      date,
      isAllClear: false,
      isFailed: false,
      isRest: true,
      newStreak: currentStreak, // Preserved
      emergencyLockoutTriggered: false,
      xpEntries,
      mpEntries,
      restTokensDelta: -1,
      summaryMessage: `[ REST TOKEN ACTIVATED ] Day preserved. Streak maintained at ${currentStreak}.`
    };
  }

  // Check mandatory quests completion
  // Mandatory quests: study blocks (physics, chemistry, biology) + physical_quest
  const mandatoryQuests = questLogs.filter((q) =>
    ['focus_physics', 'focus_chemistry', 'focus_biology', 'physical_quest'].includes(q.quest_id)
  );

  const allMandatoryCompleted = mandatoryQuests.length > 0 && mandatoryQuests.every((q) => q.is_completed);
  const totalCompleted = questLogs.filter((q) => q.is_completed).length;
  const isAllClear = questLogs.length > 0 && totalCompleted === questLogs.length;

  let newStreak = currentStreak;
  let isFailed = false;
  let emergencyLockoutTriggered = false;

  if (allMandatoryCompleted) {
    // Success: increase streak
    newStreak = currentStreak + 1;

    // All clear bonus if every single quest was cleared
    if (isAllClear) {
      xpEntries.push({
        date,
        amount: gameRules.quests.all_clear_bonus.xp,
        source: 'streak_bonus',
        reason: 'Daily All-Clear Bonus',
        created_at: now
      });
      mpEntries.push({
        date,
        amount: gameRules.quests.all_clear_bonus.mp,
        source: 'quest',
        description: 'Daily All-Clear MP Bonus',
        created_at: now
      });
    }
  } else {
    // Failed day: apply penalty and reset streak
    isFailed = true;
    newStreak = 0;

    xpEntries.push({
      date,
      amount: gameRules.penalties.failed_daily_quest_xp, // -150
      source: 'daily_penalty',
      reason: 'Failed Daily Quests Penalty',
      created_at: now
    });

    const newMissedCount = missedDaysInLast7 + 1;
    if (newMissedCount >= gameRules.penalties.emergency_lockout.missed_days_in_7) {
      emergencyLockoutTriggered = true;
    }
  }

  // Convert unspent MP to XP
  if (unspentMP > 0) {
    const conv = convertUnspentMPToXP(unspentMP);
    xpEntries.push({
      date,
      amount: conv.xpEarned,
      source: 'mp_conversion',
      reason: `Midnight Mana conversion (${unspentMP} MP -> ${conv.xpEarned} XP)`,
      created_at: now
    });
    mpEntries.push({
      date,
      amount: -conv.mpDeducted,
      source: 'midnight_conversion',
      description: `Unspent MP converted to XP`,
      created_at: now
    });
  }

  const summary = isAllClear
    ? `[ ALL CLEAR ] Hunter cleared all daily quests! Streak: ${newStreak} days.`
    : allMandatoryCompleted
    ? `[ DAY CLEARED ] Mandatory quests completed. Streak: ${newStreak} days.`
    : `[ SYSTEM PENALTY ] Incomplete daily quest. Penalty: ${gameRules.penalties.failed_daily_quest_xp} XP applied. Streak reset to 0.`;

  return {
    date,
    isAllClear,
    isFailed,
    isRest: false,
    newStreak,
    emergencyLockoutTriggered,
    xpEntries,
    mpEntries,
    restTokensDelta: 0,
    summaryMessage: summary
  };
}
