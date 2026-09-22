import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

const QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      submissionCalendar
    }
  }
`;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, external_username')
    .eq('user_id', user.id)
    .eq('source', 'leetcode')
    .eq('archived', false);

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 });
  }
  if (!habits || habits.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  let totalDays = 0;

  for (const habit of habits) {
    if (!habit.external_username) continue;

    const res = await fetch(LEETCODE_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Momentum habit tracker)',
      },
      body: JSON.stringify({ query: QUERY, variables: { username: habit.external_username } }),
    });

    if (!res.ok) continue;
    const json = await res.json();
    const calendarStr: string | undefined = json?.data?.matchedUser?.submissionCalendar;
    if (!calendarStr) continue;

    const calendar: Record<string, number> = JSON.parse(calendarStr);
    const rows = Object.entries(calendar)
      .filter(([, count]) => count > 0)
      .map(([ts]) => {
        const date = new Date(Number(ts) * 1000);
        const day = date.toISOString().slice(0, 10);
        return {
          habit_id: habit.id,
          day,
          status: 'done' as const,
          logged_from: 'import' as const,
        };
      });

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('entries')
        .upsert(rows, { onConflict: 'habit_id,day', ignoreDuplicates: false });
      if (!upsertError) totalDays += rows.length;
    }
  }

  return NextResponse.json({ synced: totalDays });
}
