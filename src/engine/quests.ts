import gameRules from '@/config/game_rules.json';
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
 */
export function generateDailyQuests(
  date: string,
  dayNumber: number,
  mode: DifficultyMode = 'normal'
): QuestLog[] {
  const modeConfig = gameRules.modes[mode];
  const qRules = gameRules.quests;
  const workout = getWorkoutForDay(dayNumber);

  const templates: QuestTemplate[] = [
    // Focus Study Blocks: Physics
    {
      quest_id: 'focus_physics',
      title: `Study Blocks: Physics (${modeConfig.focus_blocks.PHY} blocks)`,
      subject: 'Physics',
      required_blocks: modeConfig.focus_blocks.PHY,
      xp_awarded: qRules.focus_block.xp * modeConfig.focus_blocks.PHY,
      mp_awarded: qRules.focus_block.mp * modeConfig.focus_blocks.PHY,
      is_mandatory: true
    },
    // Focus Study Blocks: Chemistry
    {
      quest_id: 'focus_chemistry',
      title: `Study Blocks: Chemistry (${modeConfig.focus_blocks.CHEM} blocks)`,
      subject: 'Chemistry',
      required_blocks: modeConfig.focus_blocks.CHEM,
      xp_awarded: qRules.focus_block.xp * modeConfig.focus_blocks.CHEM,
      mp_awarded: qRules.focus_block.mp * modeConfig.focus_blocks.CHEM,
      is_mandatory: true
    },
    // Focus Study Blocks: Biology
    {
      quest_id: 'focus_biology',
      title: `Study Blocks: Biology (${modeConfig.focus_blocks.BIO} blocks)`,
      subject: 'Biology',
      required_blocks: modeConfig.focus_blocks.BIO,
      xp_awarded: qRules.focus_block.xp * modeConfig.focus_blocks.BIO,
      mp_awarded: qRules.focus_block.mp * modeConfig.focus_blocks.BIO,
      is_mandatory: true
    },
    // Battle Exercises (DPP / Practice)
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
    },
    // Grimoire (Error Notebook) Review
    {
      quest_id: 'grimoire_review',
      title: 'Grimoire Review (Spaced Repetition)',
      required_blocks: 1,
      xp_awarded: qRules.grimoire_review.xp,
      mp_awarded: qRules.grimoire_review.mp,
      is_mandatory: false
    },
    // Physical Training (reads from workouts.json)
    {
      quest_id: 'physical_quest',
      title: `Physical Routine: ${workout.name} (${workout.type.toUpperCase()})`,
      required_blocks: 1,
      xp_awarded: qRules.physical.xp,
      mp_awarded: qRules.physical.mp,
      description: workout.items.join(', '),
      is_mandatory: true
    },
    // Night Review
    {
      quest_id: 'night_review',
      title: 'Nightly Reflection & Recap',
      required_blocks: 1,
      xp_awarded: qRules.night_review.xp,
      mp_awarded: qRules.night_review.mp,
      is_mandatory: false
    }
  ];

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
