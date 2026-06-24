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

drop policy if exists "saved: own rows" on saved_events;
create policy "saved: own rows" on saved_events
  for all using (auth.uid() = user_id);

drop policy if exists "going: own rows" on going_events;
create policy "going: own rows" on going_events
  for all using (auth.uid() = user_id);

-- ── Venues ────────────────────────────────────────────────────────────────

-- A user may own multiple venues (no unique constraint on user_id).
create table if not exists venues (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete cascade not null,
  name                   text not null,
  address                text not null,
  lat                    double precision not null,
  lng                    double precision not null,
  phone                  text,
  capacity               int,
  type                   text,
  subscription_status    text not null default 'trialing' check (subscription_status in ('trialing','active','lapsed')),
  trial_ends_at          timestamptz not null default (now() + interval '3 months'),
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz default now()
);

-- If the venues table already existed, add the new columns:
alter table venues add column if not exists subscription_status    text not null default 'trialing' check (subscription_status in ('trialing','active','lapsed'));
alter table venues add column if not exists trial_ends_at          timestamptz not null default (now() + interval '3 months');
alter table venues add column if not exists stripe_customer_id     text;
alter table venues add column if not exists stripe_subscription_id text;

-- Allow multiple venues per user (drop the old one-venue-per-user constraint):
alter table venues drop constraint if exists venues_user_id_key;

alter table venues enable row level security;

drop policy if exists "venues: read all"   on venues;
create policy "venues: read all"   on venues for select using (true);
drop policy if exists "venues: insert own" on venues;
create policy "venues: insert own" on venues for insert with check (auth.uid() = user_id);
drop policy if exists "venues: update own" on venues;
create policy "venues: update own" on venues for update using (auth.uid() = user_id);
drop policy if exists "venues: delete own" on venues;
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
  image_url   text,
  created_at  timestamptz default now()
);

-- If the events table already existed before image support, add the column:
alter table events add column if not exists image_url text;

alter table events enable row level security;

drop policy if exists "events: read all" on events;
-- Only show events from venues that are active or still within their free trial
create policy "events: read active venues" on events for select using (
  exists (
    select 1 from venues
    where id = venue_id
      and (
        subscription_status = 'active'
        or (subscription_status = 'trialing' and trial_ends_at > now())
      )
  )
);

drop policy if exists "events: insert own venue" on events;
create policy "events: insert own venue" on events for insert with check (
  exists (select 1 from venues where id = venue_id and user_id = auth.uid())
);

drop policy if exists "events: update own venue" on events;
create policy "events: update own venue" on events for update using (
  exists (select 1 from venues where id = venue_id and user_id = auth.uid())
);

drop policy if exists "events: delete own venue" on events;
create policy "events: delete own venue" on events for delete using (
  exists (select 1 from venues where id = venue_id and user_id = auth.uid())
);

-- ── Going counts ────────────────────────────────────────────────────────────
-- Public aggregate of how many people are "going" to each event. The view is
-- owned by postgres so it bypasses going_events RLS to count everyone's rows,
-- while individual going_events rows stay private to their owner.

create or replace view going_counts as
  select event_id, count(*)::int as count
  from going_events
  group by event_id;

grant select on going_counts to anon, authenticated;

-- ── Event images (Storage) ──────────────────────────────────────────────────
-- Public bucket for event banner images. Anyone can read; logged-in venues upload.

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

drop policy if exists "event images: public read" on storage.objects;
create policy "event images: public read" on storage.objects
  for select using (bucket_id = 'event-images');

drop policy if exists "event images: authenticated upload" on storage.objects;
create policy "event images: authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-images');
