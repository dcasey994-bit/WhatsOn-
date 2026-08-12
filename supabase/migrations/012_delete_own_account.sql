-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Let a user delete their own account
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Google Play requires any app that lets people create an account to let them
-- delete it from inside the app, not only by emailing someone. Deleting a row
-- from auth.users needs privileges the anon key does not have, so this runs as
-- a security definer function keyed on auth.uid() — the caller can only ever
-- delete themselves, and the app never needs the service role key.
--
-- What this does NOT do: cancel a Stripe subscription. Nothing in the database
-- can reach Stripe. A venue with an active subscription must be cancelled in
-- the Stripe dashboard, or it keeps billing after the account is gone.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Stop an invite record from blocking the delete ────────────────────────
-- venue_members.invited_by references auth.users with no ON DELETE clause,
-- which defaults to NO ACTION. Anyone who has ever invited a colleague is
-- therefore undeletable — the delete fails on a foreign key violation, both
-- here and from the Supabase dashboard. The invite is an audit trail, not
-- something worth keeping a whole account alive for, so it goes null.

alter table venue_members
  drop constraint if exists venue_members_invited_by_fkey;

alter table venue_members
  add constraint venue_members_invited_by_fkey
  foreign key (invited_by) references auth.users(id) on delete set null;

-- ── 2. The delete itself ─────────────────────────────────────────────────────
-- saved_events, going_events, saved_venues, profiles and venue_members all
-- cascade from auth.users, so the only thing needing real thought is venues.
--
-- venues.user_id also cascades, which would mean deleting your account takes
-- every venue you happen to own down with it — including its events and its
-- other admins — even where someone else is actively running it. So a venue
-- with another admin is handed over rather than destroyed. Only a venue where
-- the leaver is the last admin is deleted, which matches what the privacy
-- policy promises: "any venues you solely manage along with their listings".

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  v    record;
  heir uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  for v in select id from public.venues where user_id = uid loop
    -- Longest-standing remaining admin inherits it.
    select vm.user_id into heir
      from public.venue_members vm
     where vm.venue_id = v.id
       and vm.role     = 'admin'
       and vm.user_id <> uid
     order by vm.created_at
     limit 1;

    if heir is null then
      delete from public.venues where id = v.id;   -- cascades events + members
    else
      update public.venues set user_id = heir where id = v.id;
    end if;
  end loop;

  -- Venues someone else owns: the user simply stops being on the team. Done
  -- before the auth.users delete so it cannot be mistaken for a cascade.
  delete from public.venue_members where user_id = uid;

  delete from auth.users where id = uid;
end $$;

-- Only a signed-in caller, and auth.uid() means only ever themselves.
revoke all on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;

-- ── 3. Check ─────────────────────────────────────────────────────────────────
-- Should return one row. If it does not, the function did not create.

select p.proname, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'delete_own_account';
