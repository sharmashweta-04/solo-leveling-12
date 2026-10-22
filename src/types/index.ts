export type Subject = 'Physics' | 'Chemistry' | 'Biology';
export type WingColor = 'blue' | 'purple' | 'green';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type GateStatus = 'locked' | 'in_progress' | 'cleared' | 'shadow';
export type DifficultyMode = 'normal' | 'easy';

export interface XPLedgerEntry {
  id?: number;
  date: string; // YYYY-MM-DD (game day)
  amount: number;
  source: 'quest' | 'streak_bonus' | 'boss_test' | 'boss_raid' | 'mp_conversion' | 'daily_penalty' | 'bypass_penalty' | 'other';
  reason: string;
  created_at: string; // ISO
}

export interface MPLedgerEntry {
  id?: number;
  date: string; // YYYY-MM-DD
  amount: number; // positive for earn, negative for spend
  source: 'quest' | 'shop_key' | 'emergency_bypass' | 'midnight_conversion' | 'other';
  description: string;
  created_at: string; // ISO
}

export interface QuestLog {
  id?: number;
  date: string; // YYYY-MM-DD
  quest_id: string; // e.g. 'study_physics', 'study_chemistry', 'study_biology', 'physical_training', 'grimoire_review', 'syllabus_tracker'
  title: string;
  subject?: Subject;
  required_blocks: number;
  completed_blocks: number;
  is_completed: boolean;
  completed_at?: string;
  xp_awarded: number;
  mp_awarded: number;
}

export interface FocusSession {
  id?: number;
  date: string; // YYYY-MM-DD
  subject: Subject;
  chapter_id: string;
  started_at: string; // ISO
  ended_at?: string; // ISO
  duration_minutes: number;
  target_minutes: number;
  completed: boolean; // >= 90% of target
  interruptions: number;
  notes?: string;
}

export interface ChapterProgress {
  id: string; // e.g. 'P1', 'C1', 'B1'
  subject: Subject;
  name: string;
  status: GateStatus;
  topics_completed: string[]; // topic titles or IDs completed
  total_topics: number;
  boss_score?: number; // out of 20
  boss_cleared: boolean;
  shadow_extracted: boolean;
  notes?: string;
  updated_at: string;
}

export interface GrimoireEntry {
  id?: number;
  subject: Subject;
  chapter_id: string;
  question: string;
  mistake: string;
  correct_approach: string;
  tag: string; // e.g. 'calculation', 'concept', 'formula', 'misread'
  created_at: string;
}

export interface SRSCard {
  id?: number;
  grimoire_id?: number;
  chapter_id: string;
  subject: Subject;
  front: string;
  back: string;
  interval_days: number;
  repetition: number;
  ease_factor: number;
  due_date: string; // YYYY-MM-DD
  last_reviewed?: string;
}

export interface MockResult {
  id?: number;
  date: string; // YYYY-MM-DD
  day_number: number;
  total_marks: number;
  attempted: number;
  correct: number;
  wrong: number;
  physics_score: number;
  chemistry_score: number;
  biology_score: number;
  time_taken_minutes: number;
  notes?: string;
  created_at: string;
}

export interface Settings {
  key: string;
  value: any;
}

export interface DayEvaluationRecord {
  day: number; // PK (1..45)
  date: string; // YYYY-MM-DD
  evaluated_at: string; // ISO
  status: 'cleared' | 'failed' | 'rest';
  is_all_clear: boolean;
  xp_delta: number;
  streak_after: number;
  summary: string;
}

export interface DayPlan {
  day: number;
  date: string;
  phase: number;
  is_raid: boolean;
  PHY: string[];
  CHEM: string[];
  BIO: string[];
  label: string;
}
