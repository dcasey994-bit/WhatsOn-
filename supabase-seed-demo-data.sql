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
-- CONTENTS
--   16 venues · 50 weekly events · 10 past events
--
-- ABOUT THE DATA
--   Venue names are fictional. Streets and coordinates are real South London
--   so the map looks right, but no real business is named or described — a
--   demo row can never misrepresent an actual pub.
--
--   Event patterns are modelled on how South London pubs genuinely programme:
--   quizzes Mon–Thu at £2–£2.50 with bar-tab prizes, live music Fri–Sat,
--   drag and cabaret at weekends, sport around real kick-off slots.
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
    ('The Hopfield Arms',       '42 Bedford Hill, Balham, SW12 9RG',            51.4421, -0.1498, '020 7946 0114', 'https://example.com/hopfield',  180, 'Pub & Live Music Venue', 'active'),
    ('The Gilded Ferret',       '8 Chestnut Grove, Balham, SW12 8JB',           51.4448, -0.1543, '020 7946 0221', null,                            120, 'Bar',                    'trialing'),
    ('Nightjar & Crown',        '96 Balham High Road, Balham, SW12 9AA',        51.4459, -0.1521, '020 7946 0338', 'https://example.com/nightjar',  200, 'Pub',                    'active'),
    ('The Larkspur',            '17 Ramsden Road, Balham, SW12 8QX',            51.4436, -0.1476, '020 7946 1114', 'https://example.com/larkspur',  140, 'Bar',                    'active'),
    ('Bellweather & Sons',      '55 Balham Grove, Balham, SW12 8AZ',            51.4467, -0.1554, '020 7946 1221', null,                            170, 'Pub',                    'trialing'),
    -- Clapham
    ('The Velvet Antler',       '27 Clapham High Street, Clapham, SW4 7TR',     51.4638, -0.1339, '020 7946 0445', null,                            150, 'Bar',                    'active'),
    ('The Paper Lantern',       '5 Venn Street, Clapham, SW4 0AT',              51.4622, -0.1381, '020 7946 0552', 'https://example.com/lantern',   220, 'Live Music Venue',       'active'),
    ('Hartley''s Social',       '61 Clapham Manor Street, Clapham, SW4 6DZ',    51.4645, -0.1392, '020 7946 0669', null,                            160, 'Pub',                    'trialing'),
    ('The Brass Monkey Rooms',  '3 The Pavement, Clapham, SW4 0HY',             51.4610, -0.1387, '020 7946 0776', 'https://example.com/brass',     300, 'Club',                   'active'),
    ('The Crooked Compass',     '112 Clapham Park Road, Clapham, SW4 7BZ',      51.4599, -0.1341, '020 7946 1338', null,                            185, 'Pub',                    'active'),
    ('Sable & Vine',            '9 Old Town, Clapham, SW4 0JT',                 51.4632, -0.1425, '020 7946 1445', 'https://example.com/sable',     105, 'Bar',                    'active'),
    -- Tooting
    ('The Copper Kettle Tavern','88 Tooting High Street, Tooting, SW17 0RN',    51.4278, -0.1685, '020 7946 0883', null,                            140, 'Pub',                    'active'),
    ('Marlowe''s Tap Room',     '21 Mitcham Road, Tooting, SW17 9PA',           51.4269, -0.1662, '020 7946 0990', 'https://example.com/marlowes',  110, 'Bar',                    'trialing'),
    ('The Rowan Tree',          '14 Upper Tooting Road, Tooting Bec, SW17 7PG', 51.4342, -0.1621, '020 7946 1007', null,                            190, 'Pub',                    'active'),
    ('The Thornbury Arms',      '73 Garratt Lane, Tooting, SW17 0PD',           51.4301, -0.1712, '020 7946 1552', null,                            155, 'Pub',                    'trialing'),
    ('The Ninth Wave',          '30 Trinity Road, Tooting Bec, SW17 7RE',       51.4365, -0.1648, '020 7946 1669', 'https://example.com/ninthwave', 240, 'Live Music Venue',       'active')
  ) as v(name, address, lat, lng, phone, website, capacity, type, sub);

  -- ── Team access for the demo account ─────────────────────────────────────
  -- Admin on three venues, Events Manager on a fourth, and not a member of
  -- the rest — so My Venues shows both roles and the multi-venue flow while
  -- the map stays fully populated with venues they do not manage.
  insert into venue_members (venue_id, user_id, role)
  select v.id, demo_user, m.role
  from (values
    ('The Hopfield Arms',        'admin'),
    ('The Paper Lantern',        'admin'),
    ('The Ninth Wave',           'admin'),
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
    -- ── Monday ──────────────────────────────────────────────────────────────
    ('The Hopfield Arms',       'Monday Pop Quiz',           'quiz',   1, '20:00'::time,  2.50,  80, 'Six rounds of music, film and telly, run by a quizmaster with strong opinions about one-hit wonders. Teams of up to six.', 'Quiz teams get 2-for-1 on house pints'),
    ('The Velvet Antler',       'Comedy Cellar Mondays',     'comedy', 1, '19:30'::time,  0.00,  70, 'Free stand-up in the downstairs room. Four acts working on new material, plus a compere holding it together.', null),
    ('The Larkspur',            'Monday Night Jazz',         'music',  1, '20:00'::time,  0.00,  90, 'A resident trio playing standards and the occasional bossa nova. No cover, no fuss, just a good way to start the week.', null),
    ('Bellweather & Sons',      'The Locals'' Quiz',         'quiz',   1, '19:30'::time,  2.00, 110, 'Unpretentious Monday quiz for regulars and anyone who wanders in. Cash prize plus a bottle for the wooden spoon.', null),
    ('The Crooked Compass',     'Monday Night Football',     'sports', 1, '20:00'::time,  0.00, 150, 'The Monday night fixture on the big screen with sound on, and the kitchen open until the final whistle.', 'Burger and a pint £14 during the match'),
    ('The Ninth Wave',          'Songwriters'' Circle',      'music',  1, '19:00'::time,  0.00, 120, 'Four writers, one room, songs in the round with the stories behind them. Quiet room, proper listening crowd.', null),
    -- ── Tuesday ─────────────────────────────────────────────────────────────
    ('Nightjar & Crown',        'The Big Tuesday Quiz',      'quiz',   2, '20:00'::time,  2.00, 120, 'The neighbourhood''s most competitive quiz. Seven rounds, a picture round nobody can ever finish, and a rolling jackpot.', null),
    ('The Paper Lantern',       'Open Mic Tuesdays',         'music',  2, '19:30'::time,  0.00, 100, 'Sign-up from 7pm, first act on at 7:30. Backline provided — bring a guitar and a couple of songs.', null),
    ('The Brass Monkey Rooms',  'Champions League Live',     'sports', 2, '20:00'::time,  0.00, 250, 'Every midweek European tie across the big screens, with sound on for the main game. Kitchen open late.', 'Pints £4 while the football is on'),
    ('The Thornbury Arms',      'Tuesday Quiz',              'quiz',   2, '19:30'::time,  2.00, 100, 'Six rounds and a bar tab for the winners. Arrive by 7:15 if you want a table near the fire.', null),
    ('Sable & Vine',            'Vinyl Tuesdays',            'music',  2, '19:00'::time,  0.00,  75, 'Bring a record, play a side. The bar''s deck is open to anyone with something worth hearing.', 'Half-price carafes for anyone who brings a record'),
    ('The Crooked Compass',     'Quiz of Legends',           'quiz',   2, '20:00'::time,  2.50, 140, 'Long-running Tuesday institution. Bar tabs of £75, £50 and £25 for the top three, and a general knowledge round that gets genuinely hard.', null),
    ('Marlowe''s Tap Room',     'Comedy Basement',           'comedy', 2, '20:00'::time,  0.00,  80, 'Free comedy in the cellar bar. New material night, so expect the occasional glorious failure.', null),
    -- ── Wednesday ───────────────────────────────────────────────────────────
    ('The Copper Kettle Tavern','Wednesday Quiz Night',      'quiz',   3, '20:00'::time,  2.00,  90, 'A proper pub quiz — general knowledge, music, and a wipeout round that has ended friendships. £100 bar tab for first.', null),
    ('The Gilded Ferret',       'Midweek Karaoke',           'comedy', 3, '21:00'::time,  0.00,  90, 'Thousands of songs, two microphones and no judgement. Turn up alone or bring the whole office.', 'House doubles £5 all night'),
    ('Hartley''s Social',       'Acoustic Wednesdays',       'music',  3, '20:00'::time,  0.00,  80, 'Stripped-back sets from local songwriters in the front bar. Quiet enough to actually listen.', null),
    ('The Larkspur',            'Wednesday Quiz',            'quiz',   3, '19:30'::time,  2.00, 100, 'Seven rounds, teams of up to six, and a quizmaster who takes the music round far too seriously.', null),
    ('The Rowan Tree',          'Bingo Night',               'comedy', 3, '20:00'::time,  3.00, 130, 'Bingo with the volume turned up — confetti, terrible dance breaks and prizes that range from generous to insulting.', 'Free house shot with a full house'),
    ('The Ninth Wave',          'Midweek Sessions',          'music',  3, '20:30'::time,  0.00, 160, 'Two support acts and a headliner, all local, all free. The room where half of South London''s bands played first.', null),
    ('Bellweather & Sons',      'Champions League Live',     'sports', 3, '20:00'::time,  0.00, 150, 'Midweek European football across four screens, with the main game on the projector in the back bar.', null),
    -- ── Thursday ────────────────────────────────────────────────────────────
    ('The Rowan Tree',          'Thursday Quiz',             'quiz',   4, '19:30'::time,  2.00, 100, 'Long-running Thursday fixture. Six rounds, cash prize for the winners and a booby prize nobody wants.', null),
    ('Marlowe''s Tap Room',     'Drag Bingo Thursdays',      'comedy', 4, '20:30'::time,  5.00,  90, 'Bingo as it was never intended. Hosted with considerable flair, prizes range from generous to insulting.', 'Free shot with every full house'),
    ('The Hopfield Arms',       'Thursday Night Football',   'sports', 4, '19:45'::time,  0.00, 140, 'Europa and Conference League ties on the big screen in the back bar, sound on.', null),
    ('Sable & Vine',            'Thursday Wine & Song',      'music',  4, '19:30'::time,  0.00,  70, 'A guitarist in the corner and something interesting open by the glass. The gentle end of the week.', null),
    ('The Crooked Compass',     'Open Mic Thursdays',        'music',  4, '19:30'::time,  0.00, 120, 'Open mic with a proper PA and a sound engineer who cares. Sign-up sheet goes out at 7pm sharp.', null),
    ('The Thornbury Arms',      'Karaoke Thursdays',         'comedy', 4, '21:00'::time,  0.00, 110, 'Ten thousand songs and a room that will carry you if the key gets away from you. Runs until close.', 'House doubles £5 before 10pm'),
    ('The Paper Lantern',       'New Band Night',            'music',  4, '20:00'::time,  5.00, 180, 'Three unsigned bands, thirty minutes each. Cheap in, loud out, and occasionally you catch something before anyone else.', null),
    -- ── Friday ──────────────────────────────────────────────────────────────
    ('The Paper Lantern',       'Friday Live: Indie Night',  'music',  5, '21:00'::time,  8.00, 200, 'Three bands, one room, no gaps. A reliable place to catch something good six months before everyone else does.', null),
    ('The Velvet Antler',       'Friday Night Cabaret',      'comedy', 5, '21:00'::time, 10.00, 130, 'Cabaret, drag and variety in the upstairs room. Big voices, bigger costumes, late bar.', null),
    ('Nightjar & Crown',        'Karaoke Fridays',           'comedy', 5, '21:30'::time,  0.00, 150, 'Friday night, two rooms, one songbook. Runs until the small hours or until the neighbours complain.', 'House doubles £5 before 9pm'),
    ('The Copper Kettle Tavern','Live Band Friday',          'music',  5, '20:30'::time,  0.00, 120, 'A different local band every week — soul, funk, indie, whatever turns up. Always free in.', null),
    ('The Brass Monkey Rooms',  'Friday Night DJs',          'music',  5, '22:00'::time,  6.00, 280, 'House, disco and garage across two floors until 3am. Guest DJs most weeks.', null),
    ('The Larkspur',            'Friday Comedy Club',        'comedy', 5, '20:00'::time,  7.00, 120, 'Four acts and a compere, one of whom you will have seen on the telly. Book ahead, it goes quickly.', null),
    ('The Ninth Wave',          'Friday Headline Show',      'music',  5, '20:30'::time, 10.00, 230, 'The big one. Touring bands on the way up, plus a local support act chosen by the venue.', null),
    ('Bellweather & Sons',      'Friday Live Music',         'music',  5, '21:00'::time,  0.00, 160, 'Covers, singalongs and a band that knows exactly what a Friday night crowd wants. Free entry.', 'Two-for-one cocktails until 9pm'),
    -- ── Saturday ────────────────────────────────────────────────────────────
    ('The Brass Monkey Rooms',  'Premier League Saturday',   'sports', 6, '15:00'::time,  0.00, 260, 'The 3pm kick-offs plus the late game across every screen. Get there early for a table.', 'Pints £4 during all live football'),
    ('The Paper Lantern',       'Saturday Headliners',       'music',  6, '20:00'::time, 12.00, 220, 'The main event of the week. Touring acts and the occasional secret warm-up show.', null),
    ('The Gilded Ferret',       'Saturday Night Drag Revue', 'comedy', 6, '21:00'::time,  8.00, 110, 'Three performers, two shows, one very long night. Book ahead — it sells out most weeks.', null),
    ('Hartley''s Social',       'Six Nations Live',          'sports', 6, '14:30'::time,  0.00, 150, 'Every Six Nations fixture shown with sound on, plus a pie and a pint deal at half time.', 'Pie and a pint £12 during rugby'),
    ('The Rowan Tree',          'Saturday Sessions',         'music',  6, '20:00'::time,  0.00, 160, 'Live music in the back room from 8pm. Folk, blues and whatever else the landlord has booked.', null),
    ('The Crooked Compass',     'Saturday Comedy Carnival',  'comedy', 6, '20:00'::time,  9.00, 170, 'The biggest comedy night in the area. Circuit headliners plus a surprise guest who is often very well known indeed.', null),
    ('Sable & Vine',            'Saturday Soul Night',       'music',  6, '21:00'::time,  5.00,  95, 'Northern soul, rare groove and vintage funk on 45s. Small room, big sound, dancing more or less compulsory.', null),
    ('The Thornbury Arms',      'Rugby & Roasts',            'sports', 6, '16:45'::time,  0.00, 140, 'The late afternoon rugby on every screen, with roasts served right through the match.', 'Roast and a pint £15 during the game'),
    -- ── Sunday ──────────────────────────────────────────────────────────────
    ('The Hopfield Arms',       'Sunday Quiz & Roast',       'quiz',   0, '19:30'::time,  2.50, 120, 'Roast first, quiz after. Gentler than the Monday quiz and considerably better fed.', 'Quiz entry free with a Sunday roast'),
    ('Marlowe''s Tap Room',     'Sunday Jazz Brunch',        'music',  0, '13:00'::time,  0.00, 100, 'A trio in the corner, bottomless coffee and the papers. The civilised end of the weekend.', null),
    ('The Velvet Antler',       'Super Sunday Football',     'sports', 0, '16:30'::time,  0.00, 140, 'The Sunday afternoon fixtures on every screen, with the big game on the projector.', null),
    ('The Copper Kettle Tavern','Sunday Night Comedy',       'comedy', 0, '19:00'::time,  5.00, 110, 'Five acts, one room and a compere who has seen it all. A soft landing before Monday.', null),
    ('The Larkspur',            'Sunday Drag Brunch',        'comedy', 0, '13:00'::time, 15.00, 120, 'Two hours of drag, bottomless fizz and a menu you will barely have time to eat. Booking essential.', 'Bottomless fizz included with every ticket'),
    ('The Ninth Wave',          'Sunday Open Decks',         'music',  0, '18:00'::time,  0.00, 140, 'Bring a USB or a bag of records and take a thirty-minute slot. Everyone from first-timers to residents.', null),
    ('Bellweather & Sons',      'Sunday Quiz',               'quiz',   0, '19:30'::time,  2.00, 120, 'The week''s last quiz, and the friendliest. Seven rounds, a bar tab for the winners, done by half nine.', null)
  ) as e(venue_name, name, category, dow, time, price, capacity, description, offer)
  join venues v on v.name = e.venue_name and v.is_demo;

  -- ── Past events — so the Past Events tab is not empty ────────────────────
  -- All on venues the demo account manages, and dated well over a week back
  -- so the roll-forward job (below) leaves them where they are.
  insert into events (venue_id, name, category, date, time, price, capacity, description)
  select v.id, e.name, e.category, current_date - e.days_ago, e.time, e.price, e.capacity, e.description
  from (values
    ('The Hopfield Arms',        'Summer Garden Party',             'music',  14, '14:00'::time,  0.00, 180, 'An all-dayer in the beer garden with three bands, a barbecue and considerably better weather than forecast.'),
    ('The Paper Lantern',        'Late Night Soul Social',          'music',  17, '22:00'::time,  7.00, 200, 'Northern soul and rare groove on 45s until 3am.'),
    ('The Hopfield Arms',        'Bank Holiday Quiz Special',       'quiz',   21, '19:30'::time,  5.00, 120, 'Double-length quiz with a £250 prize pot. Twelve rounds and one very long tie-break.'),
    ('The Ninth Wave',           'Battle of the Bands Final',       'music',  24, '19:00'::time,  6.00, 240, 'Six months of heats came down to four bands and a very loud vote from the floor.'),
    ('The Paper Lantern',        'Album Launch: The Tessellations', 'music',  28, '20:00'::time, 10.00, 220, 'Hometown launch show for the new record, played front to back with a string section.'),
    ('The Copper Kettle Tavern', 'Cup Final Screening',             'sports', 33, '15:00'::time,  0.00, 140, 'Every screen on, the garden speakers rigged up and a queue out the door by half past two.'),
    ('The Ninth Wave',           'Acoustic Evening with Nora Vale', 'music',  38, '20:00'::time,  9.00, 180, 'A sold-out solo set, entirely unplugged, with the bar closed during songs.'),
    ('The Copper Kettle Tavern', 'Charity Quiz Night',              'quiz',   42, '19:30'::time,  5.00,  90, 'Annual fundraiser for the local food bank. Raised £1,840 across the night.'),
    ('The Hopfield Arms',        'Beer Festival Weekend',           'music',  49, '12:00'::time,  0.00, 180, 'Twenty guest ales, four bands over two days and a queue at the bar that never quite cleared.'),
    ('The Paper Lantern',        'Comedy Gala Fundraiser',          'comedy', 56, '19:30'::time, 12.00, 210, 'Eight comics donating their time for the local hospice. Overran by an hour, nobody minded.')
  ) as e(venue_name, name, category, days_ago, time, price, capacity, description)
  join venues v on v.name = e.venue_name and v.is_demo;

  raise notice 'Demo data seeded: % venues, % events (% upcoming, % past)',
    (select count(*) from venues where is_demo),
    (select count(*) from events e join venues v on v.id = e.venue_id where v.is_demo),
    (select count(*) from events e join venues v on v.id = e.venue_id where v.is_demo and e.date >= current_date),
    (select count(*) from events e join venues v on v.id = e.venue_id where v.is_demo and e.date <  current_date);
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
