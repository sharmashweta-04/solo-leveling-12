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
  hasAllClearBonus?: boolean;
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
 * Implements game_rules.json day_result (cleared_requires, all_clear, streak, unspent_mp_conversion).
 */
export function evaluateDay(input: DayEvaluationInput): DayEvaluationResult {
  const { date, questLogs, unspentMP, currentStreak, restTokenUsed, missedDaysInLast7, hasAllClearBonus = false } = input;
  const now = new Date().toISOString();

  const xpEntries: XPLedgerEntry[] = [];
  const mpEntries: MPLedgerEntry[] = [];

  // Case 1: Rest token used (Honours rest token, preserves streak, no penalty)
  if (restTokenUsed) {
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

  // Check cleared conditions from gameRules.day_result.cleared_requires
  const reqRules = gameRules.day_result?.cleared_requires || {
    focus_blocks_min_ratio: 0.75,
    physical: true,
    night_review: true
  };

  const focusQuests = questLogs.filter((q) => q.quest_id.startsWith('focus_'));
  const totalReqFocus = focusQuests.reduce((sum, q) => sum + q.required_blocks, 0);
  const totalCompFocus = focusQuests.reduce(
    (sum, q) => sum + (q.is_completed ? q.required_blocks : (q.completed_blocks || 0)),
    0
  );
  const focusRatio = totalReqFocus === 0 ? 1 : totalCompFocus / totalReqFocus;
  const focusPassed = focusRatio >= (reqRules.focus_blocks_min_ratio ?? 0.75);

  const physicalQuest = questLogs.find((q) => q.quest_id === 'physical_quest');
  const physicalPassed = reqRules.physical ? (physicalQuest ? physicalQuest.is_completed : true) : true;

  const nightReviewQuest = questLogs.find((q) => q.quest_id === 'night_review');
  const nightReviewPassed = reqRules.night_review ? (nightReviewQuest ? nightReviewQuest.is_completed : true) : true;

  const isCleared = focusPassed && physicalPassed && nightReviewPassed;
  const isAllClear = questLogs.length > 0 && questLogs.every((q) => q.is_completed);

  let newStreak = currentStreak;
  let isFailed = false;
  let emergencyLockoutTriggered = false;

  if (isCleared) {
    // Success: increase streak
    newStreak = currentStreak + 1;

    // All-clear bonus if every quest was completed and not already awarded during the day
    if (isAllClear && !hasAllClearBonus) {
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

  // Convert unspent MP to XP on every evaluated day (cleared, failed, or rest-token)
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

  const summary = isCleared
    ? isAllClear
      ? `[ SYSTEM UPDATE ] Day ${date}: ALL-CLEAR! Streak extended to ${newStreak} days.`
      : `[ SYSTEM UPDATE ] Day ${date}: CLEARED! Streak extended to ${newStreak} days.`
    : `[ PENALTY ZONE ] Day ${date}: FAILED. -150 XP penalty. Streak reset to 0.${
        emergencyLockoutTriggered ? ' EMERGENCY LOCKOUT TRIGGERED!' : ''
      }`;

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
