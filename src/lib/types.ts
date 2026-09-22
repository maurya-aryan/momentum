import type { Schedule } from './schedule';
import type { Entry, EntryStatus } from './streaks';

export type HabitSource = 'manual' | 'github' | 'leetcode';

export interface Habit {
  id: string;
  name: string;
  colour: string;
  type: 'build' | 'quit';
  schedule: Schedule;
  startedOn: string; // ISO date
  ifThen?: string;
  anchor?: string;
  source: HabitSource;
  externalUsername?: string;
}

export interface HabitWithEntries extends Habit {
  entries: Entry[];
}

export type { Entry, EntryStatus };
