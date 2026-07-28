-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Demo data seed
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run
-- (it clears and rebuilds all demo rows; live data is never touched).
--
-- PREREQUISITES
--   1. Run supabase-migration-demo-mode.sql first.
--   2. Create the demo account: Authentication → Users → Add user
--      (email demo@whatsonapp.uk), then sign in with it once so its
--      profile row exists.
--   3. update profiles set is_demo = true where email = 'demo@whatsonapp.uk';
--
-- ABOUT THE DATA
--   Venue names are fictional. Streets and coordinates are real South London
--   so the map looks right, but no real business is named or described — a
--   demo row can never misrepresent an actual pub.
--
--   Event patterns are modelled on how South London pubs genuinely programme:
--   quizzes Mon–Thu at £2–£2.50 with bar-tab prizes, live music Fri–Sat,
--   drag and cabaret at weekends, sport around fixtures.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Helper: the next occurrence of a given weekday (0 = Sun … 6 = Sat) ──────
-- Events are stored on a real date, so everything downstream (day strip,
-- upcoming/past split, sorting) works unchanged.

create or replace function demo_next_dow(target_dow int)
returns date language sql stable set search_path = public as $$
  select current_date + ((target_dow - extract(dow from current_date)::int + 7) % 7)
$$;

do $$
declare
  demo_user uuid;
begin
  select id into demo_user from profiles where email = 'demo@whatsonapp.uk';
  if demo_user is null then
    raise exception
      'No profile for demo@whatsonapp.uk. Create the account in Authentication → Users, sign in with it once, then re-run.';
  end if;

  -- Clear previous demo rows. Events and members cascade from venues, but
  -- delete explicitly so the intent is obvious.
  delete from events        where venue_id in (select id from venues where is_demo);
  delete from venue_members where venue_id in (select id from venues where is_demo);
  delete from venues        where is_demo;

  -- ── Venues ────────────────────────────────────────────────────────────────
  insert into venues (name, address, lat, lng, phone, website, capacity, type,
                      user_id, is_demo, subscription_status, trial_ends_at)
  select v.name, v.address, v.lat, v.lng, v.phone, v.website, v.capacity, v.type,
         demo_user, true, v.sub,
         case when v.sub = 'trialing' then now() + interval '2 months'
              else now() + interval '3 months' end
  from (values
    -- Balham
    ('The Hopfield Arms',      '42 Bedford Hill, Balham, SW12 9RG',           51.4421, -0.1498, '020 7946 0114', 'https://example.com/hopfield',  180, 'Pub & Live Music Venue', 'active'),
    ('The Gilded Ferret',      '8 Chestnut Grove, Balham, SW12 8JB',          51.4448, -0.1543, '020 7946 0221', null,                            120, 'Bar',                    'trialing'),
    ('Nightjar & Crown',       '96 Balham High Road, Balham, SW12 9AA',       51.4459, -0.1521, '020 7946 0338', 'https://example.com/nightjar',  200, 'Pub',                    'active'),
    -- Clapham
    ('The Velvet Antler',      '27 Clapham High Street, Clapham, SW4 7TR',    51.4638, -0.1339, '020 7946 0445', null,                            150, 'Bar',                    'active'),
    ('The Paper Lantern',      '5 Venn Street, Clapham, SW4 0AT',             51.4622, -0.1381, '020 7946 0552', 'https://example.com/lantern',   220, 'Live Music Venue',       'active'),
    ('Hartley''s Social',      '61 Clapham Manor Street, Clapham, SW4 6DZ',   51.4645, -0.1392, '020 7946 0669', null,                            160, 'Pub',                    'trialing'),
    ('The Brass Monkey Rooms', '3 The Pavement, Clapham, SW4 0HY',            51.4610, -0.1387, '020 7946 0776', 'https://example.com/brass',     300, 'Club',                   'active'),
    -- Tooting
    ('The Copper Kettle Tavern','88 Tooting High Street, Tooting, SW17 0RN',  51.4278, -0.1685, '020 7946 0883', null,                            140, 'Pub',                    'active'),
    ('Marlowe''s Tap Room',    '21 Mitcham Road, Tooting, SW17 9PA',          51.4269, -0.1662, '020 7946 0990', 'https://example.com/marlowes',  110, 'Bar',                    'trialing'),
    ('The Rowan Tree',         '14 Upper Tooting Road, Tooting Bec, SW17 7PG',51.4342, -0.1621, '020 7946 1007', null,                            190, 'Pub',                    'active')
  ) as v(name, address, lat, lng, phone, website, capacity, type, sub);

  -- ── Team access for the demo account ─────────────────────────────────────
  -- Admin on two venues, Events Manager on a third, and not a member of the
  -- rest — so My Venues shows both roles while the map stays fully populated.
  insert into venue_members (venue_id, user_id, role)
  select v.id, demo_user, m.role
  from (values
    ('The Hopfield Arms',        'admin'),
    ('The Paper Lantern',        'admin'),
    ('The Copper Kettle Tavern', 'events_manager')
  ) as m(venue_name, role)
  join venues v on v.name = m.venue_name and v.is_demo;

  -- ── Upcoming events — one row per weekly slot ────────────────────────────
  -- Each sits on its next occurrence, so the 7-day strip shows every one
  -- exactly once. The roll-forward job below keeps them there.
  insert into events (venue_id, name, category, date, time, price, capacity,
                      description, special_offer)
  select v.id, e.name, e.category, demo_next_dow(e.dow), e.time, e.price, e.capacity,
         e.description, e.offer
  from (values
    -- Monday
    ('The Hopfield Arms',       'Monday Pop Quiz',            'quiz',   1, '20:00'::time,  2.50,  80, 'Six rounds of music, film and telly, run by a quizmaster with strong opinions about one-hit wonders. Teams of up to six. Winners take the bar tab.', 'Quiz teams get 2-for-1 on house pints'),
    ('The Velvet Antler',       'Comedy Cellar Mondays',      'comedy', 1, '19:30'::time,  0.00,  70, 'Free stand-up in the downstairs room. Four acts working on new material, plus a compere holding it together. Doors 7pm, show 7:30pm.', null),
    -- Tuesday
    ('Nightjar & Crown',        'The Big Tuesday Quiz',       'quiz',   2, '20:00'::time,  2.00, 120, 'The neighbourhood''s most competitive quiz. Seven rounds, a picture round nobody can ever finish, and a rolling jackpot.', null),
    ('The Paper Lantern',       'Open Mic Tuesdays',          'music',  2, '19:30'::time,  0.00, 100, 'Sign-up from 7pm, first act on at 7:30. Backline provided — bring a guitar and a couple of songs. All levels welcome.', null),
    ('The Brass Monkey Rooms',  'Champions League Live',      'sports', 2, '20:00'::time,  0.00, 250, 'Every midweek European tie across the big screens, with sound on for the main game. Kitchen open until late.', 'Pints £4 while the football is on'),
    -- Wednesday
    ('The Copper Kettle Tavern','Wednesday Quiz Night',       'quiz',   3, '20:00'::time,  2.00,  90, 'A proper pub quiz — general knowledge, music, and a wipeout round that has ended friendships. £100 bar tab for first place.', null),
    ('The Gilded Ferret',       'Midweek Karaoke',            'comedy', 3, '21:00'::time,  0.00,  90, 'Thousands of songs, two microphones and no judgement. Turn up alone or bring the whole office.', 'House doubles £5 all night'),
    ('Hartley''s Social',       'Acoustic Wednesdays',        'music',  3, '20:00'::time,  0.00,  80, 'Stripped-back sets from local songwriters in the front bar. Quiet enough to actually listen.', null),
    -- Thursday
    ('The Rowan Tree',          'Thursday Quiz',              'quiz',   4, '19:30'::time,  2.00, 100, 'Long-running Thursday fixture. Six rounds, cash prize for the winners and a booby prize nobody wants.', null),
    ('Marlowe''s Tap Room',     'Drag Bingo Thursdays',       'comedy', 4, '20:30'::time,  5.00,  90, 'Bingo as it was never intended. Hosted with considerable flair, prizes range from generous to insulting.', 'Free shot with every full house'),
    ('The Hopfield Arms',       'Thursday Night Football',    'sports', 4, '19:45'::time,  0.00, 140, 'Europa League and Conference League ties on the big screen in the back bar, sound on.', null),
    -- Friday
    ('The Paper Lantern',       'Friday Live: Indie Night',   'music',  5, '21:00'::time,  8.00, 200, 'Three bands, one room, no gaps. A reliable place to catch something good six months before everyone else does.', null),
    ('The Velvet Antler',       'Friday Night Cabaret',       'comedy', 5, '21:00'::time, 10.00, 130, 'Cabaret, drag and variety in the upstairs room. Big voices, bigger costumes, late bar.', null),
    ('Nightjar & Crown',        'Karaoke Fridays',            'comedy', 5, '21:30'::time,  0.00, 150, 'Friday night, two rooms, one songbook. Runs until the small hours or until the neighbours complain.', 'House doubles £5 before 9pm'),
    ('The Copper Kettle Tavern','Live Band Friday',           'music',  5, '20:30'::time,  0.00, 120, 'A different local band every week — soul, funk, indie, whatever turns up. Always free in.', null),
    ('The Brass Monkey Rooms',  'Friday Night DJs',           'music',  5, '22:00'::time,  6.00, 280, 'House, disco and garage across two floors until 3am. Guest DJs most weeks.', null),
    -- Saturday
    ('The Brass Monkey Rooms',  'Premier League Saturday',    'sports', 6, '15:00'::time,  0.00, 260, 'The 3pm kick-offs plus the late game across every screen. Get there early for a table.', 'Pints £4 during all live football'),
    ('The Paper Lantern',       'Saturday Headliners',        'music',  6, '20:00'::time, 12.00, 220, 'The main event of the week. Touring acts and the occasional secret warm-up show.', null),
    ('The Gilded Ferret',       'Saturday Night Drag Revue',  'comedy', 6, '21:00'::time,  8.00, 110, 'Three performers, two shows, one very long night. Book ahead — it sells out most weeks.', null),
    ('Hartley''s Social',       'Six Nations Live',           'sports', 6, '14:30'::time,  0.00, 150, 'Every Six Nations fixture shown with sound on, plus a pie and a pint deal at half time.', 'Pie and a pint £12 during rugby'),
    ('The Rowan Tree',          'Saturday Sessions',          'music',  6, '20:00'::time,  0.00, 160, 'Live music in the back room from 8pm. Folk, blues and whatever else the landlord has booked.', null),
    -- Sunday
    ('The Hopfield Arms',       'Sunday Quiz & Roast',        'quiz',   0, '19:30'::time,  2.50, 120, 'Roast first, quiz after. Gentler than the Monday quiz and considerably better fed.', 'Quiz entry free with a Sunday roast'),
    ('Marlowe''s Tap Room',     'Sunday Jazz Brunch',         'music',  0, '13:00'::time,  0.00, 100, 'A trio in the corner, bottomless coffee and the papers. The civilised end of the weekend.', null),
    ('The Velvet Antler',       'Super Sunday Football',      'sports', 0, '16:30'::time,  0.00, 140, 'The Sunday afternoon fixtures on every screen, with the big game on the projector.', null),
    ('The Copper Kettle Tavern','Sunday Night Comedy',        'comedy', 0, '19:00'::time,  5.00, 110, 'Five acts, one room and a compere who has seen it all. A soft landing before Monday.', null)
  ) as e(venue_name, name, category, dow, time, price, capacity, description, offer)
  join venues v on v.name = e.venue_name and v.is_demo;

  -- ── Past events — so the Past Events tab is not empty ────────────────────
  -- Dated well over a week back, which keeps the roll-forward job (below)
  -- from sweeping them into the future.
  insert into events (venue_id, name, category, date, time, price, capacity, description)
  select v.id, e.name, e.category, current_date - e.days_ago, e.time, e.price, e.capacity, e.description
  from (values
    ('The Hopfield Arms', 'Summer Garden Party',            'music',  35, '14:00'::time,  0.00, 180, 'An all-dayer in the beer garden with three bands, a barbecue and considerably better weather than forecast.'),
    ('The Hopfield Arms', 'Bank Holiday Quiz Special',      'quiz',   21, '19:30'::time,  5.00, 120, 'Double-length quiz with a £250 prize pot. Twelve rounds and one very long tie-break.'),
    ('The Paper Lantern', 'Album Launch: The Tessellations','music',  28, '20:00'::time, 10.00, 220, 'Hometown launch show for the new record, played front to back with a string section.'),
    ('The Paper Lantern', 'Late Night Soul Social',         'music',  14, '22:00'::time,  7.00, 200, 'Northern soul and rare groove on 45s until 3am.'),
    ('The Copper Kettle Tavern','Charity Quiz Night',       'quiz',   42, '19:30'::time,  5.00,  90, 'Annual fundraiser for the local food bank. Raised £1,840 across the night.')
  ) as e(venue_name, name, category, days_ago, time, price, capacity, description)
  join venues v on v.name = e.venue_name and v.is_demo;

  raise notice 'Demo data seeded: % venues, % events',
    (select count(*) from venues where is_demo),
    (select count(*) from events e join venues v on v.id = e.venue_id where v.is_demo);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Roll-forward — keeps the demo permanently "this week"
--
-- Any demo event that has just gone past jumps forward whole weeks, so it
-- lands on the same weekday. IDs never change, so shared demo links keep
-- working. Only events within the last 7 days are swept, which leaves the
-- older past-events archive exactly where it is.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function roll_forward_demo_events()
returns void language sql security definer set search_path = public as $$
  update events e
     set date = e.date + (ceil((current_date - e.date)::numeric / 7) * 7)::int
    from venues v
   where v.id = e.venue_id
     and v.is_demo
     and e.date < current_date
     and e.date >= current_date - 7;
$$;

-- Schedule it daily at 04:00 UTC.
-- Requires pg_cron: Database → Extensions → enable "pg_cron" (or run the
-- create extension below). Re-running is safe — the job is unscheduled first.
create extension if not exists pg_cron;

select cron.unschedule('whatson-demo-rollforward')
where exists (select 1 from cron.job where jobname = 'whatson-demo-rollforward');

select cron.schedule(
  'whatson-demo-rollforward',
  '0 4 * * *',
  $$ select roll_forward_demo_events(); $$
);

-- Run it once now so nothing is sitting in the past straight after seeding.
select roll_forward_demo_events();
