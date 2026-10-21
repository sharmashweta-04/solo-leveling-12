/**
 * Time and game-day calculations in Asia/Kolkata timezone.
 * A game day runs from 05:00:00 IST to 04:59:59 IST the next morning.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current Date adjusted to Asia/Kolkata.
 */
export function getNowInIST(dateInput: Date = new Date()): Date {
  const utc = dateInput.getTime() + dateInput.getTimezoneOffset() * 60000;
  // IST is UTC + 5:30 = 330 minutes = 19800000 ms
  const istOffsetMs = 5.5 * 3600000;
  return new Date(utc + istOffsetMs);
}

/**
 * Returns the game day string (YYYY-MM-DD) for the given Date (defaults to now).
 * If the current time in IST is before 05:00, it belongs to the previous calendar day's game day.
 */
export function currentGameDay(dateInput: Date = new Date()): string {
  const ist = getNowInIST(dateInput);
  const hours = ist.getHours();
  
  // If before 05:00, subtract 1 day
  if (hours < 5) {
    ist.setDate(ist.getDate() - 1);
  }

  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates which plan day (1 to 45) corresponds to the given game day string,
 * given the start date (defaults to 2026-11-01).
 * Returns:
 *   <= 0 if before start date
 *   1..45 if within plan
 *   > 45 if after plan
 */
export function getPlanDayNumber(gameDay: string, startDate: string = '2026-11-01'): number {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [gy, gm, gd] = gameDay.split('-').map(Number);

  const startUtc = Date.UTC(sy, sm - 1, sd);
  const gameUtc = Date.UTC(gy, gm - 1, gd);

  const diffMs = gameUtc - startUtc;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is startDate
}

/**
 * Check if the given game day is before Day 1.
 */
export function isBeforeDay1(gameDay: string, startDate: string = '2026-11-01'): boolean {
  return getPlanDayNumber(gameDay, startDate) < 1;
}

/**
 * Returns formatted countdown to 05:00 AM IST of the start date.
 */
export function getCountdownToStart(startDate: string = '2026-11-01', now: Date = new Date()): {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  // Start is 05:00 AM IST on startDate
  // 05:00 IST = 23:30 UTC previous day
  const targetUtcMs = Date.UTC(sy, sm - 1, sd, 5 - 5, 30 - 30); // 05:00 IST = 23:30 UTC previous day: Date.UTC(sy, sm - 1, sd, -0.5)
  // Let's compute precisely: 05:00:00 IST = Date.UTC(sy, sm-1, sd, 5, 0, 0) minus 5.5 hours
  const targetMs = Date.UTC(sy, sm - 1, sd, 5, 0, 0) - (5.5 * 3600000);
  const currentMs = now.getTime();
  const totalMs = Math.max(0, targetMs - currentMs);

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  return { totalMs, days, hours, minutes, seconds };
}
