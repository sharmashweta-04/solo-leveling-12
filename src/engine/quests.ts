import gameRules from '@/config/game_rules.json';
import planConfig from '@/config/plan_45days.json';
import workoutsConfig from '@/config/workouts.json';
import { DifficultyMode, QuestLog, Subject } from '@/src/types';

export interface QuestTemplate {
  quest_id: string;
  title: string;
  subject?: Subject;
  required_blocks: number;
  xp_awarded: number;
  mp_awarded: number;
  description?: string;
  exercise_items?: string[];
  is_mandatory: boolean;
}

/**
 * Determines whether a given day is a physical training or recovery day.
 * Days 4, 7 (Raid), 11, 14 (Raid), 18, 21 (Raid), 25, 28 (Raid), 32, 35 (Raid), 39, 42 (Raid) are recovery.
 */
export function getWorkoutForDay(dayNumber: number): {
  type: 'training' | 'recovery';
  name: string;
  items: string[];
} {
  const isRecovery = dayNumber % 7 === 0 || dayNumber % 7 === 4;
  const routine = isRecovery ? workoutsConfig.recovery[0] : workoutsConfig.training[0];
  return {
    type: isRecovery ? 'recovery' : 'training',
    name: routine.name,
    items: routine.items
  };
}

/**
 * Generates the full quest list for a given game date and day number.
 * Uses plan_45days.json day_type and game_rules.json day_types configuration.
 */
export function generateDailyQuests(
  date: string,
  dayNumber: number,
  mode: DifficultyMode = 'normal'
): QuestLog[] {
  const qRules = gameRules.quests;
  const workout = getWorkoutForDay(dayNumber);

  // Look up plan day_type
  const planDay = planConfig.days.find((d) => d.day === dayNumber);
  const dayType = (planDay?.day_type || 'learn') as keyof typeof gameRules.day_types;
  const dayTypeConfig = gameRules.day_types[dayType] || gameRules.day_types.learn;
  const focusBlocksConfig = (dayTypeConfig as any)[mode] || { PHY: 3, CHEM: 2, BIO: 3 };

  const templates: QuestTemplate[] = [];

  // Focus Study Blocks: Physics
  if (focusBlocksConfig.PHY > 0) {
    templates.push({
      quest_id: 'focus_physics',
      title: `Study Blocks: Physics (${focusBlocksConfig.PHY} blocks)`,
      subject: 'Physics',
      required_blocks: focusBlocksConfig.PHY,
      xp_awarded: qRules.focus_block.xp * focusBlocksConfig.PHY,
      mp_awarded: qRules.focus_block.mp * focusBlocksConfig.PHY,
      is_mandatory: true
    });
  }

  // Focus Study Blocks: Chemistry
  if (focusBlocksConfig.CHEM > 0) {
    templates.push({
      quest_id: 'focus_chemistry',
      title: `Study Blocks: Chemistry (${focusBlocksConfig.CHEM} blocks)`,
      subject: 'Chemistry',
      required_blocks: focusBlocksConfig.CHEM,
      xp_awarded: qRules.focus_block.xp * focusBlocksConfig.CHEM,
      mp_awarded: qRules.focus_block.mp * focusBlocksConfig.CHEM,
      is_mandatory: true
    });
  }

  // Focus Study Blocks: Biology
  if (focusBlocksConfig.BIO > 0) {
    templates.push({
      quest_id: 'focus_biology',
      title: `Study Blocks: Biology (${focusBlocksConfig.BIO} blocks)`,
      subject: 'Biology',
      required_blocks: focusBlocksConfig.BIO,
      xp_awarded: qRules.focus_block.xp * focusBlocksConfig.BIO,
      mp_awarded: qRules.focus_block.mp * focusBlocksConfig.BIO,
      is_mandatory: true
    });
  }

  // Battle Exercises (if enabled for this day_type)
  if (dayTypeConfig.battle_exercise) {
    templates.push(
      {
        quest_id: 'battle_physics',
        title: 'Battle Exercise: Physics DPP',
        subject: 'Physics',
        required_blocks: 1,
        xp_awarded: qRules.battle_exercise_per_subject.xp,
        mp_awarded: qRules.battle_exercise_per_subject.mp,
        is_mandatory: false
      },
      {
        quest_id: 'battle_chemistry',
        title: 'Battle Exercise: Chemistry DPP',
        subject: 'Chemistry',
        required_blocks: 1,
        xp_awarded: qRules.battle_exercise_per_subject.xp,
        mp_awarded: qRules.battle_exercise_per_subject.mp,
        is_mandatory: false
      },
      {
        quest_id: 'battle_biology',
        title: 'Battle Exercise: Biology DPP',
        subject: 'Biology',
        required_blocks: 1,
        xp_awarded: qRules.battle_exercise_per_subject.xp,
        mp_awarded: qRules.battle_exercise_per_subject.mp,
        is_mandatory: false
      }
    );
  } else if ('raid_minutes' in dayTypeConfig) {
    // Raid or mock day: include Boss Raid quest
    templates.push({
      quest_id: 'boss_raid',
      title: `Boss Raid: Mock Exam (${(dayTypeConfig as any).raid_minutes}m)`,
      required_blocks: 1,
      xp_awarded: gameRules.raid_bonus_xp || 500,
      mp_awarded: 10,
      is_mandatory: false
    });
  }

  // Grimoire (Error Notebook) Review
  templates.push({
    quest_id: 'grimoire_review',
    title: 'Grimoire Review (Spaced Repetition)',
    required_blocks: 1,
    xp_awarded: qRules.grimoire_review.xp,
    mp_awarded: qRules.grimoire_review.mp,
    is_mandatory: false
  });

  // Physical Training (reads from workouts.json)
  templates.push({
    quest_id: 'physical_quest',
    title: `Physical Routine: ${workout.name} (${workout.type.toUpperCase()})`,
    required_blocks: 1,
    xp_awarded: qRules.physical.xp,
    mp_awarded: qRules.physical.mp,
    description: workout.items.join(', '),
    is_mandatory: true
  });

  // Night Review
  templates.push({
    quest_id: 'night_review',
    title: 'Nightly Reflection & Recap',
    required_blocks: 1,
    xp_awarded: qRules.night_review.xp,
    mp_awarded: qRules.night_review.mp,
    is_mandatory: false
  });

  return templates.map((t) => ({
    date,
    quest_id: t.quest_id,
    title: t.title,
    subject: t.subject,
    required_blocks: t.required_blocks,
    completed_blocks: 0,
    is_completed: false,
    xp_awarded: t.xp_awarded,
    mp_awarded: t.mp_awarded
  }));
}
