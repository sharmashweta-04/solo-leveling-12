import { Subject } from '@/src/types';
import syllabusData from '@/config/syllabus.json';

export interface ChapterDefinition {
  id: string; // e.g. P1, C1, B1
  subject: Subject;
  number: number;
  name: string;
  topics: string[];
}

export const CHAPTERS_DATA: ChapterDefinition[] = syllabusData.chapters as ChapterDefinition[];
