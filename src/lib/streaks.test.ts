import { describe, it, expect } from 'vitest';
import { calculateStreak, automaticityProgress, type Entry } from './streaks';
import { isDueOn, startOfDay } from './schedule';

describe('isDueOn', () => {
  it('daily is always due', () => {
    const schedule = { kind: 'daily' as const, config: {} };
    expect(isDueOn(schedule, new Date(2026, 0, 5), new Date(2026, 0, 1))).toBe(true);
  });

  it('days_of_week only due on chosen weekdays', () => {
    const schedule = { kind: 'days_of_week' as const, config: { days: [1, 3, 5] } }; // Mon/Wed/Fri
    // 2026-01-05 is a Monday
    expect(isDueOn(schedule, new Date(2026, 0, 5), new Date(2026, 0, 1))).toBe(true);
    // 2026-01-06 is a Tuesday
    expect(isDueOn(schedule, new Date(2026, 0, 6), new Date(2026, 0, 1))).toBe(false);
  });

  it('every_n_days is due every N days from start', () => {
    const schedule = { kind: 'every_n_days' as const, config: { n: 2 } };
    const start = new Date(2026, 0, 1);
    expect(isDueOn(schedule, new Date(2026, 0, 1), start)).toBe(true);
    expect(isDueOn(schedule, new Date(2026, 0, 2), start)).toBe(false);
    expect(isDueOn(schedule, new Date(2026, 0, 3), start)).toBe(true);
  });

  it('not due before the habit started', () => {
    const schedule = { kind: 'daily' as const, config: {} };
    expect(isDueOn(schedule, new Date(2025, 11, 31), new Date(2026, 0, 1))).toBe(false);
  });
});

describe('calculateStreak - daily', () => {
  const schedule = { kind: 'daily' as const, config: {} };

  it('counts consecutive done days ending today', () => {
    const entries: Entry[] = [
      { day: '2026-01-01', status: 'done' },
      { day: '2026-01-02', status: 'done' },
      { day: '2026-01-03', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-01', [], '2026-01-03');
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('a miss breaks the current streak', () => {
    const entries: Entry[] = [
      { day: '2026-01-01', status: 'done' },
      { day: '2026-01-02', status: 'miss' },
      { day: '2026-01-03', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-01', [], '2026-01-03');
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it('a day with no entry at all counts as a miss (not silently skipped)', () => {
    const entries: Entry[] = [{ day: '2026-01-01', status: 'done' }];
    const result = calculateStreak(entries, schedule, '2026-01-01', [], '2026-01-03');
    expect(result.current).toBe(0); // 01-02 and 01-03 have no entry -> miss
  });

  it('an explicit skip does not break the streak', () => {
    const entries: Entry[] = [
      { day: '2026-01-01', status: 'done' },
      { day: '2026-01-02', status: 'skip' },
      { day: '2026-01-03', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-01', [], '2026-01-03');
    expect(result.current).toBe(3);
  });

  it('a streak freeze rescues a missed day', () => {
    const entries: Entry[] = [
      { day: '2026-01-01', status: 'done' },
      { day: '2026-01-03', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-01', ['2026-01-02'], '2026-01-03');
    expect(result.current).toBe(3);
  });
});

describe('calculateStreak - days_of_week', () => {
  it('only Mon/Wed/Fri due days count; other days are free', () => {
    const schedule = { kind: 'days_of_week' as const, config: { days: [1, 3, 5] } };
    // Mon 1/5, Tue 1/6 (not due), Wed 1/7 done
    const entries: Entry[] = [
      { day: '2026-01-05', status: 'done' },
      { day: '2026-01-07', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-05', [], '2026-01-07');
    expect(result.current).toBe(3); // Mon done, Tue not due (free), Wed done
  });

  it('missing a due weekday breaks the streak', () => {
    const schedule = { kind: 'days_of_week' as const, config: { days: [1, 3, 5] } };
    const entries: Entry[] = [
      { day: '2026-01-05', status: 'done' }, // Mon
      // Wed 1/7 missing entirely
    ];
    const result = calculateStreak(entries, schedule, '2026-01-05', [], '2026-01-07');
    expect(result.current).toBe(0);
  });
});

describe('calculateStreak - every_n_days', () => {
  it('non-due days do not break the streak', () => {
    const schedule = { kind: 'every_n_days' as const, config: { n: 3 } };
    const entries: Entry[] = [
      { day: '2026-01-01', status: 'done' },
      { day: '2026-01-04', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-01', [], '2026-01-04');
    expect(result.current).toBe(4); // days 1,2,3,4 all "count" (1 done, 2-3 not due, 4 done)
  });
});

describe('calculateStreak - x_per_week', () => {
  it('a week is satisfied once the target count is hit within it', () => {
    const schedule = { kind: 'x_per_week' as const, config: { n: 2 } };
    // Week starting Sunday 2026-01-04 (2026-01-04 is a Sunday)
    const entries: Entry[] = [
      { day: '2026-01-05', status: 'done' },
      { day: '2026-01-07', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-04', [], '2026-01-08');
    expect(result.current).toBe(1);
  });

  it('an unsatisfied prior week resets the streak', () => {
    const schedule = { kind: 'x_per_week' as const, config: { n: 3 } };
    const entries: Entry[] = [
      // week of 1/4: only 1 done, target 3 -> not satisfied
      { day: '2026-01-05', status: 'done' },
      // week of 1/11: 3 done -> satisfied
      { day: '2026-01-12', status: 'done' },
      { day: '2026-01-13', status: 'done' },
      { day: '2026-01-14', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-01-04', [], '2026-01-14');
    expect(result.current).toBe(1);
  });
});

describe('automaticityProgress', () => {
  it('reports percent toward the ~63 day median', () => {
    const p = automaticityProgress(63);
    expect(p.percent).toBe(100);
    expect(automaticityProgress(0).percent).toBe(0);
    expect(automaticityProgress(200).percent).toBe(100); // capped
  });
});

describe('DST / timezone-shaped edges', () => {
  it('daily streak across a DST spring-forward boundary (US, 2026-03-08) stays continuous', () => {
    const schedule = { kind: 'daily' as const, config: {} };
    const entries: Entry[] = [
      { day: '2026-03-07', status: 'done' },
      { day: '2026-03-08', status: 'done' }, // DST starts in US on this date
      { day: '2026-03-09', status: 'done' },
    ];
    const result = calculateStreak(entries, schedule, '2026-03-07', [], '2026-03-09');
    expect(result.current).toBe(3);
  });

  it('startOfDay strips time components regardless of input time', () => {
    const d = startOfDay(new Date(2026, 5, 15, 23, 59, 59));
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(15);
  });
});
