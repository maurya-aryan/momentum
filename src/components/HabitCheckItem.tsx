'use client';

import Heatmap from './Heatmap';
import { calculateStreak } from '@/lib/streaks';
import type { HabitWithEntries } from '@/lib/types';

interface HabitCheckItemProps {
  habit: HabitWithEntries;
  doneToday: boolean;
  onToggle: (habitId: string) => void;
}

export default function HabitCheckItem({ habit, doneToday, onToggle }: HabitCheckItemProps) {
  const { current, longest } = calculateStreak(habit.entries, habit.schedule, habit.startedOn, []);
  const isSynced = habit.source !== 'manual';

  const indicator = (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
      style={{
        backgroundColor: doneToday ? habit.colour : 'transparent',
        border: `2px solid ${habit.colour}`,
      }}
    >
      {doneToday && (
        <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
          <path d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.9 3.9 6.7-6.7a1 1 0 011.4 0z" />
        </svg>
      )}
    </span>
  );

  return (
    <div
      className="rounded-xl p-4 card-blur h-full"
      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <div className="flex items-center justify-between gap-4">
        {isSynced ? (
          <div className="flex items-center gap-3 flex-1">
            {indicator}
            <div>
              <p className="font-semibold flex items-center gap-1.5">
                {habit.name}
                <span
                  className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
                  style={{ border: '1px solid var(--card-border)', color: 'var(--foreground)', opacity: 0.6 }}
                >
                  synced
                </span>
              </p>
              <p className="text-xs text-neutral-500">
                {current > 0 ? `🔥 ${current} day streak` : 'No active streak'}
                {longest > current && longest > 0 ? ` · best ${longest}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onToggle(habit.id)}
            className="flex items-center gap-3 flex-1 text-left group"
            aria-pressed={doneToday}
          >
            {indicator}
            <div>
              <p className="font-semibold">{habit.name}</p>
              <p className="text-xs text-neutral-500">
                {current > 0 ? `🔥 ${current} day streak` : 'No active streak'}
                {longest > current && longest > 0 ? ` · best ${longest}` : ''}
              </p>
            </div>
          </button>
        )}
      </div>
      <div className="mt-3">
        <Heatmap entries={habit.entries} colour={habit.colour} weeks={20} />
      </div>
    </div>
  );
}
