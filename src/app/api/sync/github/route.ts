import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

const QUERY = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export async function POST() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, started_on, external_username')
    .eq('user_id', user.id)
    .eq('source', 'github')
    .eq('archived', false);

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 });
  }
  if (!habits || habits.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  const now = new Date();
  let totalDays = 0;

  for (const habit of habits) {
    if (!habit.external_username) continue;

    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startedOn = new Date(habit.started_on + 'T00:00:00Z');
    const from = (startedOn > oneYearAgo ? startedOn : oneYearAgo).toISOString();
    const to = now.toISOString();

    const res = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { login: habit.external_username, from, to },
      }),
    });

    if (!res.ok) continue;
    const json = await res.json();
    const weeks = json?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
    if (!weeks) continue;

    const rows = weeks
      .flatMap((w: { contributionDays: { date: string; contributionCount: number }[] }) => w.contributionDays)
      .filter((d: { contributionCount: number }) => d.contributionCount > 0)
      .map((d: { date: string }) => ({
        habit_id: habit.id,
        day: d.date,
        status: 'done' as const,
        logged_from: 'import' as const,
      }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('entries')
        .upsert(rows, { onConflict: 'habit_id,day', ignoreDuplicates: false });
      if (!upsertError) totalDays += rows.length;
    }
  }

  return NextResponse.json({ synced: totalDays });
}
