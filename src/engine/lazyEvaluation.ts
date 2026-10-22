import { db, SoloLevelingDatabase } from '@/src/db/db';
import { currentGameDay, getPlanDayNumber } from './time';
import { evaluateDay, DayEvaluationResult } from './evaluateDay';
import { generateDailyQuests } from './quests';
import { PLAN_DAYS } from '@/src/db/seed';
import { DifficultyMode, QuestLog } from '@/src/types';

/**
 * Runs lazy day evaluation using plan day numbers (1..45).
 * Safe, idempotent, respects start/end dates, and prevents false pre-plan penalties.
 */
export async function runLazyEvaluation(
  customDb?: SoloLevelingDatabase,
  nowDateInput?: Date
): Promise<DayEvaluationResult[]> {
  const targetDb = customDb || db;
  const today = currentGameDay(nowDateInput);

  const startSetting = await targetDb.settings.get('start_date');
  const startDate = (startSetting?.value as string) || '2026-11-01';

  const currentPlanDay = getPlanDayNumber(today, startDate);

  // If before Day 1, never evaluate or penalise
  if (currentPlanDay < 1) {
    return [];
  }

  // Determine last evaluated plan day
  const planDaySetting = await targetDb.settings.get('last_evaluated_plan_day');
  let lastEvaluatedPlanDay: number;

  if (planDaySetting && typeof planDaySetting.value === 'number') {
    lastEvaluatedPlanDay = planDaySetting.value;
  } else {
    // Check legacy game day setting for backwards compatibility
    const legacySetting = await targetDb.settings.get('last_evaluated_game_day');
    if (legacySetting && typeof legacySetting.value === 'string' && legacySetting.value.trim() !== '') {
      lastEvaluatedPlanDay = Math.max(0, getPlanDayNumber(legacySetting.value, startDate) - 1);
    } else {
      // First launch on or after Day 1: start tracking from today (do not penalize days before user joined)
      lastEvaluatedPlanDay = Math.max(0, currentPlanDay - 1);
      await targetDb.settings.put({ key: 'last_evaluated_plan_day', value: lastEvaluatedPlanDay });
      await targetDb.settings.put({ key: 'last_evaluated_game_day', value: today });
      return [];
    }
  }

  // We only evaluate completed past days: up to min(currentPlanDay - 1, 45)
  const maxDayToEvaluate = Math.min(currentPlanDay - 1, 45);

  if (lastEvaluatedPlanDay >= maxDayToEvaluate) {
    // Already evaluated up to yesterday or end of plan
    return [];
  }

  const diffSetting = await targetDb.settings.get('difficulty_mode');
  const mode: DifficultyMode = (diffSetting?.value as DifficultyMode) || 'normal';

  const streakSetting = await targetDb.settings.get('current_streak');
  let currentStreak = Number(streakSetting?.value || 0);

  const restTokensSetting = await targetDb.settings.get('rest_tokens_remaining');
  let restTokens = Number(restTokensSetting?.value ?? 3);

  const results: DayEvaluationResult[] = [];

  for (let day = lastEvaluatedPlanDay + 1; day <= maxDayToEvaluate; day++) {
    // 1. Skip if already evaluated (Idempotent)
    const existingEval = await targetDb.day_evaluations.get(day);
    if (existingEval) {
      currentStreak = existingEval.streak_after;
      continue;
    }

    const planItem = PLAN_DAYS.find((p) => p.day === day);
    const dayStr = planItem ? planItem.date : today;

    // 2. Fetch quests for that day
    let quests: QuestLog[] = await targetDb.quest_logs.where({ date: dayStr }).toArray();
    if (quests.length === 0) {
      quests = generateDailyQuests(dayStr, day, mode);
      await targetDb.quest_logs.bulkAdd(quests);
    }

    // 3. Unspent MP for that day
    const dayMpEntries = await targetDb.mp_ledger.where({ date: dayStr }).toArray();
    const dayMpNet = dayMpEntries.reduce((sum, e) => sum + e.amount, 0);

    // 4. Rest token check for that day
    const restDaySetting = await targetDb.settings.get(`rest_day_${dayStr}`);
    const restTokenUsed = Boolean(restDaySetting?.value);

    // 5. Failed days in previous 7 rolling plan days from day_evaluations table
    const past7Evaluations = await targetDb.day_evaluations
      .where('day')
      .between(Math.max(1, day - 7), day, true, false)
      .toArray();

    const failedInLast7 = past7Evaluations.filter((e) => e.status === 'failed').length;

    // 6. Run pure evaluation
    const evalResult = evaluateDay({
      date: dayStr,
      questLogs: quests,
      unspentMP: Math.max(0, dayMpNet),
      currentStreak,
      restTokenUsed,
      missedDaysInLast7: failedInLast7
    });

    // 7. Write ledger entries
    if (evalResult.xpEntries.length > 0) {
      await targetDb.xp_ledger.bulkAdd(evalResult.xpEntries);
    }
    if (evalResult.mpEntries.length > 0) {
      await targetDb.mp_ledger.bulkAdd(evalResult.mpEntries);
    }

    currentStreak = evalResult.newStreak;

    if (evalResult.restTokensDelta !== 0) {
      restTokens = Math.max(0, restTokens + evalResult.restTokensDelta);
      await targetDb.settings.put({ key: 'rest_tokens_remaining', value: restTokens });
    }

    if (evalResult.emergencyLockoutTriggered) {
      await targetDb.settings.put({ key: 'emergency_lockout_active', value: true });
    }

    // 8. Record in day_evaluations table
    await targetDb.day_evaluations.put({
      day,
      date: dayStr,
      evaluated_at: new Date().toISOString(),
      status: evalResult.isRest ? 'rest' : evalResult.isFailed ? 'failed' : 'cleared',
      is_all_clear: evalResult.isAllClear,
      xp_delta: evalResult.xpEntries.reduce((sum, e) => sum + e.amount, 0),
      streak_after: currentStreak,
      summary: evalResult.summaryMessage
    });

    results.push(evalResult);
  }

  // Update persistent state
  await targetDb.settings.put({ key: 'current_streak', value: currentStreak });
  await targetDb.settings.put({ key: 'last_evaluated_plan_day', value: maxDayToEvaluate });
  await targetDb.settings.put({ key: 'last_evaluated_game_day', value: today });

  return results;
}
