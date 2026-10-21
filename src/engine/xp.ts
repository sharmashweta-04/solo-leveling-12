import gameRules from '@/config/game_rules.json';

/**
 * Calculates XP awarded after applying Rank multiplier and Streak multiplier.
 * Streak bonus is capped as defined in game_rules.json.
 */
export function calculateStreakMultiplier(streakDays: number): number {
  const bonusPerDay = gameRules.streak.bonus_per_day;
  const cap = gameRules.streak.cap;
  return Math.min(Math.max(0, streakDays) * bonusPerDay, cap);
}

export function awardXP(
  baseXp: number,
  rankMultiplier: number = 1.0,
  streakDays: number = 0
): number {
  if (baseXp <= 0) return baseXp; // Penalties or 0 XP do not get multiplied
  const streakBonus = calculateStreakMultiplier(streakDays);
  const totalMultiplier = rankMultiplier * (1 + streakBonus);
  return Math.round(baseXp * totalMultiplier);
}
