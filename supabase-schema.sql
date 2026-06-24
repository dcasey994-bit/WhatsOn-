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
  subscription_status    text not null default 'trialing' check (subscription_status in ('trialing','active','archived')),
  trial_ends_at          timestamptz not null default (now() + interval '3 months'),
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz default now()
);

-- If the venues table already existed, add the new columns:
alter table venues add column if not exists subscription_status    text not null default 'trialing' check (subscription_status in ('trialing','active','archived'));
alter table venues add column if not exists trial_ends_at          timestamptz not null default (now() + interval '3 months');
alter table venues add column if not exists stripe_customer_id     text;
alter table venues add column if not exists stripe_subscription_id text;

-- Allow multiple venues per user (drop the old one-venue-per-user constraint):
alter table venues drop constraint if exists venues_user_id_key;

-- Rename 'lapsed' → 'archived' in the subscription_status constraint:
alter table venues drop constraint if exists venues_subscription_status_check;
alter table venues add constraint venues_subscription_status_check
  check (subscription_status in ('trialing','active','archived'));
update venues set subscription_status = 'archived' where subscription_status = 'lapsed';

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
drop policy if exists "events: read active venues" on events;
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

-- ── Profiles (email lookup for member invites) ────────────────────────────────

create table if not exists profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text unique not null
);

-- Backfill existing users into profiles
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

-- Keep profiles in sync whenever a user signs up or changes email
create or replace function handle_auth_user_upsert()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_upserted on auth.users;
create trigger on_auth_user_upserted
  after insert or update on auth.users
  for each row execute procedure handle_auth_user_upsert();

alter table profiles enable row level security;
drop policy if exists "profiles: read all" on profiles;
create policy "profiles: read all" on profiles for select using (true);

-- ── Venue membership roles ─────────────────────────────────────────────────────

-- Security-definer helpers — run as postgres to bypass RLS and avoid recursion
create or replace function is_venue_member(vid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from venue_members where venue_id = vid and user_id = auth.uid()
  )
$$;

create or replace function is_venue_admin(vid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from venue_members
    where venue_id = vid and user_id = auth.uid() and role = 'admin'
  )
$$;

-- Returns members + their email for a venue the caller belongs to
create or replace function get_venue_members(vid uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language sql security definer stable as $$
  select vm.user_id, p.email, vm.role, vm.created_at
  from venue_members vm
  join profiles p on p.id = vm.user_id
  where vm.venue_id = vid
    and is_venue_member(vid)
  order by vm.created_at
$$;

create table if not exists venue_members (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid references venues(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  role        text not null check (role in ('admin', 'events_manager')),
  invited_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  unique(venue_id, user_id)
);

-- Backfill: existing venue owners become admins
insert into venue_members (venue_id, user_id, role)
select id, user_id, 'admin' from venues
on conflict (venue_id, user_id) do nothing;

alter table venue_members enable row level security;

-- Members can see their own row; admins can see all rows for their venues
drop policy if exists "venue_members: select own" on venue_members;
create policy "venue_members: select own" on venue_members
  for select using (user_id = auth.uid() or is_venue_admin(venue_id));

drop policy if exists "venue_members: admin insert" on venue_members;
create policy "venue_members: admin insert" on venue_members
  for insert with check (is_venue_admin(venue_id));

drop policy if exists "venue_members: admin update" on venue_members;
create policy "venue_members: admin update" on venue_members
  for update using (is_venue_admin(venue_id));

drop policy if exists "venue_members: admin delete" on venue_members;
create policy "venue_members: admin delete" on venue_members
  for delete using (is_venue_admin(venue_id));

-- ── Venue RLS update: only admins can edit/delete a venue ─────────────────────

drop policy if exists "venues: update own" on venues;
create policy "venues: update own" on venues for update using (is_venue_admin(id));

drop policy if exists "venues: delete own" on venues;
create policy "venues: delete own" on venues for delete using (is_venue_admin(id));

-- ── Events RLS update: any member can manage; public sees only active venues ──

drop policy if exists "events: read active venues" on events;
drop policy if exists "events: read active venues or members" on events;
create policy "events: read active venues or members" on events for select using (
  -- venue members always see their own events (including archived venues)
  is_venue_member(venue_id)
  or exists (
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
  is_venue_member(venue_id)
);

drop policy if exists "events: update own venue" on events;
create policy "events: update own venue" on events for update using (
  is_venue_member(venue_id)
);

drop policy if exists "events: delete own venue" on events;
create policy "events: delete own venue" on events for delete using (
  is_venue_member(venue_id)
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
