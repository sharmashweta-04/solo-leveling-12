import { describe, it, expect } from 'vitest';
import { awardXP, calculateStreakMultiplier } from '../xp';
import { computeLevel, xpForLevel, getLevelProgress } from '../level';
import { awardMP, convertUnspentMPToXP, DAILY_MP_CAP } from '../mana';
import { computeRank } from '../rank';
import { generateDailyQuests } from '../quests';
import { evaluateDay } from '../evaluateDay';

describe('Solo Leveling Pure Engine Tests', () => {
  describe('XP Engine (xp.ts)', () => {
    it('applies rank multiplier and streak bonus correctly', () => {
      // Base XP 100, Rank C (1.05x), 5 days streak (5 * 0.02 = 0.10)
      // Total multiplier = 1.05 * 1.10 = 1.155 -> 116 XP
      const xp = awardXP(100, 1.05, 5);
      expect(xp).toBe(116);
    });

    it('caps streak bonus at 20%', () => {
      // 15 days streak * 0.02 = 0.30, but cap is 0.20
      const bonus = calculateStreakMultiplier(15);
      expect(bonus).toBe(0.20);
    });

    it('does not multiply negative penalties', () => {
      expect(awardXP(-150, 1.2, 10)).toBe(-150);
    });
  });

  describe('Level Engine (level.ts)', () => {
    it('computes level correctly from formula floor(sqrt(xp / 50)) + 1', () => {
      expect(computeLevel(0)).toBe(1);
      expect(computeLevel(49)).toBe(1);
      expect(computeLevel(50)).toBe(2);
      expect(computeLevel(200)).toBe(3); // sqrt(200/50) = sqrt(4) = 2 + 1 = 3
      expect(computeLevel(29000)).toBe(25); // sqrt(29000/50) = sqrt(580) = 24.08 -> 25
    });

    it('computes required XP for levels', () => {
      expect(xpForLevel(1)).toBe(0);
      expect(xpForLevel(2)).toBe(50);
      expect(xpForLevel(3)).toBe(200);
    });

    it('returns valid progress percentage between levels', () => {
      const progress = getLevelProgress(125); // Level 2 is 50..200 (span 150), 125 is 75 in -> 50%
      expect(progress.level).toBe(2);
      expect(progress.progressPercent).toBe(50);
    });
  });

  describe('Mana Engine (mana.ts)', () => {
    it('enforces 90 daily MP cap', () => {
      expect(DAILY_MP_CAP).toBe(90);

      // Current 80, award 20 -> should only award 10, overflow 10
      const res = awardMP(80, 20);
      expect(res.awarded).toBe(10);
      expect(res.newTotalToday).toBe(90);
      expect(res.overflow).toBe(10);
    });

    it('converts unspent MP to XP at 5x rate', () => {
      const conv = convertUnspentMPToXP(15);
      expect(conv.xpEarned).toBe(75);
      expect(conv.mpDeducted).toBe(15);
    });
  });

  describe('Rank Engine (rank.ts)', () => {
    it('computes correct ranks for boundary XP values', () => {
      expect(computeRank(0).rank).toBe('E');
      expect(computeRank(2500).rank).toBe('E');
      expect(computeRank(2501).rank).toBe('D');
      expect(computeRank(7000).rank).toBe('D');
      expect(computeRank(7001).rank).toBe('C');
      expect(computeRank(13000).rank).toBe('C');
      expect(computeRank(13001).rank).toBe('B');
      expect(computeRank(20000).rank).toBe('B');
      expect(computeRank(20001).rank).toBe('A');
      expect(computeRank(28000).rank).toBe('A');
      expect(computeRank(28001).rank).toBe('S');
      expect(computeRank(50000).rank).toBe('S');
    });
  });

  describe('Quests Generation (quests.ts)', () => {
    it('generates normal mode focus blocks (3 PHY, 2 CHEM, 3 BIO = 8 blocks)', () => {
      const quests = generateDailyQuests('2026-11-01', 1, 'normal');
      const phy = quests.find((q) => q.quest_id === 'focus_physics');
      const chem = quests.find((q) => q.quest_id === 'focus_chemistry');
      const bio = quests.find((q) => q.quest_id === 'focus_biology');

      expect(phy?.required_blocks).toBe(3);
      expect(chem?.required_blocks).toBe(2);
      expect(bio?.required_blocks).toBe(3);
    });

    it('generates easy mode focus blocks (2 PHY, 2 CHEM, 2 BIO = 6 blocks)', () => {
      const quests = generateDailyQuests('2026-11-01', 1, 'easy');
      const phy = quests.find((q) => q.quest_id === 'focus_physics');
      const chem = quests.find((q) => q.quest_id === 'focus_chemistry');
      const bio = quests.find((q) => q.quest_id === 'focus_biology');

      expect(phy?.required_blocks).toBe(2);
      expect(chem?.required_blocks).toBe(2);
      expect(bio?.required_blocks).toBe(2);
    });
  });

  describe('Day Evaluation (evaluateDay.ts)', () => {
    it('awards bonus on an all-clear day and increments streak', () => {
      const quests = generateDailyQuests('2026-11-01', 1, 'normal');
      quests.forEach((q) => (q.is_completed = true));

      const result = evaluateDay({
        date: '2026-11-01',
        questLogs: quests,
        unspentMP: 20,
        currentStreak: 3,
        restTokenUsed: false,
        missedDaysInLast7: 0
      });

      expect(result.isAllClear).toBe(true);
      expect(result.newStreak).toBe(4);
      // Contains all-clear bonus (60 XP) and unspent MP conversion (20 * 5 = 100 XP)
      const allClearXP = result.xpEntries.find((e) => e.source === 'streak_bonus');
      const convXP = result.xpEntries.find((e) => e.source === 'mp_conversion');
      expect(allClearXP?.amount).toBe(60);
      expect(convXP?.amount).toBe(100);
    });

    it('applies -150 penalty on failed day and resets streak', () => {
      const quests = generateDailyQuests('2026-11-01', 1, 'normal');
      // No quests completed
      const result = evaluateDay({
        date: '2026-11-01',
        questLogs: quests,
        unspentMP: 0,
        currentStreak: 5,
        restTokenUsed: false,
        missedDaysInLast7: 0
      });

      expect(result.isFailed).toBe(true);
      expect(result.newStreak).toBe(0);
      const penalty = result.xpEntries.find((e) => e.source === 'daily_penalty');
      expect(penalty?.amount).toBe(-150);
    });

    it('preserves streak and skips penalty when rest token is used', () => {
      const quests = generateDailyQuests('2026-11-01', 1, 'normal');
      const result = evaluateDay({
        date: '2026-11-01',
        questLogs: quests,
        unspentMP: 10,
        currentStreak: 7,
        restTokenUsed: true,
        missedDaysInLast7: 0
      });

      expect(result.isRest).toBe(true);
      expect(result.newStreak).toBe(7); // Preserved
      expect(result.restTokensDelta).toBe(-1);
      expect(result.xpEntries.some((e) => e.source === 'daily_penalty')).toBe(false);
    });

    it('triggers emergency lockout if 2 missed days occur in 7', () => {
      const quests = generateDailyQuests('2026-11-01', 1, 'normal');
      const result = evaluateDay({
        date: '2026-11-01',
        questLogs: quests,
        unspentMP: 0,
        currentStreak: 0,
        restTokenUsed: false,
        missedDaysInLast7: 1 // Already missed 1, this makes 2
      });

      expect(result.isFailed).toBe(true);
      expect(result.emergencyLockoutTriggered).toBe(true);
    });
  });
});
