'use client';

import { useState } from 'react';
import Link from 'next/link';
import QuoteBanner from './QuoteBanner';
import HabitCheckItem from './HabitCheckItem';
import { createClient } from '@/lib/db/client';
import { isDueOn } from '@/lib/schedule';
import type { HabitWithEntries } from '@/lib/types';

interface TodayClientProps {
  initialHabits: HabitWithEntries[];
  quote: { text: string; author?: string; explanation: string };
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TodayClient({ initialHabits, quote }: TodayClientProps) {
  const [habits, setHabits] = useState<HabitWithEntries[]>(initialHabits);
  const [pending, setPending] = useState<string | null>(null);
  const today = todayISO();
  const supabase = createClient();

  async function toggle(habitId: string) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const wasDone = habit.entries.some((e) => e.day === today);

    // optimistic update
    setHabits((prev) =>
      prev.map((h) =>
        h.id !== habitId
          ? h
          : {
              ...h,
              entries: wasDone
                ? h.entries.filter((e) => e.day !== today)
                : [...h.entries, { day: today, status: 'done' as const }],
            },
      ),
    );
    setPending(habitId);

    if (wasDone) {
      await supabase.from('entries').delete().eq('habit_id', habitId).eq('day', today);
    } else {
      await supabase.from('entries').upsert(
        { habit_id: habitId, day: today, status: 'done', logged_from: 'web' },
        { onConflict: 'habit_id,day' },
      );
    }
    setPending(null);
  }

  const dueHabits = habits.filter((h) =>
    isDueOn(h.schedule, new Date(), new Date(h.startedOn + 'T00:00:00')),
  );
  const notDue = habits.filter((h) => !dueHabits.includes(h));
  const doneCount = dueHabits.filter((h) => h.entries.some((e) => e.day === today)).length;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <span className="text-sm text-neutral-500">
          {doneCount}/{dueHabits.length} done
        </span>
      </header>

      <QuoteBanner text={quote.text} author={quote.author} explanation={quote.explanation} />

      <section className="space-y-3">
        {dueHabits.map((habit) => (
          <div key={habit.id} className={pending === habit.id ? 'opacity-70 transition-opacity' : ''}>
            <HabitCheckItem
              habit={habit}
              doneToday={habit.entries.some((e) => e.day === today)}
              onToggle={toggle}
            />
          </div>
        ))}
        {dueHabits.length === 0 && habits.length > 0 && (
          <p className="text-sm text-neutral-500">Nothing due today. Rest day.</p>
        )}
        {habits.length === 0 && (
          <p className="text-sm text-neutral-500">
            No habits yet.{' '}
            <Link href="/habits/new" className="underline">
              Add your first one
            </Link>
            .
          </p>
        )}
      </section>

      {notDue.length > 0 && (
        <section className="pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <p className="text-xs text-neutral-500 mb-2">Not due today</p>
          <div className="space-y-3 opacity-60">
            {notDue.map((habit) => (
              <HabitCheckItem
                key={habit.id}
                habit={habit}
                doneToday={habit.entries.some((e) => e.day === today)}
                onToggle={toggle}
              />
            ))}
          </div>
        </section>
      )}

      {habits.length > 0 && (
        <Link
          href="/habits/new"
          className="block text-center text-sm font-medium py-3 rounded-lg"
          style={{ border: '1px solid var(--card-border)' }}
        >
          + Add habit
        </Link>
      )}
    </main>
  );
}
