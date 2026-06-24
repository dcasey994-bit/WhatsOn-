-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Venue team roles migration
-- Run this ONCE in Supabase: SQL Editor → New query → paste → Run.
-- Safe to re-run (everything is idempotent).
--
-- Adds:
--   • 'archived' subscription status (replaces 'lapsed')
--   • profiles table (email lookup for inviting members)
--   • venue_members table — Admin / Events Manager roles per venue
--   • RLS so admins manage billing + team + events, managers manage events only
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Subscription status: rename 'lapsed' → 'archived' ──────────────────────

alter table venues drop constraint if exists venues_subscription_status_check;
alter table venues add constraint venues_subscription_status_check
  check (subscription_status in ('trialing','active','archived'));
update venues set subscription_status = 'archived' where subscription_status = 'lapsed';

-- ── 2. Profiles (email lookup for member invites) ─────────────────────────────

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

-- ── 3. venue_members table (must exist before the helper functions) ───────────

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

-- ── 4. Security-definer helpers (bypass RLS to avoid recursion) ───────────────

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

-- ── 5. venue_members RLS ──────────────────────────────────────────────────────

alter table venue_members enable row level security;

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

-- ── 6. Venues RLS: only admins can edit/delete a venue ────────────────────────

drop policy if exists "venues: update own" on venues;
create policy "venues: update own" on venues for update using (is_venue_admin(id));

drop policy if exists "venues: delete own" on venues;
create policy "venues: delete own" on venues for delete using (is_venue_admin(id));

-- ── 7. Events RLS: any member manages; public sees only active venues ─────────

drop policy if exists "events: read all" on events;
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
