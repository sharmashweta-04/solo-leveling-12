import gameRules from '@/config/game_rules.json';

export const DAILY_MP_CAP = gameRules.mp.daily_cap; // 90
export const UNSPENT_MP_TO_XP_RATE = gameRules.mp.unspent_to_xp; // 5

/**
 * Awards MP considering the daily cap (90 MP).
 * @param currentEarnedToday Total MP already earned on the current game day.
 * @param amountToAward Amount of MP requested to award.
 */
export function awardMP(
  currentEarnedToday: number,
  amountToAward: number
): {
  awarded: number;
  newTotalToday: number;
  overflow: number;
} {
  if (amountToAward <= 0) {
    return { awarded: 0, newTotalToday: currentEarnedToday, overflow: 0 };
  }

  const availableHeadroom = Math.max(0, DAILY_MP_CAP - currentEarnedToday);
  const awarded = Math.min(availableHeadroom, amountToAward);
  const overflow = amountToAward - awarded;
  const newTotalToday = currentEarnedToday + awarded;

  return {
    awarded,
    newTotalToday,
    overflow
  };
}

/**
 * Converts unspent MP to XP at the game day boundary (5 XP per MP).
 */
export function convertUnspentMPToXP(unspentMP: number): {
  xpEarned: number;
  mpDeducted: number;
} {
  const safeMP = Math.max(0, unspentMP);
  const xpEarned = safeMP * UNSPENT_MP_TO_XP_RATE;
  return {
    xpEarned,
    mpDeducted: safeMP
  };
}
