import type { HabitWithEntries } from '@/lib/types';
import type { Schedule } from '@/lib/schedule';
import type { EntryStatus } from '@/lib/streaks';

export interface HabitRow {
  id: string;
  name: string;
  colour: string;
  type: 'build' | 'quit';
  schedule_kind: Schedule['kind'];
  schedule_config: Record<string, unknown>;
  started_on: string;
  if_then: string | null;
  anchor: string | null;
  source: 'manual' | 'github' | 'leetcode';
  external_username: string | null;
}

export interface EntryRow {
  habit_id: string;
  day: string;
  status: EntryStatus;
}

export function toHabitWithEntries(habit: HabitRow, entries: EntryRow[]): HabitWithEntries {
  return {
    id: habit.id,
    name: habit.name,
    colour: habit.colour,
    type: habit.type,
    schedule: { kind: habit.schedule_kind, config: habit.schedule_config as Schedule['config'] },
    startedOn: habit.started_on,
    ifThen: habit.if_then ?? undefined,
    anchor: habit.anchor ?? undefined,
    source: habit.source,
    externalUsername: habit.external_username ?? undefined,
    entries: entries
      .filter((e) => e.habit_id === habit.id)
      .map((e) => ({ day: e.day, status: e.status })),
  };
}
