-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — make the events realtime subscription explicit
-- Run this ONCE in Supabase: SQL Editor → New query → paste → Run.
-- Safe to re-run.
--
-- The app subscribes to INSERT/UPDATE/DELETE on `events` so listings stay
-- current without polling. That only works if the table belongs to the
-- `supabase_realtime` publication. Until now that was dashboard-only state
-- (Database → Replication), invisible to anyone reading this repo and lost if
-- the project were ever recreated from these migrations.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end
$$;

-- Verify: should return one row.
select schemaname, tablename
  from pg_publication_tables
 where pubname = 'supabase_realtime'
   and tablename = 'events';
