import { isDueOn, startOfDay, startOfWeek, type Schedule, type XPerWeekConfig } from './schedule';

export type EntryStatus = 'done' | 'skip' | 'miss' | 'partial';

export interface Entry {
  day: string; // ISO date, 'yyyy-MM-dd'
  status: EntryStatus;
}

export interface StreakResult {
  current: number;
  longest: number;
}

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** A day counts toward the streak if it was logged done/partial, is a freeze, or isn't due. */
function dayCounts(
  day: Date,
  entryByDay: Map<string, EntryStatus>,
  freezeDays: Set<string>,
  schedule: Schedule,
  startedOn: Date,
): boolean {
  const iso = toISO(day);
  const status = entryByDay.get(iso);

  if (status === 'done' || status === 'partial') return true;
  if (status === 'skip') return true;
  if (freezeDays.has(iso)) return true;
  if (!isDueOn(schedule, day, startedOn)) return true;

  return false;
}

function isXPerWeekWeekSatisfied(
  weekStart: Date,
  entryByDay: Map<string, EntryStatus>,
  freezeDays: Set<string>,
  target: number,
  today: Date,
): boolean {
  let count = 0;
  const cursor = new Date(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const effectiveEnd = weekEnd < today ? weekEnd : today;

  while (cursor <= effectiveEnd) {
    const iso = toISO(cursor);
    const status = entryByDay.get(iso);
    if (status === 'done' || status === 'partial') count++;
    if (freezeDays.has(iso)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count >= target;
}

/**
 * Schedule-aware streak calculation. A day that isn't due, was explicitly
 * skipped, or is covered by a streak freeze does not break the streak.
 * For x_per_week habits, streak is measured in consecutive satisfied weeks.
 */
export function calculateStreak(
  entries: Entry[],
  schedule: Schedule,
  startedOnISO: string,
  freezes: string[] = [],
  todayISO: string = toISO(new Date()),
): StreakResult {
  const startedOn = startOfDay(toDate(startedOnISO));
  const today = startOfDay(toDate(todayISO));
  const entryByDay = new Map<string, EntryStatus>(entries.map((e) => [e.day, e.status]));
  const freezeDays = new Set(freezes);

  if (schedule.kind === 'x_per_week') {
    const target = (schedule.config as XPerWeekConfig).n ?? 1;
    let current = 0;
    let longest = 0;
    let running = 0;
    let cursor = startOfWeek(startedOn);
    const lastWeek = startOfWeek(today);

    // Track from the first week up to the current week to compute longest,
    // and walk backward from the current week for the "current" streak.
    const weeks: Date[] = [];
    while (cursor <= lastWeek) {
      weeks.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }

    for (const week of weeks) {
      const satisfied = isXPerWeekWeekSatisfied(week, entryByDay, freezeDays, target, today);
      const isCurrentWeek = week.getTime() === lastWeek.getTime();
      if (satisfied || isCurrentWeek) {
        // current (incomplete) week doesn't break the streak yet, but only
        // counts once satisfied
        if (satisfied) {
          running++;
          longest = Math.max(longest, running);
        } else if (!isCurrentWeek) {
          running = 0;
        }
      } else {
        running = 0;
      }
    }
    current = running;
    return { current, longest };
  }

  // daily / days_of_week / every_n_days: walk day by day
  let longest = 0;
  let running = 0;
  const cursor = new Date(startedOn);
  while (cursor <= today) {
    if (dayCounts(cursor, entryByDay, freezeDays, schedule, startedOn)) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // current streak: walk backward from today until a break
  let current = 0;
  const back = new Date(today);
  while (back >= startedOn) {
    if (dayCounts(back, entryByDay, freezeDays, schedule, startedOn)) {
      current++;
      back.setDate(back.getDate() - 1);
    } else {
      break;
    }
  }

  return { current, longest };
}

/** Approximate progress toward automaticity (median 59-66 days per 2024 review). */
export function automaticityProgress(daysActive: number): { day: number; ofMedian: number; percent: number } {
  const median = 63;
  return {
    day: daysActive,
    ofMedian: median,
    percent: Math.min(100, Math.round((daysActive / median) * 100)),
  };
}
