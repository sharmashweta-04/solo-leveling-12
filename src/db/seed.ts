import { db } from '@/src/db/db';
import { CHAPTERS_DATA } from '@/src/data/chapters';
import plan45Days from '@/config/plan_45days.json';
import { ChapterProgress, DayPlan } from '@/src/types';

export const PLAN_DAYS: DayPlan[] = plan45Days.days as DayPlan[];

export async function seedDatabaseIfNeeded(): Promise<boolean> {
  const chapterCount = await db.chapter_progress.count();
  if (chapterCount === 0) {
    const chaptersToInsert: ChapterProgress[] = CHAPTERS_DATA.map((ch) => ({
      id: ch.id,
      subject: ch.subject,
      name: ch.name,
      status: 'locked',
      topics_completed: [],
      total_topics: ch.topics.length,
      boss_score: undefined,
      boss_cleared: false,
      shadow_extracted: false,
      notes: '',
      updated_at: new Date().toISOString()
    }));

    await db.chapter_progress.bulkAdd(chaptersToInsert);
  }

  // Check default settings
  const introSetting = await db.settings.get('intro_completed');
  if (!introSetting) {
    await db.settings.put({ key: 'intro_completed', value: false });
  }

  const modeSetting = await db.settings.get('difficulty_mode');
  if (!modeSetting) {
    await db.settings.put({ key: 'difficulty_mode', value: 'normal' });
  }

  const startDateSetting = await db.settings.get('start_date');
  if (!startDateSetting) {
    await db.settings.put({ key: 'start_date', value: '2026-11-01' });
  }

  const restTokensSetting = await db.settings.get('rest_tokens_remaining');
  if (!restTokensSetting) {
    await db.settings.put({ key: 'rest_tokens_remaining', value: 3 });
  }

  return true;
}
