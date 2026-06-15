-- Run this in your Supabase project: SQL Editor → New Query → paste → Run

-- Saved events (per user) — event_id is text to support both mock int IDs and DB UUIDs
create table if not exists saved_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  event_id    text not null,
  created_at  timestamptz default now(),
  unique(user_id, event_id)
);

-- Going events (per user)
create table if not exists going_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  event_id    text not null,
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

-- ── Venues ────────────────────────────────────────────────────────────────

create table if not exists venues (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  name       text not null,
  address    text not null,
  lat        double precision not null,
  lng        double precision not null,
  phone      text,
  capacity   int,
  type       text,
  created_at timestamptz default now()
);

alter table venues enable row level security;

create policy "venues: read all"   on venues for select using (true);
create policy "venues: insert own" on venues for insert with check (auth.uid() = user_id);
create policy "venues: update own" on venues for update using (auth.uid() = user_id);
create policy "venues: delete own" on venues for delete using (auth.uid() = user_id);

-- ── Events ────────────────────────────────────────────────────────────────

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade not null,
  name        text not null,
  category    text not null,
  date        date not null,
  time        time not null,
  price       numeric(8,2) default 0,
  description text,
  capacity    int,
  ticket_url  text,
  created_at  timestamptz default now()
);

alter table events enable row level security;

create policy "events: read all" on events for select using (true);

create policy "events: insert own venue" on events for insert with check (
  exists (select 1 from venues where id = venue_id and user_id = auth.uid())
);

create policy "events: update own venue" on events for update using (
  exists (select 1 from venues where id = venue_id and user_id = auth.uid())
);

create policy "events: delete own venue" on events for delete using (
  exists (select 1 from venues where id = venue_id and user_id = auth.uid())
);
