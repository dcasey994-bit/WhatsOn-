-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Saved venues
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Venues are now saveable in their own right, alongside saved_events, so the
-- Saved tab has something to show on its venues side. Mirrors saved_events,
-- except venue_id is a real uuid reference — venue ids only ever come from
-- this database, so there is no mock-id case to keep text for.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists saved_venues (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  venue_id    uuid references venues(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(user_id, venue_id)
);

alter table saved_venues enable row level security;

drop policy if exists "saved venues: own rows" on saved_venues;
create policy "saved venues: own rows" on saved_venues
  for all using (auth.uid() = user_id);

-- Every read is "my saved venues", so the user column leads the index.
create index if not exists saved_venues_user_idx on saved_venues (user_id);
