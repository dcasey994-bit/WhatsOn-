-- Run this in your Supabase project: SQL Editor → New Query → paste → Run

-- Saved events (per user)
create table if not exists saved_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  event_id    int not null,
  created_at  timestamptz default now(),
  unique(user_id, event_id)
);

-- Going events (per user)
create table if not exists going_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  event_id    int not null,
  created_at  timestamptz default now(),
  unique(user_id, event_id)
);

-- Row-level security: users can only see/edit their own rows
alter table saved_events enable row level security;
alter table going_events  enable row level security;

create policy "saved: own rows" on saved_events
  for all using (auth.uid() = user_id);

create policy "going: own rows" on going_events
  for all using (auth.uid() = user_id);
