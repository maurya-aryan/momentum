'use client';

import { useState } from 'react';
import QuoteBanner from '@/components/QuoteBanner';
import HabitCheckItem from '@/components/HabitCheckItem';
import { mockHabits, mockQuote } from '@/lib/mockData';
import { isDueOn } from '@/lib/schedule';
import type { HabitWithEntries } from '@/lib/types';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TodayPage() {
  const [habits, setHabits] = useState<HabitWithEntries[]>(mockHabits);
  const today = todayISO();

  function toggle(habitId: string) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const existing = h.entries.find((e) => e.day === today);
        if (existing) {
          return { ...h, entries: h.entries.filter((e) => e.day !== today) };
        }
        return { ...h, entries: [...h.entries, { day: today, status: 'done' as const }] };
      }),
    );
  }

  const dueHabits = habits.filter((h) =>
    isDueOn(h.schedule, new Date(), new Date(h.startedOn + 'T00:00:00')),
  );
  const doneCount = dueHabits.filter((h) => h.entries.some((e) => e.day === today)).length;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <span className="text-sm text-neutral-500">
          {doneCount}/{dueHabits.length} done
        </span>
      </header>

      <QuoteBanner text={mockQuote.text} author={mockQuote.author} explanation={mockQuote.explanation} />

      <section className="space-y-3">
        {dueHabits.map((habit) => (
          <HabitCheckItem
            key={habit.id}
            habit={habit}
            doneToday={habit.entries.some((e) => e.day === today)}
            onToggle={toggle}
          />
        ))}
        {dueHabits.length === 0 && (
          <p className="text-sm text-neutral-500">Nothing due today. Rest day.</p>
        )}
      </section>

      {habits.length > dueHabits.length && (
        <section className="pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <p className="text-xs text-neutral-500 mb-2">Not due today</p>
          <div className="space-y-3 opacity-60">
            {habits
              .filter((h) => !dueHabits.includes(h))
              .map((habit) => (
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
    </main>
  );
}
