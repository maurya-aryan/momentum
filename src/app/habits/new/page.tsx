'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import type { ScheduleKind } from '@/lib/schedule';
import type { HabitSource } from '@/lib/types';

const COLOURS = ['#22c55e', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ef4444', '#ec4899', '#14b8a6'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function NewHabitPage() {
  const router = useRouter();
  const [source, setSource] = useState<HabitSource>('manual');
  const [externalUsername, setExternalUsername] = useState('');
  const [name, setName] = useState('');
  const [colour, setColour] = useState(COLOURS[0]);
  const [type, setType] = useState<'build' | 'quit'>('build');
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [xPerWeek, setXPerWeek] = useState(3);
  const [everyN, setEveryN] = useState(2);
  const [ifThen, setIfThen] = useState('');
  const [anchor, setAnchor] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectSource(next: HabitSource) {
    setSource(next);
    if (next === 'github') {
      setName((n) => n || 'GitHub commits');
      setColour('#0ea5e9');
      setScheduleKind('daily');
    } else if (next === 'leetcode') {
      setName((n) => n || 'LeetCode');
      setColour('#f59e0b');
      setScheduleKind('daily');
    }
  }

  function scheduleConfig() {
    if (scheduleKind === 'days_of_week') return { days: selectedDays };
    if (scheduleKind === 'x_per_week') return { n: xPerWeek };
    if (scheduleKind === 'every_n_days') return { n: everyN };
    return {};
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Not signed in.');
      setSaving(false);
      return;
    }

    if (source !== 'manual' && !externalUsername.trim()) {
      setError(`Enter your ${source === 'github' ? 'GitHub' : 'LeetCode'} username.`);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('habits').insert({
      user_id: user.id,
      name: name.trim(),
      colour,
      type,
      schedule_kind: scheduleKind,
      schedule_config: scheduleConfig(),
      if_then: ifThen.trim() || null,
      anchor: anchor.trim() || null,
      source,
      external_username: source !== 'manual' ? externalUsername.trim() : null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (source === 'github') {
      fetch('/api/sync/github', { method: 'POST' }).catch(() => {});
    } else if (source === 'leetcode') {
      fetch('/api/sync/leetcode', { method: 'POST' }).catch(() => {});
    }

    router.push('/');
    router.refresh();
  }

  const inputStyle = {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add habit</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Source</label>
          <div className="flex gap-2">
            {(
              [
                ['manual', 'Manual'],
                ['github', 'GitHub'],
                ['leetcode', 'LeetCode'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectSource(value)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${source === value ? 'font-semibold' : ''}`}
                style={{ ...inputStyle, opacity: source === value ? 1 : 0.5 }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {source === 'manual'
              ? 'You check this in yourself.'
              : `Auto-filled from your real ${source === 'github' ? 'commits' : 'submissions'} — synced automatically, no manual check-in needed.`}
          </p>
        </div>

        {source !== 'manual' && (
          <div>
            <label className="block text-sm font-medium mb-1">
              {source === 'github' ? 'GitHub username' : 'LeetCode username'}
            </label>
            <input
              value={externalUsername}
              onChange={(e) => setExternalUsername(e.target.value)}
              placeholder={source === 'github' ? 'maurya-aryan' : 'your-leetcode-handle'}
              required
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Gym, LeetCode, Read…"
            required
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Colour</label>
          <div className="flex gap-2">
            {COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColour(c)}
                className="w-8 h-8 rounded-full"
                style={{
                  backgroundColor: c,
                  outline: colour === c ? '2px solid white' : 'none',
                  outlineOffset: '2px',
                }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('build')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm ${type === 'build' ? 'font-semibold' : ''}`}
              style={{ ...inputStyle, opacity: type === 'build' ? 1 : 0.5 }}
            >
              Build (do it → green)
            </button>
            <button
              type="button"
              onClick={() => setType('quit')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm ${type === 'quit' ? 'font-semibold' : ''}`}
              style={{ ...inputStyle, opacity: type === 'quit' ? 1 : 0.5 }}
            >
              Quit (clean day → green)
            </button>
          </div>
        </div>

        {source === 'manual' && (
        <div>
          <label className="block text-sm font-medium mb-1">Schedule</label>
          <select
            value={scheduleKind}
            onChange={(e) => setScheduleKind(e.target.value as ScheduleKind)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={inputStyle}
          >
            <option value="daily">Every day</option>
            <option value="days_of_week">Specific days of the week</option>
            <option value="x_per_week">X times per week (any days)</option>
            <option value="every_n_days">Every N days</option>
          </select>

          {scheduleKind === 'days_of_week' && (
            <div className="flex gap-1 mt-2">
              {WEEKDAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setSelectedDays((prev) =>
                      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort(),
                    )
                  }
                  className="w-9 h-9 rounded-full text-xs"
                  style={{
                    ...inputStyle,
                    backgroundColor: selectedDays.includes(i) ? colour : 'var(--card-bg)',
                  }}
                >
                  {label[0]}
                </button>
              ))}
            </div>
          )}

          {scheduleKind === 'x_per_week' && (
            <input
              type="number"
              min={1}
              max={7}
              value={xPerWeek}
              onChange={(e) => setXPerWeek(Number(e.target.value))}
              className="w-full rounded-lg px-3 py-2 text-sm mt-2"
              style={inputStyle}
            />
          )}

          {scheduleKind === 'every_n_days' && (
            <input
              type="number"
              min={2}
              max={30}
              value={everyN}
              onChange={(e) => setEveryN(Number(e.target.value))}
              className="w-full rounded-lg px-3 py-2 text-sm mt-2"
              style={inputStyle}
            />
          )}
        </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-500">
            Make it a system (optional, recommended)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                If-then plan — &ldquo;If [trigger], then I will [action]&rdquo;
              </label>
              <input
                value={ifThen}
                onChange={(e) => setIfThen(e.target.value)}
                placeholder="If it's 6:30am, then I put on gym clothes first."
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Anchor — stack it on an existing habit</label>
              <input
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
                placeholder="After I brush my teeth…"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
          </div>
        </details>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-green-600 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add habit'}
        </button>
      </form>
    </main>
  );
}
