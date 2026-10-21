import gameRules from '@/config/game_rules.json';

const BASE = gameRules.level.base; // 50

/**
 * Calculates current Level from total accumulated XP.
 * level = floor(sqrt(total_xp / base)) + 1
 */
export function computeLevel(totalXP: number): number {
  if (totalXP <= 0) return 1;
  return Math.floor(Math.sqrt(totalXP / BASE)) + 1;
}

/**
 * Calculates XP threshold required to reach a specific level L.
 * XP needed for Level L = (L - 1)^2 * BASE
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * BASE;
}

/**
 * Detailed level progress statistics.
 */
export function getLevelProgress(totalXP: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
} {
  const safeXp = Math.max(0, totalXP);
  const level = computeLevel(safeXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);

  const span = nextLevelXp - currentLevelXp;
  const xpInCurrentLevel = safeXp - currentLevelXp;
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - safeXp);
  const progressPercent = span > 0 ? Math.min(100, Math.floor((xpInCurrentLevel / span) * 100)) : 100;

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent
  };
}
