-- WhatsOn? — Close three holes found in the pre-launch security check.
--
-- 1. Every account's email address was readable by anyone holding the public
--    anon key, signed in or not ("profiles: read all"). It existed only so a
--    venue admin could look someone up by email to add them to the team; that
--    lookup now happens inside add_venue_member(), which checks the caller is
--    an admin of the venue first.
--
-- 2. Registering a venue never made its creator an admin. registerVenue()
--    inserted the venue_members row from the browser, where the "admin insert"
--    policy refuses it — nobody is an admin of a venue that has no members —
--    and the error was ignored. The owner got a venue they could not see in
--    their list or manage. A trigger now adds the row.
--
-- 3. The billing columns were writable by the venue's own admins. Anyone could
--    register a venue already 'active' with a trial ending in 2076, or flip an
--    archived one back on, without paying. A trigger now ignores browser writes
--    to those columns; only the Stripe webhook (service role) and the SQL
--    editor can change them.
--
-- 4. Any signed-in user could upload any file, of any size or type, anywhere
--    in the public event-images bucket: free hosting on our account for
--    whatever they liked. Uploads are now images only, at most 10 MB, and
--    only into the uploader's own folder (which uploadEventImage() already
--    uses).
--
-- Safe to re-run.

-- ── 1. Profiles: own row only ───────────────────────────────────────────────
drop policy if exists "profiles: read all" on profiles;
drop policy if exists "profiles: read own" on profiles;
create policy "profiles: read own" on profiles
  for select using (id = (select auth.uid()));

-- Errors carry their own SQLSTATE so the app can show the right message
-- without matching on text.
create or replace function add_venue_member(vid uuid, member_email text, member_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if not public.is_venue_admin(vid) then
    raise exception 'Only venue admins can add people' using errcode = '42501';
  end if;
  if member_role not in ('admin', 'events_manager') then
    raise exception 'Unknown role %', member_role using errcode = '22023';
  end if;

  select id into uid from public.profiles where email = lower(trim(member_email));
  if uid is null then
    raise exception 'No account with that email' using errcode = 'P0002';
  end if;

  insert into public.venue_members (venue_id, user_id, role, invited_by)
  values (vid, uid, member_role, auth.uid());
end $$;

revoke execute on function add_venue_member(uuid, text, text) from public, anon;
grant  execute on function add_venue_member(uuid, text, text) to authenticated;

-- ── 2. The creator of a venue is its first admin ────────────────────────────
create or replace function add_venue_creator_as_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.venue_members (venue_id, user_id, role)
  values (new.id, new.user_id, 'admin')
  on conflict (venue_id, user_id) do nothing;
  return new;
end $$;

drop trigger if exists venues_add_creator_as_admin on venues;
create trigger venues_add_creator_as_admin
  after insert on venues
  for each row execute function add_venue_creator_as_admin();

-- ── 3. Billing columns are not the browser's to set ─────────────────────────
-- current_user is the API role for requests from the app ('anon' or
-- 'authenticated'). The webhook runs as service_role, the SQL editor as
-- postgres, and SECURITY DEFINER functions such as delete_own_account() as
-- their owner, so all of those pass through untouched.
--
-- The trial length here must agree with the trial_ends_at column default
-- (migration 013) and the Terms page.
create or replace function protect_venue_billing()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.subscription_status    := 'trialing';
    new.trial_ends_at          := now() + interval '12 months';
    new.stripe_customer_id     := null;
    new.stripe_subscription_id := null;
  else
    new.subscription_status    := old.subscription_status;
    new.trial_ends_at          := old.trial_ends_at;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.is_demo                := old.is_demo;
    new.user_id                := old.user_id;
  end if;
  return new;
end $$;

drop trigger if exists venues_protect_billing on venues;
create trigger venues_protect_billing
  before insert or update on venues
  for each row execute function protect_venue_billing();

-- ── 4. Functions the API should not expose ──────────────────────────────────
-- Trigger functions cannot usefully be called over the API, and the demo
-- roll-forward is for the scheduled job. is_venue_member, is_venue_admin and
-- viewer_is_demo stay callable: RLS policies run them as the requesting role.
revoke execute on function roll_forward_demo_events() from public, anon, authenticated;
revoke execute on function handle_auth_user_upsert()  from public, anon, authenticated;
revoke execute on function set_venue_demo_flag()      from public, anon, authenticated;
revoke execute on function get_venue_members(uuid)    from public, anon;
revoke execute on function add_venue_creator_as_admin() from public, anon, authenticated;
revoke execute on function protect_venue_billing()      from public, anon, authenticated;

-- ── 5. Event images: images only, size-capped, own folder ───────────────────
-- HEIC is allowed because it is what iPhones hand over; refusing it would
-- fail the upload rather than convert it.
update storage.buckets
   set file_size_limit    = 10 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp',
                                  'image/gif', 'image/heic', 'image/heif']
 where id = 'event-images';

drop policy if exists "event images: authenticated upload" on storage.objects;
create policy "event images: authenticated upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
