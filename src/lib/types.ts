import type { Schedule } from './schedule';
import type { Entry, EntryStatus } from './streaks';

export interface Habit {
  id: string;
  name: string;
  colour: string;
  type: 'build' | 'quit';
  schedule: Schedule;
  startedOn: string; // ISO date
  ifThen?: string;
  anchor?: string;
}

export interface HabitWithEntries extends Habit {
  entries: Entry[];
}

export type { Entry, EntryStatus };
