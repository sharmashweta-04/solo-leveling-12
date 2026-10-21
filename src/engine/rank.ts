import gameRules from '@/config/game_rules.json';
import { Rank } from '@/src/types';

export interface RankInfo {
  rank: Rank;
  title: string;
  min_xp: number;
  multiplier: number;
  nextRank?: Rank;
  nextRankMinXp?: number;
  progressPercent: number;
}

export const RANKS = gameRules.ranks;

/**
 * Computes Hunter Rank and details based on total XP.
 */
export function computeRank(totalXP: number): RankInfo {
  const safeXp = Math.max(0, totalXP);
  
  // Find highest rank matching threshold
  let matchedIndex = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (safeXp >= RANKS[i].min_xp) {
      matchedIndex = i;
      break;
    }
  }

  const current = RANKS[matchedIndex];
  const next = matchedIndex < RANKS.length - 1 ? RANKS[matchedIndex + 1] : undefined;

  let progressPercent = 100;
  if (next) {
    const span = next.min_xp - current.min_xp;
    const progress = safeXp - current.min_xp;
    progressPercent = Math.min(100, Math.floor((progress / span) * 100));
  }

  return {
    rank: current.rank as Rank,
    title: current.title,
    min_xp: current.min_xp,
    multiplier: current.multiplier,
    nextRank: next ? (next.rank as Rank) : undefined,
    nextRankMinXp: next ? next.min_xp : undefined,
    progressPercent
  };
}
