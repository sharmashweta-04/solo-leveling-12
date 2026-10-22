import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { SoloLevelingDatabase } from '@/src/db/db';
import { runLazyEvaluation } from '../lazyEvaluation';
import { generateDailyQuests } from '../quests';
import { awardXP } from '../xp';
import { awardMP } from '../mana';
import { computeRank } from '../rank';
import { computeLevel } from '../level';
import gameRules from '@/config/game_rules.json';

interface SimResult {
  player: string;
  finalXP: number;
  finalLevel: number;
  finalRank: string;
  finalStreak: number;
  penaltiesCount: number;
  sRankDay: number | null;
}

async function simulatePlayer(
  name: string,
  strategy: 'perfect' | 'average' | 'slacker'
): Promise<SimResult> {
  const dbName = `sim_db_${strategy}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const db = new SoloLevelingDatabase(dbName);
  await db.open();

  // Initialize settings
  await db.settings.bulkAdd([
    { key: 'start_date', value: '2026-11-01' },
    { key: 'difficulty_mode', value: 'normal' },
    { key: 'current_streak', value: 0 },
    { key: 'rest_tokens_remaining', value: 3 },
    { key: 'last_evaluated_plan_day', value: 0 },
    { key: 'emergency_lockout_active', value: false }
  ]);

  let sRankDay: number | null = null;
  let penaltiesCount = 0;

  for (let day = 1; day <= 45; day++) {
    // Current day date (2026-11-01 + day - 1)
    const m = day <= 30 ? '11' : '12';
    const dNum = day <= 30 ? day : day - 30;
    const dateStr = `2026-${m}-${String(dNum).padStart(2, '0')}`;
    const nowIso = `${dateStr}T18:00:00.000Z`;

    // 1. Get current hunter status
    const allXpEntries = await db.xp_ledger.toArray();
    const currentTotalXP = allXpEntries.reduce((sum, e) => sum + e.amount, 0);
    const currentRank = computeRank(currentTotalXP);

    if (currentRank.rank === 'S' && sRankDay === null) {
      sRankDay = day;
    }

    const currentMpEntries = await db.mp_ledger.toArray();
    let currentMP = Math.max(0, currentMpEntries.reduce((sum, e) => sum + e.amount, 0));

    // Get current streak from evaluations or 0
    const lastEval = await db.day_evaluations.orderBy('day').last();
    const streak = lastEval ? lastEval.streak_after : 0;

    // 2. Generate daily quests
    const quests = generateDailyQuests(dateStr, day, 'normal');
    await db.quest_logs.bulkAdd(quests);

    const isRaidDay = [7, 14, 21, 28, 35, 42].includes(day);

    if (strategy === 'perfect') {
      // Perfect Player: Completes 100% of daily quests
      for (const q of quests) {
        const xpEarned = awardXP(q.xp_awarded, currentRank.multiplier, streak);
        const mpRes = awardMP(currentMP, q.mp_awarded);
        currentMP += mpRes.awarded;

        await db.xp_ledger.add({
          date: dateStr,
          amount: xpEarned,
          source: 'quest',
          reason: `Completed ${q.title}`,
          created_at: nowIso
        });

        if (mpRes.awarded > 0) {
          await db.mp_ledger.add({
            date: dateStr,
            amount: mpRes.awarded,
            source: 'quest',
            description: `MP for ${q.title}`,
            created_at: nowIso
          });
        }

        await db.quest_logs.where({ date: dateStr, quest_id: q.quest_id }).modify({
          is_completed: true,
          completed_blocks: q.required_blocks,
          completed_at: nowIso
        });
      }

      // Boss Raid mock score on raid days (+500 XP base)
      if (isRaidDay) {
        const raidXp = awardXP(gameRules.raid_bonus_xp, currentRank.multiplier, streak);
        await db.xp_ledger.add({
          date: dateStr,
          amount: raidXp,
          source: 'boss_raid',
          reason: `Cleared Boss Raid Mock on Day ${day}`,
          created_at: nowIso
        });
      } else {
        // Daily DPP / chapter gate boss clear (+150 XP base)
        const bossXp = awardXP(150, currentRank.multiplier, streak);
        await db.xp_ledger.add({
          date: dateStr,
          amount: bossXp,
          source: 'gate_boss',
          reason: `Cleared Gate Boss on Day ${day}`,
          created_at: nowIso
        });
      }

      // Sleep >= 7h (+20 XP)
      const sleepXp = awardXP(gameRules.quests.sleep_7h.xp, currentRank.multiplier, streak);
      await db.xp_ledger.add({
        date: dateStr,
        amount: sleepXp,
        source: 'quest',
        reason: 'Restored HP: 7+ hours sleep',
        created_at: nowIso
      });

      // Award immediate All-Clear bonus
      const allClearXP = awardXP(gameRules.quests.all_clear_bonus.xp, currentRank.multiplier, streak);
      await db.xp_ledger.add({
        date: dateStr,
        amount: allClearXP,
        source: 'streak_bonus',
        reason: 'Daily All-Clear Bonus',
        created_at: nowIso
      });

      const allClearMP = gameRules.quests.all_clear_bonus.mp;
      if (allClearMP > 0) {
        await db.mp_ledger.add({
          date: dateStr,
          amount: allClearMP,
          source: 'quest',
          description: 'Daily All-Clear MP Bonus',
          created_at: nowIso
        });
      }
    } else if (strategy === 'average') {
      // Average Player: Clears ~85% of days, uses 2 rest tokens, misses a few days
      const isRestDay = day === 15 || day === 30;
      const isFailedDay = day === 10 || day === 23 || day === 37;

      if (isRestDay) {
        // Activate rest token
        await db.settings.put({ key: `rest_day_${dateStr}`, value: true });
      } else if (!isFailedDay) {
        // Clears focus blocks + physical + night review (fulfills cleared_requires)
        const focusQuests = quests.filter((q) => q.quest_id.startsWith('focus_'));
        for (const q of focusQuests) {
          const xpEarned = awardXP(q.xp_awarded, currentRank.multiplier, streak);
          const mpRes = awardMP(currentMP, q.mp_awarded);
          currentMP += mpRes.awarded;

          await db.xp_ledger.add({
            date: dateStr,
            amount: xpEarned,
            source: 'quest',
            reason: `Completed ${q.title}`,
            created_at: nowIso
          });
          if (mpRes.awarded > 0) {
            await db.mp_ledger.add({
              date: dateStr,
              amount: mpRes.awarded,
              source: 'quest',
              description: `MP for ${q.title}`,
              created_at: nowIso
            });
          }
          await db.quest_logs.where({ date: dateStr, quest_id: q.quest_id }).modify({
            is_completed: true,
            completed_blocks: q.required_blocks,
            completed_at: nowIso
          });
        }

        // Physical
        const phyQ = quests.find((q) => q.quest_id === 'physical_quest');
        if (phyQ) {
          const xpEarned = awardXP(phyQ.xp_awarded, currentRank.multiplier, streak);
          await db.xp_ledger.add({
            date: dateStr,
            amount: xpEarned,
            source: 'quest',
            reason: phyQ.title,
            created_at: nowIso
          });
          await db.quest_logs.where({ date: dateStr, quest_id: phyQ.quest_id }).modify({
            is_completed: true,
            completed_blocks: 1,
            completed_at: nowIso
          });
        }

        // Night review
        const nightQ = quests.find((q) => q.quest_id === 'night_review');
        if (nightQ) {
          const xpEarned = awardXP(nightQ.xp_awarded, currentRank.multiplier, streak);
          await db.xp_ledger.add({
            date: dateStr,
            amount: xpEarned,
            source: 'quest',
            reason: nightQ.title,
            created_at: nowIso
          });
          await db.quest_logs.where({ date: dateStr, quest_id: nightQ.quest_id }).modify({
            is_completed: true,
            completed_blocks: 1,
            completed_at: nowIso
          });
        }

        if (isRaidDay) {
          const raidXp = awardXP(gameRules.raid_bonus_xp, currentRank.multiplier, streak);
          await db.xp_ledger.add({
            date: dateStr,
            amount: raidXp,
            source: 'boss_raid',
            reason: 'Cleared Raid Mock',
            created_at: nowIso
          });
        }
      } else {
        // Failed day: player did not complete required focus/physical
        penaltiesCount++;
      }
    } else {
      // Slacker Player: misses 3 out of every 4 days, triggers penalties and lockouts
      const studiesToday = day % 4 === 1;
      if (studiesToday) {
        const firstFocus = quests.find((q) => q.quest_id.startsWith('focus_'));
        if (firstFocus) {
          const xpEarned = awardXP(firstFocus.xp_awarded, currentRank.multiplier, streak);
          await db.xp_ledger.add({
            date: dateStr,
            amount: xpEarned,
            source: 'quest',
            reason: firstFocus.title,
            created_at: nowIso
          });
          await db.quest_logs.where({ date: dateStr, quest_id: firstFocus.quest_id }).modify({
            is_completed: true,
            completed_blocks: firstFocus.required_blocks,
            completed_at: nowIso
          });
        }
      } else {
        penaltiesCount++;
      }
    }

    // Run lazy evaluation for this day when next day begins at 12:00 IST
    const nextDayNum = day + 1;
    const nextM = nextDayNum <= 30 ? '11' : '12';
    const nextDNum = nextDayNum <= 30 ? nextDayNum : nextDayNum - 30;
    const nextDateStr = `2026-${nextM}-${String(nextDNum).padStart(2, '0')}`;
    const nextDateObj = new Date(`${nextDateStr}T12:00:00+05:30`);

    await runLazyEvaluation(db, nextDateObj);
  }

  // Final stats
  const finalXpLedger = await db.xp_ledger.toArray();
  const finalXP = finalXpLedger.reduce((sum, e) => sum + e.amount, 0);
  const finalRank = computeRank(finalXP).rank;
  const finalLevel = computeLevel(finalXP);
  const lastEval = await db.day_evaluations.orderBy('day').last();
  const finalStreak = lastEval ? lastEval.streak_after : 0;
  const actualPenalties = finalXpLedger.filter((e) => e.source === 'daily_penalty').length;

  if (finalRank === 'S' && sRankDay === null) {
    sRankDay = 45;
  }

  await db.close();

  return {
    player: name,
    finalXP,
    finalLevel,
    finalRank,
    finalStreak,
    penaltiesCount: actualPenalties,
    sRankDay
  };
}

describe('45-Day Engine Simulation (Three Archetypes)', () => {
  it('runs the 45-day simulation and validates Perfect, Average, Slacker outcomes', async () => {
    const perfect = await simulatePlayer('Perfect Hunter (Sung Jin-Woo)', 'perfect');
    const average = await simulatePlayer('Average Hunter (B-Rank Aspirant)', 'average');
    const slacker = await simulatePlayer('Slacker Hunter (E-Rank Slacker)', 'slacker');

    console.log('\n======================================================');
    console.log('       SOLO LEVELING 45-DAY ENGINE SIMULATION        ');
    console.log('======================================================');
    console.log(`[PERFECT HUNTER]`);
    console.log(`  Final XP:       ${perfect.finalXP}`);
    console.log(`  Final Level:    Lv. ${perfect.finalLevel}`);
    console.log(`  Final Rank:     Rank ${perfect.finalRank}`);
    console.log(`  Final Streak:   ${perfect.finalStreak} Days`);
    console.log(`  Penalties:      ${perfect.penaltiesCount}`);
    console.log(`  S-Rank Day:     Day ${perfect.sRankDay}`);
    console.log('------------------------------------------------------');
    console.log(`[AVERAGE HUNTER]`);
    console.log(`  Final XP:       ${average.finalXP}`);
    console.log(`  Final Level:    Lv. ${average.finalLevel}`);
    console.log(`  Final Rank:     Rank ${average.finalRank}`);
    console.log(`  Final Streak:   ${average.finalStreak} Days`);
    console.log(`  Penalties:      ${average.penaltiesCount}`);
    console.log('------------------------------------------------------');
    console.log(`[SLACKER HUNTER]`);
    console.log(`  Final XP:       ${slacker.finalXP}`);
    console.log(`  Final Level:    Lv. ${slacker.finalLevel}`);
    console.log(`  Final Rank:     Rank ${slacker.finalRank}`);
    console.log(`  Final Streak:   ${slacker.finalStreak} Days`);
    console.log(`  Penalties:      ${slacker.penaltiesCount}`);
    console.log('======================================================\n');

    // Assertions
    // 1. Perfect Hunter reaches S-Rank around Day 40-43 (S-Rank threshold: 65,001)
    expect(perfect.finalRank).toBe('S');
    expect(perfect.penaltiesCount).toBe(0);
    expect(perfect.sRankDay).toBeGreaterThanOrEqual(40);
    expect(perfect.sRankDay).toBeLessThanOrEqual(43);

    // 2. Average Hunter reaches B or A rank with a few penalties
    expect(['B', 'A']).toContain(average.finalRank);
    expect(average.finalXP).toBeGreaterThan(25000);

    // 3. Slacker Hunter ends at E or D rank with heavy penalties
    expect(['E', 'D']).toContain(slacker.finalRank);
    expect(slacker.penaltiesCount).toBeGreaterThan(10);
  }, 60000);
});
