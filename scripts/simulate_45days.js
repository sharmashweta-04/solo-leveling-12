const fs = require('fs');
const path = require('path');

const gameRules = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/game_rules.json'), 'utf8'));
const plan45Days = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/plan_45days.json'), 'utf8'));

// Engine functions implemented purely in script
function getStreakMultiplier(streak) {
  return Math.min(Math.max(0, streak) * gameRules.streak.bonus_per_day, gameRules.streak.cap);
}

function computeRank(xp) {
  let matched = gameRules.ranks[0];
  for (let i = gameRules.ranks.length - 1; i >= 0; i--) {
    if (xp >= gameRules.ranks[i].min_xp) {
      matched = gameRules.ranks[i];
      break;
    }
  }
  return matched;
}

function computeLevel(xp) {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / gameRules.level.base)) + 1;
}

function awardXP(base, rankMult, streak) {
  if (base <= 0) return base;
  const streakMult = getStreakMultiplier(streak);
  return Math.round(base * rankMult * (1 + streakMult));
}

function simulatePlayer(name, strategy) {
  let totalXP = 0;
  let totalMP = 0;
  let streak = 0;
  let restTokens = gameRules.rest_tokens;
  let sRankDay = null;
  let penaltiesCount = 0;

  const history = [];

  for (let day = 1; day <= 45; day++) {
    const isRaidDay = [7, 14, 21, 28, 35, 42].includes(day);
    const rankInfo = computeRank(totalXP);

    let dayXP = 0;
    let dayMP = 0;

    if (strategy === 'perfect') {
      // 1. All mandatory focus blocks (Normal mode: 8 blocks)
      const blocksCount = 8;
      const blockXp = awardXP(gameRules.quests.focus_block.xp * blocksCount, rankInfo.multiplier, streak);
      dayXP += blockXp;
      dayMP += Math.min(gameRules.mp.daily_cap, gameRules.quests.focus_block.mp * blocksCount);

      // 2. Battle exercises (3 subjects = 3 * 40 = 120 XP)
      dayXP += awardXP(gameRules.quests.battle_exercise_per_subject.xp * 3, rankInfo.multiplier, streak);
      dayMP += gameRules.quests.battle_exercise_per_subject.mp * 3;

      // 3. Physical quest (80 XP)
      dayXP += awardXP(gameRules.quests.physical.xp, rankInfo.multiplier, streak);
      dayMP += gameRules.quests.physical.mp;

      // 4. Grimoire review (30 XP) + Night review (40 XP) + Sleep 7h (20 XP)
      dayXP += awardXP(gameRules.quests.grimoire_review.xp + gameRules.quests.night_review.xp + gameRules.quests.sleep_7h.xp, rankInfo.multiplier, streak);
      dayMP += gameRules.quests.grimoire_review.mp + gameRules.quests.night_review.mp;

      // 5. All Clear Daily Bonus (60 XP + 10 MP)
      dayXP += awardXP(gameRules.quests.all_clear_bonus.xp, rankInfo.multiplier, streak);
      dayMP += gameRules.quests.all_clear_bonus.mp;

      // 6. Boss Gate cleared almost every non-raid day (37 gates over ~38 days)
      if (!isRaidDay && day <= 38) {
        dayXP += awardXP(150, rankInfo.multiplier, streak);
      }

      // 7. Boss Raid Cleared on Raid days (+500 XP)
      if (isRaidDay) {
        dayXP += awardXP(gameRules.raid_bonus_xp, rankInfo.multiplier, streak);
      }

      // Midnight MP conversion (convert unspent MP to XP at 5x rate)
      const unspentMP = Math.min(gameRules.mp.daily_cap, dayMP);
      const convertedXP = unspentMP * gameRules.mp.unspent_to_xp;
      dayXP += convertedXP;

      streak++;
    } else if (strategy === 'average') {
      const willSucceed = Math.random() < 0.85 || day % 4 !== 0;

      if (willSucceed) {
        // ~5 focus blocks
        const blocksCount = 5;
        dayXP += awardXP(gameRules.quests.focus_block.xp * blocksCount, rankInfo.multiplier, streak);
        dayMP += gameRules.quests.focus_block.mp * blocksCount;
        dayXP += awardXP(gameRules.quests.physical.xp, rankInfo.multiplier, streak);
        dayXP += awardXP(gameRules.quests.sleep_7h.xp, rankInfo.multiplier, streak);

        // Clear gate every other day
        if (day % 2 === 0 && day <= 30) {
          dayXP += awardXP(150, rankInfo.multiplier, streak);
        }

        if (isRaidDay && Math.random() < 0.75) {
          dayXP += awardXP(gameRules.raid_bonus_xp, rankInfo.multiplier, streak);
        }

        // Half MP converted
        dayXP += Math.floor(dayMP * 0.5) * gameRules.mp.unspent_to_xp;
        streak++;
      } else {
        // Use rest token if available
        if (restTokens > 0) {
          restTokens--;
          // Streak maintained, no penalty
        } else {
          // Penalty
          dayXP += gameRules.penalties.failed_daily_quest_xp; // -150
          streak = 0;
          penaltiesCount++;
        }
      }
    } else if (strategy === 'slacker') {
      const willStudy = day % 3 === 0;

      if (willStudy) {
        dayXP += awardXP(gameRules.quests.focus_block.xp * 3, rankInfo.multiplier, streak);
        dayMP += gameRules.quests.focus_block.mp * 3;
        streak++;
      } else {
        dayXP += gameRules.penalties.failed_daily_quest_xp; // -150
        streak = 0;
        penaltiesCount++;
      }
    }

    totalXP = Math.max(0, totalXP + dayXP);

    const sRankThreshold = gameRules.ranks.find(r => r.rank === 'S').min_xp;
    if (totalXP >= sRankThreshold && sRankDay === null) {
      sRankDay = day;
    }

    history.push({
      day,
      totalXP,
      level: computeLevel(totalXP),
      rank: computeRank(totalXP).rank
    });
  }

  const finalRank = computeRank(totalXP);
  const finalLevel = computeLevel(totalXP);

  return {
    name,
    totalXP,
    finalLevel,
    finalRank: finalRank.rank,
    rankTitle: finalRank.title,
    sRankDay,
    penaltiesCount,
    history
  };
}

console.log('===============================================================');
console.log('SOLO LEVELING: 45-DAY CAMPAIGN SIMULATION (3 PLAYERS)');
console.log('===============================================================');

const perfect = simulatePlayer('Perfect Hunter (Jin-Woo)', 'perfect');
const average = simulatePlayer('Average Hunter (Aspirant)', 'average');
const slacker = simulatePlayer('Slacker Hunter (Procrastinator)', 'slacker');

[perfect, average, slacker].forEach((p) => {
  console.log(`\nPlayer: ${p.name}`);
  console.log(`  Final Total XP: ${p.totalXP.toLocaleString()} XP`);
  console.log(`  Final Level:    Level ${p.finalLevel}`);
  console.log(`  Final Rank:     ${p.finalRank}-Rank (${p.rankTitle})`);
  console.log(`  S-Rank Reached: ${p.sRankDay ? `Day ${p.sRankDay}` : 'Did not reach S-Rank'}`);
  console.log(`  Penalties:      ${p.penaltiesCount} failed days`);
});

console.log('\nDay 39-44 XP Progression for Perfect Hunter:');
perfect.history.slice(38, 44).forEach(h => console.log(`  Day ${h.day}: ${h.totalXP.toLocaleString()} XP`));

console.log('\n---------------------------------------------------------------');
console.log(`Verification: Perfect Hunter reached S-Rank on: Day ${perfect.sRankDay}`);
const sRankTargetMet = perfect.sRankDay >= 40 && perfect.sRankDay <= 43;
console.log(`Target Window: Day 40 to 43 -> ${sRankTargetMet ? 'PASSED (Target Met!)' : `Current: Day ${perfect.sRankDay}`}`);
console.log('===============================================================');
