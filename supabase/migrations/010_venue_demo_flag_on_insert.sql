-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — A venue inherits the demo-ness of whoever created it
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- venues.is_demo defaults to false, and registerVenue() never sets it, so a
-- venue registered by the demo account was created LIVE. Worse, the read
-- policy from 006 is `is_demo = viewer_is_demo()`, so the demo account could
-- not read back the row it had just written: PostgREST filters the insert's
-- RETURNING clause through the select policy, the .single() came back empty
-- and threw, and the venue_members insert on the next line never ran.
--
-- The result was a live venue on the public map with no members, invisible to
-- the person who created it and therefore impossible for them to remove.
--
-- Nothing leaked the other way — demo data has never been visible to live
-- viewers. This is the demo account pushing rows into live.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Stamp the flag on insert ──────────────────────────────────────────────
-- In the trigger rather than in the client, so it cannot be bypassed by a
-- direct query with the anon key.
--
-- Only when there is a signed-in user. Seeding runs in the SQL editor with no
-- auth.uid(), where viewer_is_demo() is false — without this guard, running
-- supabase/seed/demo-data.sql would quietly turn every seeded demo venue live,
-- which is the exact accident this migration exists to prevent.

create or replace function set_venue_demo_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.is_demo := public.viewer_is_demo();
  end if;
  return new;
end $$;

drop trigger if exists venues_set_demo on venues;
create trigger venues_set_demo
  before insert on venues
  for each row execute function set_venue_demo_flag();

-- ── 2. Recover anything the bug already created ──────────────────────────────
-- A venue owned by a demo profile but marked live is unambiguously this bug:
-- there is no legitimate way to produce one. Moved into the demo world rather
-- than deleted — it is reversible, and it takes the venue off the public map
-- immediately either way.

update venues v
   set is_demo = true
  from profiles p
 where p.id = v.user_id
   and p.is_demo
   and not v.is_demo;

-- ── 3. What was recovered, and anything left needing a look ──────────────────

-- Venues with no team at all. The failed registrations above are the likely
-- cause; each one is unreachable from the app until someone is made an admin.
select v.id, v.name, v.is_demo, v.created_at, 'no members' as issue
from venues v
left join venue_members m on m.venue_id = v.id
where m.venue_id is null

union all

-- Belt and braces: a live venue whose owner is a demo account should no longer
-- exist after step 2. Anything here means the update did not match.
select v.id, v.name, v.is_demo, v.created_at, 'demo owner, still live'
from venues v
join profiles p on p.id = v.user_id
where p.is_demo and not v.is_demo

order by created_at;
