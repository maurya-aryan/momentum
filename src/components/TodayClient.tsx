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
    <main className="max-w-[1400px] w-full mx-auto px-6 md:px-10 py-8 space-y-6 flex-1">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <span className="text-sm text-neutral-500">
          {doneCount}/{dueHabits.length} done
        </span>
      </header>

      <QuoteBanner text={quote.text} author={quote.author} explanation={quote.explanation} />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
          <p className="text-sm text-neutral-500 col-span-full">Nothing due today. Rest day.</p>
        )}
        {habits.length === 0 && (
          <p className="text-sm text-neutral-500 col-span-full">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
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
          aria-label="Add habit"
          title="Add habit"
          className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 rounded-full flex items-center justify-center shadow-lg card-blur transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.9)',
            border: '1px solid var(--card-border)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-6 h-6">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </Link>
      )}
    </main>
  );
}
