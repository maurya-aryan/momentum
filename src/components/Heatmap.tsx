'use client';

import { useMemo } from 'react';
import type { Entry } from '@/lib/streaks';

interface HeatmapProps {
  entries: Entry[];
  colour: string;
  weeks?: number;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Heatmap({ entries, colour, weeks = 26 }: HeatmapProps) {
  const entryByDay = useMemo(() => new Map(entries.map((e) => [e.day, e.status])), [entries]);

  const { columns, monthMarkers } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay())); // extend to end of this week (Saturday)

    const start = new Date(end);
    start.setDate(start.getDate() - weeks * 7 + 1);
    // align to a Sunday
    start.setDate(start.getDate() - start.getDay());

    const cols: Date[][] = [];
    const markers: { colIndex: number; label: string }[] = [];
    let lastMonth = -1;
    const cursor = new Date(start);
    let colIndex = 0;

    while (cursor <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      const firstOfMonthInWeek = week.find((d) => d.getDate() <= 7);
      if (firstOfMonthInWeek && firstOfMonthInWeek.getMonth() !== lastMonth) {
        lastMonth = firstOfMonthInWeek.getMonth();
        markers.push({ colIndex, label: MONTH_LABELS[lastMonth] });
      }
      cols.push(week);
      colIndex++;
    }

    return { columns: cols, monthMarkers: markers };
  }, [weeks]);

  const today = toISO(new Date());

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-[3px] pl-1 mb-1 text-[10px] text-neutral-400 h-3">
          {monthMarkers.map((m, i) => (
            <span
              key={i}
              style={{
                position: 'relative',
                left: `${m.colIndex * 13}px`,
                width: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {columns.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => {
                const iso = toISO(day);
                const status = entryByDay.get(iso);
                const isFuture = iso > today;
                const isDone = status === 'done' || status === 'partial';
                const isSkip = status === 'skip';

                let bg = 'var(--heatmap-empty)';
                let opacity = 1;
                if (isFuture) {
                  opacity = 0;
                } else if (isDone) {
                  bg = colour;
                } else if (isSkip) {
                  bg = 'var(--heatmap-skip)';
                }

                return (
                  <div
                    key={di}
                    title={`${iso}${status ? ` — ${status}` : ''}`}
                    className="w-[11px] h-[11px] rounded-[2px]"
                    style={{ backgroundColor: bg, opacity }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
