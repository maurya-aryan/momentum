import type { HabitWithEntries } from './types';

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Deterministic PRNG so server-rendered and client-rendered mock data match
// exactly (Math.random() would differ per call and break hydration).
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

function randomEntries(seed: string, days: number, hitRate: number) {
  const rand = seededRandom(seed);
  const entries = [];
  for (let i = days; i >= 1; i--) {
    if (rand() < hitRate) {
      entries.push({ day: todayISO(-i), status: 'done' as const });
    }
  }
  return entries;
}

export const mockHabits: HabitWithEntries[] = [
  {
    id: 'gym',
    name: 'Gym',
    colour: '#22c55e',
    type: 'build',
    source: 'manual',
    schedule: { kind: 'days_of_week', config: { days: [1, 3, 5] } },
    startedOn: todayISO(-90),
    ifThen: 'If it is 6:30am, then I put on gym clothes before checking my phone.',
    anchor: 'After I wake up and drink water',
    entries: randomEntries('gym', 90, 0.75),
  },
  {
    id: 'leetcode',
    name: 'LeetCode',
    colour: '#f59e0b',
    type: 'build',
    source: 'manual',
    schedule: { kind: 'daily', config: {} },
    startedOn: todayISO(-45),
    ifThen: 'If I open my laptop after dinner, then I solve one problem before anything else.',
    anchor: 'After dinner',
    entries: randomEntries('leetcode', 45, 0.8),
  },
  {
    id: 'reading',
    name: 'Read 20min',
    colour: '#8b5cf6',
    type: 'build',
    source: 'manual',
    schedule: { kind: 'x_per_week', config: { n: 4 } },
    startedOn: todayISO(-60),
    entries: randomEntries('reading', 60, 0.55),
  },
  {
    id: 'github',
    name: 'Code / commit',
    colour: '#0ea5e9',
    type: 'build',
    source: 'manual',
    schedule: { kind: 'daily', config: {} },
    startedOn: todayISO(-120),
    entries: randomEntries('github', 120, 0.65),
  },
];

export const mockQuote = {
  text: 'You do not rise to the level of your goals. You fall to the level of your systems.',
  author: 'James Clear',
  explanation:
    "Tonight when you're tired and tempted to skip LeetCode: your goal ('get good at DSA') won't save you at 9pm. Your system will — the fact that you already decided 'after dinner, one problem' means there's nothing left to decide in the moment.",
};
