import { createClient } from '@/lib/db/server';
import { toHabitWithEntries, type HabitRow, type EntryRow } from '@/lib/db/mappers';
import TodayClient from '@/components/TodayClient';
import { mockQuote } from '@/lib/mockData';

export default async function TodayPage() {
  const supabase = await createClient();

  const { data: habitRows } = await supabase
    .from('habits')
    .select('id, name, colour, type, schedule_kind, schedule_config, started_on, if_then, anchor')
    .eq('archived', false)
    .order('created_at', { ascending: true });

  const habitIds = (habitRows ?? []).map((h) => h.id);

  const { data: entryRows } =
    habitIds.length > 0
      ? await supabase
          .from('entries')
          .select('habit_id, day, status')
          .in('habit_id', habitIds)
          .gte('day', new Date(Date.now() - 200 * 86400000).toISOString().slice(0, 10))
      : { data: [] as EntryRow[] };

  const habits = (habitRows ?? []).map((h) => toHabitWithEntries(h as HabitRow, entryRows ?? []));

  // TODO(phase 4): personalise this against the user's actual data
  const quote = mockQuote;

  return <TodayClient initialHabits={habits} quote={quote} />;
}
