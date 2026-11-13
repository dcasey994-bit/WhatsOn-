-- WhatsOn? — What venues need before we show them the app.
--
-- 1. Repeating events. A weekly quiz is one form, many rows: each date is an
--    ordinary event (so the map, lists and demo roll-forward need no changes)
--    and series_id ties them together so the venue can edit or delete the
--    rest of the run in one go.
--
-- 2. Numbers for venues. How many people opened, saved and are going to each
--    event. Saves are private rows, so the counts come from a function that
--    only answers a member of that venue. Views are a plain counter bumped by
--    the event page; the app skips repeat views from the same browser on the
--    same day, and views by the venue's own team are not counted.
--
-- 3. A fuller venue profile: cover photo, a short "about", Instagram and
--    opening hours. Free text for the hours on purpose — "Tue–Sun 12–late,
--    kitchen till 9" is how pubs actually describe themselves.
--
-- Safe to re-run.

-- ── 1. Repeating events ─────────────────────────────────────────────────────
alter table events add column if not exists series_id uuid;
create index if not exists events_series_id_idx on events (series_id) where series_id is not null;

-- ── 2. View counts ──────────────────────────────────────────────────────────
create table if not exists event_view_counts (
  event_id uuid primary key references events(id) on delete cascade,
  views    integer not null default 0
);

-- Nobody reads or writes the table directly; the two functions below do.
alter table event_view_counts enable row level security;
revoke all on event_view_counts from anon, authenticated;

create or replace function record_event_view(eid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  vid uuid;
begin
  select venue_id into vid from public.events where id = eid;
  if vid is null then return; end if;
  -- The venue checking its own listing is not an audience.
  if auth.uid() is not null and public.is_venue_member(vid) then return; end if;

  insert into public.event_view_counts (event_id, views) values (eid, 1)
  on conflict (event_id) do update set views = event_view_counts.views + 1;
end $$;

revoke execute on function record_event_view(uuid) from public;
grant  execute on function record_event_view(uuid) to anon, authenticated;

-- saved_events.event_id and going_events.event_id are text (they predate the
-- uuid ids), hence the casts.
create or replace function get_venue_event_stats(vid uuid)
returns table (event_id uuid, views integer, saves integer, going integer)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_venue_member(vid) then
    raise exception 'Only the venue''s team can see its numbers' using errcode = '42501';
  end if;

  return query
  select e.id,
         coalesce(vc.views, 0),
         (select count(*)::int from public.saved_events s where s.event_id = e.id::text),
         (select count(*)::int from public.going_events g where g.event_id = e.id::text)
    from public.events e
    left join public.event_view_counts vc on vc.event_id = e.id
   where e.venue_id = vid;
end $$;

revoke execute on function get_venue_event_stats(uuid) from public, anon;
grant  execute on function get_venue_event_stats(uuid) to authenticated;

-- ── 3. Venue profile ────────────────────────────────────────────────────────
alter table venues add column if not exists cover_image_url text;
alter table venues add column if not exists about           text;
alter table venues add column if not exists instagram       text;
alter table venues add column if not exists opening_hours   text;

alter table venues drop constraint if exists venues_about_length;
alter table venues add  constraint venues_about_length check (char_length(about) <= 500);
alter table venues drop constraint if exists venues_opening_hours_length;
alter table venues add  constraint venues_opening_hours_length check (char_length(opening_hours) <= 200);
-- Stored as the bare handle; the app builds the link.
alter table venues drop constraint if exists venues_instagram_handle;
alter table venues add  constraint venues_instagram_handle check (instagram ~ '^[A-Za-z0-9._]{1,30}$');
