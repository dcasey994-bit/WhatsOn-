-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Demo mode
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Adds a demo/live split enforced in the database, not the client:
--   • venues.is_demo   — marks a venue (and, through it, all its events)
--   • profiles.is_demo — marks an account as a demo viewer
--
-- A demo viewer sees ONLY demo data. Everyone else — signed in or not —
-- sees ONLY live data. Because it is RLS, demo rows cannot leak through the
-- map, a shared link, or a direct query with the public anon key.
--
-- Run this BEFORE supabase-seed-demo-data.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Flags ─────────────────────────────────────────────────────────────────

alter table venues   add column if not exists is_demo boolean not null default false;
alter table profiles add column if not exists is_demo boolean not null default false;

create index if not exists venues_is_demo_idx on venues (is_demo);

-- ── 2. Is the current viewer a demo account? ─────────────────────────────────
-- security definer so it can read profiles regardless of that table's policies.
-- Returns false for signed-out visitors, so they get live data.

create or replace function viewer_is_demo()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_demo from public.profiles where id = auth.uid()), false)
$$;

-- ── 3. Venues: demo viewers see demo venues, everyone else sees live ────────

drop policy if exists "venues: read all" on venues;
drop policy if exists "venues: read visible" on venues;
create policy "venues: read visible" on venues for select
  using (is_demo = viewer_is_demo());

-- ── 4. Events: same split, on top of the existing membership/subscription rules

drop policy if exists "events: read all" on events;
drop policy if exists "events: read active venues" on events;
drop policy if exists "events: read active venues or members" on events;
create policy "events: read active venues or members" on events for select using (
  exists (
    select 1 from venues v
    where v.id = venue_id
      -- demo and live never mix
      and v.is_demo = viewer_is_demo()
      and (
        -- a venue's own team always sees its events, even once archived
        is_venue_member(v.id)
        or v.subscription_status = 'active'
        or (v.subscription_status = 'trialing' and v.trial_ends_at > now())
      )
  )
);

-- ── 5. Turning an account into a demo account ────────────────────────────────
-- Create the account first (Authentication → Users → Add user), sign in with
-- it once so its profile row exists, then run:
--
--   update profiles set is_demo = true where email = 'demo@whatsonapp.uk';
--
-- To revoke:
--   update profiles set is_demo = false where email = 'demo@whatsonapp.uk';
