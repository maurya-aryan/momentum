-- Momentum core schema (Phase 1 + hooks for later phases)

create extension if not exists "uuid-ossp";

create table habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  colour text not null default '#22c55e',
  icon text,
  type text not null default 'build' check (type in ('build', 'quit')),
  archived boolean not null default false,
  schedule_kind text not null default 'daily'
    check (schedule_kind in ('daily', 'days_of_week', 'x_per_week', 'every_n_days')),
  schedule_config jsonb not null default '{}'::jsonb,
  if_then text,
  anchor text,
  bundle text,
  source text not null default 'manual' check (source in ('manual', 'github', 'leetcode')),
  external_username text,
  started_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table entries (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references habits(id) on delete cascade,
  day date not null,
  status text not null check (status in ('done', 'skip', 'miss', 'partial')),
  value numeric,
  note text,
  logged_at timestamptz not null default now(),
  logged_from text check (logged_from in ('phone', 'desktop', 'web', 'import')),
  unique (habit_id, day)
);

create table streak_freezes (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references habits(id) on delete cascade,
  day date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);

create table lapses (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references habits(id) on delete cascade,
  at timestamptz not null default now(),
  cue text,
  emotion text,
  location text,
  what_i_did_instead text
);

create table prompts (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references habits(id) on delete cascade,
  local_time time not null,
  days int[] not null default '{0,1,2,3,4,5,6}',
  channel text not null default 'both' check (channel in ('push', 'desktop', 'both'))
);

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  text text not null,
  author text,
  tags text[] default '{}',
  explanation_template text
);

create table quote_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  quote_id uuid references quotes(id),
  personalised_explanation text,
  user_reaction text,
  unique (user_id, day)
);

-- Row Level Security: every table scoped to the owning user
alter table habits enable row level security;
alter table entries enable row level security;
alter table streak_freezes enable row level security;
alter table lapses enable row level security;
alter table prompts enable row level security;
alter table quote_log enable row level security;

create policy "own habits" on habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own entries" on entries for all
  using (auth.uid() = (select user_id from habits where habits.id = entries.habit_id))
  with check (auth.uid() = (select user_id from habits where habits.id = entries.habit_id));

create policy "own freezes" on streak_freezes for all
  using (auth.uid() = (select user_id from habits where habits.id = streak_freezes.habit_id))
  with check (auth.uid() = (select user_id from habits where habits.id = streak_freezes.habit_id));

create policy "own lapses" on lapses for all
  using (auth.uid() = (select user_id from habits where habits.id = lapses.habit_id))
  with check (auth.uid() = (select user_id from habits where habits.id = lapses.habit_id));

create policy "own prompts" on prompts for all
  using (auth.uid() = (select user_id from habits where habits.id = prompts.habit_id))
  with check (auth.uid() = (select user_id from habits where habits.id = prompts.habit_id));

create policy "own quote log" on quote_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- quotes table is shared/read-only content, no RLS needed beyond default deny + explicit read policy
alter table quotes enable row level security;
create policy "anyone can read quotes" on quotes for select using (true);

create index entries_habit_day_idx on entries (habit_id, day desc);
create index habits_user_idx on habits (user_id) where archived = false;
