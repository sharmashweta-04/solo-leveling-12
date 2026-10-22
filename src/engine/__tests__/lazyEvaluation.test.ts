import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { SoloLevelingDatabase } from '@/src/db/db';
import { runLazyEvaluation } from '../lazyEvaluation';
import { generateDailyQuests } from '../quests';

describe('Lazy Day Evaluation Engine Tests', () => {
  let testDb: SoloLevelingDatabase;

  beforeEach(async () => {
    // Generate unique in-memory database name per test
    const dbName = `TestDB_${Math.random().toString(36).substring(7)}`;
    testDb = new SoloLevelingDatabase(dbName);
    await testDb.open();
    await testDb.settings.put({ key: 'start_date', value: '2026-11-01' });
    await testDb.settings.put({ key: 'difficulty_mode', value: 'normal' });
    await testDb.settings.put({ key: 'current_streak', value: 0 });
    await testDb.settings.put({ key: 'rest_tokens_remaining', value: 3 });
  });

  // Helper to construct IST Date at noon
  const makeDate = (isoDateStr: string) => new Date(`${isoDateStr}T12:00:00+05:30`);

  it('a) opening every day evaluates yesterday exactly once', async () => {
    // Day 1 (2026-11-01) - Initial launch on Day 1
    const res1 = await runLazyEvaluation(testDb, makeDate('2026-11-01'));
    expect(res1.length).toBe(0); // Today is Day 1, yesterday was before Day 1

    // Complete Day 1 quests
    const day1Quests = generateDailyQuests('2026-11-01', 1, 'normal');
    day1Quests.forEach((q) => (q.is_completed = true));
    await testDb.quest_logs.bulkAdd(day1Quests);

    // Day 2 (2026-11-02) - Open next day
    const res2 = await runLazyEvaluation(testDb, makeDate('2026-11-02'));
    expect(res2.length).toBe(1);
    expect(res2[0].date).toBe('2026-11-01');
    expect(res2[0].isFailed).toBe(false);

    const evalRecord = await testDb.day_evaluations.get(1);
    expect(evalRecord).toBeDefined();
    expect(evalRecord?.status).toBe('cleared');

    // Day 3 (2026-11-03) - Open next day
    const res3 = await runLazyEvaluation(testDb, makeDate('2026-11-03'));
    expect(res3.length).toBe(1);
    expect(res3[0].date).toBe('2026-11-02');
  });

  it('b) first open on 22 Oct, next open on 3 Nov: zero penalties and no lockout', async () => {
    // Open on 22 Oct (before plan)
    const resOct = await runLazyEvaluation(testDb, makeDate('2026-10-22'));
    expect(resOct.length).toBe(0);

    // Open on 3 Nov (Day 3 of plan)
    // First open on/after Day 1: must result in ZERO penalties and NO lockout
    const resNov = await runLazyEvaluation(testDb, makeDate('2026-11-03'));
    expect(resNov.length).toBe(0);

    // Verify zero penalties were written to xp_ledger
    const penaltyCount = await testDb.xp_ledger.where({ source: 'daily_penalty' }).count();
    expect(penaltyCount).toBe(0);

    // Lockout should NOT be triggered
    const lockout = await testDb.settings.get('emergency_lockout_active');
    expect(lockout?.value).toBeFalsy();
  });

  it('c) open on Day 1, next on Day 4: Days 1, 2, 3 are all evaluated', async () => {
    // Open Day 1
    await runLazyEvaluation(testDb, makeDate('2026-11-01'));
    await testDb.settings.put({ key: 'last_evaluated_plan_day', value: 0 });

    // Open Day 4 (2026-11-04)
    const res = await runLazyEvaluation(testDb, makeDate('2026-11-04'));
    expect(res.length).toBe(3);
    expect(res.map((r) => r.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('d) open on Day 45, then 25 Dec: only Day 45 is evaluated, nothing after', async () => {
    // Already evaluated up to Day 44
    await testDb.settings.put({ key: 'last_evaluated_plan_day', value: 44 });

    // Open on 25 Dec 2026 (Day 55 calendar-wise)
    const res = await runLazyEvaluation(testDb, makeDate('2026-12-25'));
    expect(res.length).toBe(1);
    expect(res[0].date).toBe('2026-12-15'); // Day 45

    // Verify last_evaluated_plan_day capped at 45
    const lastPlanDay = await testDb.settings.get('last_evaluated_plan_day');
    expect(lastPlanDay?.value).toBe(45);

    // Further opens after Day 45 evaluate 0 days
    const resLater = await runLazyEvaluation(testDb, makeDate('2026-12-26'));
    expect(resLater.length).toBe(0);
  });

  it('e) a 5-day gap applies one penalty per missed day and triggers lockout after 2 failures in 7 days', async () => {
    // Day 1 initialized
    await testDb.settings.put({ key: 'last_evaluated_plan_day', value: 0 });

    // 5-day gap: user opens on Day 6 (2026-11-06) without clearing quests
    const res = await runLazyEvaluation(testDb, makeDate('2026-11-06'));
    expect(res.length).toBe(5); // Days 1 to 5

    // Every missed day receives failed penalty
    expect(res.every((r) => r.isFailed)).toBe(true);

    // Emergency lockout should be triggered because >= 2 missed days occurred in the rolling 7-day window
    const lockout = await testDb.settings.get('emergency_lockout_active');
    expect(lockout?.value).toBe(true);
  });

  it('f) running evaluation twice does not double-apply anything', async () => {
    await testDb.settings.put({ key: 'last_evaluated_plan_day', value: 0 });

    const run1 = await runLazyEvaluation(testDb, makeDate('2026-11-03'));
    expect(run1.length).toBe(2);

    const xpEntriesCount1 = await testDb.xp_ledger.count();
    const evalRecordsCount1 = await testDb.day_evaluations.count();

    // Run again on the same day
    const run2 = await runLazyEvaluation(testDb, makeDate('2026-11-03'));
    expect(run2.length).toBe(0);

    const xpEntriesCount2 = await testDb.xp_ledger.count();
    const evalRecordsCount2 = await testDb.day_evaluations.count();

    expect(xpEntriesCount2).toBe(xpEntriesCount1);
    expect(evalRecordsCount2).toBe(evalRecordsCount1);
  });
});
