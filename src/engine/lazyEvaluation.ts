import { db } from '@/src/db/db';
import { currentGameDay, getPlanDayNumber } from './time';
import { evaluateDay, DayEvaluationResult } from './evaluateDay';
import { generateDailyQuests } from './quests';
import { DifficultyMode, QuestLog } from '@/src/types';

/**
 * Runs lazy day evaluation for all past unevaluated days up to today.
 * Returns evaluation results for any evaluated days so a summary modal can be shown.
 */
export async function runLazyEvaluation(): Promise<DayEvaluationResult[]> {
  const today = currentGameDay();
  const lastEvalSetting = await db.settings.get('last_evaluated_game_day');
  const lastEvaluatedDay = (lastEvalSetting?.value as string) || '';

  if (!lastEvaluatedDay) {
    // First time initialized: mark yesterday as evaluated so today is not prematurely evaluated
    await db.settings.put({ key: 'last_evaluated_game_day', value: today });
    return [];
  }

  if (lastEvaluatedDay === today) {
    // Already up to date
    return [];
  }

  const results: DayEvaluationResult[] = [];

  // Parse dates and iterate through each day from lastEvaluatedDay + 1 up to (today - 1)
  const [ly, lm, ld] = lastEvaluatedDay.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);

  let iterDate = new Date(Date.UTC(ly, lm - 1, ld + 1));
  const targetDate = new Date(Date.UTC(ty, tm - 1, td));

  const diffSetting = await db.settings.get('difficulty_mode');
  const mode: DifficultyMode = (diffSetting?.value as DifficultyMode) || 'normal';

  const startSetting = await db.settings.get('start_date');
  const startDate = (startSetting?.value as string) || '2026-11-01';

  const streakSetting = await db.settings.get('current_streak');
  let currentStreak = Number(streakSetting?.value || 0);

  const restTokensSetting = await db.settings.get('rest_tokens_remaining');
  let restTokens = Number(restTokensSetting?.value ?? 3);

  while (iterDate < targetDate) {
    const yyyy = iterDate.getUTCFullYear();
    const mm = String(iterDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(iterDate.getUTCDate()).padStart(2, '0');
    const dayStr = `${yyyy}-${mm}-${dd}`;

    const dayNum = getPlanDayNumber(dayStr, startDate);

    // Retrieve quests for that day
    let quests: QuestLog[] = await db.quest_logs.where({ date: dayStr }).toArray();
    if (quests.length === 0) {
      quests = generateDailyQuests(dayStr, Math.max(1, dayNum), mode);
      await db.quest_logs.bulkAdd(quests);
    }

    // Retrieve MP balance earned/spent on that day
    const dayMpEntries = await db.mp_ledger.where({ date: dayStr }).toArray();
    const dayMpNet = dayMpEntries.reduce((sum, e) => sum + e.amount, 0);

    // Check if rest token was activated for this day
    const restDaySetting = await db.settings.get(`rest_day_${dayStr}`);
    const restTokenUsed = Boolean(restDaySetting?.value);

    // Check missed days in last 7 days
    const recentXp = await db.xp_ledger.where('date').between(lastEvaluatedDay, dayStr, true, true).toArray();
    const missedIn7 = recentXp.filter((e) => e.source === 'daily_penalty').length;

    const evalResult = evaluateDay({
      date: dayStr,
      questLogs: quests,
      unspentMP: Math.max(0, dayMpNet),
      currentStreak,
      restTokenUsed,
      missedDaysInLast7: missedIn7
    });

    // Write resulting XP & MP ledger entries
    if (evalResult.xpEntries.length > 0) {
      await db.xp_ledger.bulkAdd(evalResult.xpEntries);
    }
    if (evalResult.mpEntries.length > 0) {
      await db.mp_ledger.bulkAdd(evalResult.mpEntries);
    }

    currentStreak = evalResult.newStreak;
    if (evalResult.restTokensDelta !== 0) {
      restTokens = Math.max(0, restTokens + evalResult.restTokensDelta);
      await db.settings.put({ key: 'rest_tokens_remaining', value: restTokens });
    }

    if (evalResult.emergencyLockoutTriggered) {
      await db.settings.put({ key: 'emergency_lockout_active', value: true });
    }

    results.push(evalResult);

    // Increment 1 day
    iterDate.setUTCDate(iterDate.getUTCDate() + 1);
  }

  // Update persistent streak and last evaluated day
  await db.settings.put({ key: 'current_streak', value: currentStreak });
  await db.settings.put({ key: 'last_evaluated_game_day', value: today });

  return results;
}
