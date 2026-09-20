export type ScheduleKind = 'daily' | 'days_of_week' | 'x_per_week' | 'every_n_days';

export interface DaysOfWeekConfig {
  days: number[]; // 0 = Sunday ... 6 = Saturday
}

export interface XPerWeekConfig {
  n: number; // target count per calendar week, any days
}

export interface EveryNDaysConfig {
  n: number; // due every N days starting from the habit's started_on
}

export type ScheduleConfig = DaysOfWeekConfig | XPerWeekConfig | EveryNDaysConfig | Record<string, never>;

export interface Schedule {
  kind: ScheduleKind;
  config: ScheduleConfig;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / msPerDay);
}

/**
 * Whether a habit is "due" on a given calendar day. For x_per_week habits,
 * every day is nominally due — the target is evaluated over the week window
 * instead (see isXPerWeekSatisfied), so this returns true for those.
 */
export function isDueOn(schedule: Schedule, day: Date, startedOn: Date): boolean {
  if (day < startOfDay(startedOn)) return false;

  switch (schedule.kind) {
    case 'daily':
      return true;
    case 'days_of_week': {
      const cfg = schedule.config as DaysOfWeekConfig;
      return cfg.days.includes(day.getDay());
    }
    case 'x_per_week':
      return true;
    case 'every_n_days': {
      const cfg = schedule.config as EveryNDaysConfig;
      const diff = daysBetween(startedOn, day);
      return diff >= 0 && diff % cfg.n === 0;
    }
    default:
      return true;
  }
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
}
