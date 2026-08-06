-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Demo data seed
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run
-- (it clears and rebuilds all demo rows; live data is never touched).
--
-- PREREQUISITES
--   1. Run supabase/migrations/006_demo_mode.sql first.
--   2. Create the demo account: Authentication → Users → Add user
--      (email bob.67@hotmail.com), then sign in with it once so its
--      profile row exists.
--   3. update profiles set is_demo = true where email = 'bob.67@hotmail.com';
--
-- CONTENTS
--   32 venues · 62 weekly events · 7 past events
--   Balham · Clapham · Clapham Junction / Northcote Road · Tooting
--
-- ⚠ ABOUT THE DATA — READ BEFORE SHOWING THIS TO ANYONE
--   These are REAL pubs with REAL advertised event nights, compiled from
--   their own websites and listings sites. Nothing here is verified with
--   the venues, and listings go stale: a night may have moved, changed
--   price, or stopped entirely.
--
--   Treat it as illustrative, not authoritative. It is fine for showing
--   the app to someone; it is not fine to present as accurate what's-on
--   information, and it should never be promoted to live data without
--   checking each venue directly.
--
--   Phone numbers are deliberately left blank rather than guessed — a
--   wrong number against a real business is worse than none. Websites are
--   the venues' own, as published.
--
--   Where a venue advertises a night but not its start time, a plausible
--   time is used. Those are marked ~ in the comments below.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Helper: the next occurrence of a given weekday (0 = Sun … 6 = Sat) ──────
create or replace function demo_next_dow(target_dow int)
returns date language sql stable set search_path = public as $$
  select current_date + ((target_dow - extract(dow from current_date)::int + 7) % 7)
$$;

do $$
declare
  demo_user uuid;
begin
  select id into demo_user from profiles where email = 'bob.67@hotmail.com';
  if demo_user is null then
    raise exception
      'No profile for bob.67@hotmail.com. Create the account in Authentication → Users, sign in with it once, then re-run.';
  end if;

  delete from events        where venue_id in (select id from venues where is_demo);
  delete from venue_members where venue_id in (select id from venues where is_demo);
  delete from venues        where is_demo;

  -- ── Venues ────────────────────────────────────────────────────────────────
  insert into venues (name, address, lat, lng, phone, website, capacity, type,
                      user_id, is_demo, subscription_status, trial_ends_at)
  select v.name, v.address, v.lat, v.lng, null, v.website, v.capacity, v.type,
         demo_user, true, v.sub,
         case when v.sub = 'trialing' then now() + interval '2 months'
              else now() + interval '3 months' end
  from (values
    -- Balham
    ('The Bedford',          '77 Bedford Hill, Balham, SW12 9HD',                 51.4434, -0.1527, 'https://thebedford.com',              350, 'Pub',                    'active'),
    ('Balham Bowls Club',    '7-9 Ramsden Road, Balham, SW12 8QX',                51.4441, -0.1493, 'https://balhambowlsclub.com',        120, 'Pub',                    'active'),
    ('The Devonshire',       '39 Balham High Road, Balham, SW12 9AN',             51.4459, -0.1520, null,                                 160, 'Pub',                    'trialing'),
    ('The Nightingale',      '97 Nightingale Lane, Balham, SW12 8NX',             51.4479, -0.1560, 'https://thenightingalebalham.co.uk',  140, 'Pub',                    'active'),
    ('Exhibit Balham',       '12 Balham Station Road, Balham, SW12 9SG',          51.4433, -0.1525, 'https://theexhibit.co.uk',           200, 'Bar',                    'active'),
    ('The Regent',           '21 Chestnut Grove, Balham, SW12 8JB',               51.4448, -0.1543, 'https://theregentbalham.co.uk',      150, 'Pub',                    'trialing'),
    -- Clapham
    ('The Railway',          '18 Clapham High Street, Clapham, SW4 7UR',          51.4650, -0.1330, null,                                 180, 'Pub',                    'active'),
    ('Two Brewers',          '114 Clapham High Street, Clapham, SW4 7UJ',         51.4638, -0.1339, 'https://the2brewers.com',            250, 'Club',                   'active'),
    ('The Clapham Grand',    '21-25 St John''s Hill, SW11 1TT',                   51.4642, -0.1700, 'https://claphamgrand.com',           800, 'Theatre',                'active'),
    ('The Windmill',         'Windmill Drive, Clapham Common South Side, SW4 9DE',51.4598, -0.1445, 'https://windmillclapham.co.uk',      220, 'Pub',                    'active'),
    ('Clapham North',        '409 Clapham Road, SW9 9BT',                         51.4658, -0.1310, 'https://claphamnorthpub.co.uk',      200, 'Pub',                    'active'),
    ('The Alexandra',        '14 Clapham Common South Side, SW4 7AA',             51.4610, -0.1387, null,                                 240, 'Pub',                    'trialing'),
    ('Belle Vue',            '1 Clapham Common South Side, SW4 7AA',              51.4614, -0.1380, 'https://bellevueclapham.com',        180, 'Pub',                    'active'),
    ('The Bread & Roses',    '68 Clapham Manor Street, Clapham, SW4 6DZ',         51.4645, -0.1392, 'https://breadandrosespub.co.uk',     150, 'Pub',                    'active'),
    ('Venn Street Records',  '78 Venn Street, Clapham, SW4 0BD',                  51.4622, -0.1381, 'https://vennstreetrecords.com',      130, 'Bar',                    'active'),
    -- Clapham Junction, Battersea Rise & Northcote Road
    ('The Northcote',        'Northcote Road, SW11 1NT',                          51.4592, -0.1662, 'https://thenorthcote.co.uk',         190, 'Pub',                    'active'),
    ('Northcote Records',    '8-10 Northcote Road, SW11 1NT',                     51.4600, -0.1665, 'https://northcoterecords.com',       140, 'Bar',                    'active'),
    ('St John''s Tavern',    'St John''s Hill, SW11 1SA',                         51.4638, -0.1698, 'https://stjohnstavern.co.uk',        170, 'Pub',                    'trialing'),
    ('The Falcon',           '2 St John''s Hill, SW11 1RU',                       51.4645, -0.1704, null,                                 260, 'Pub',                    'active'),
    ('The Goat',             'Battersea Rise, SW11 1EE',                          51.4601, -0.1648, null,                                 150, 'Pub',                    'trialing'),
    -- Tooting
    ('Tooting Tavern',       'Tooting High Street, Tooting, SW17 0SF',            51.4278, -0.1685, 'https://thetootingtavern.co.uk',     170, 'Pub',                    'active'),
    ('The Trafalgar Arms',   '148-158 Tooting High Street, Tooting, SW17 0RT',    51.4285, -0.1690, 'https://thetrafalgararms.co.uk',     200, 'Pub',                    'active'),
    ('The Wheatsheaf',       '2 Upper Tooting Road, Tooting Bec, SW17 7TS',       51.4342, -0.1621, null,                                 180, 'Pub',                    'trialing'),
    ('Ramble Inn',           'Mitcham Road, Tooting, SW17 9JG',                   51.4269, -0.1662, null,                                 110, 'Pub',                    'active'),
    ('The Selkirk',          '60 Selkirk Road, Tooting, SW17 0ES',                51.4318, -0.1668, null,                                 160, 'Pub',                    'active'),
    ('Castle Tooting',       'Tooting High Street, Tooting, SW17 0RG',            51.4288, -0.1682, 'https://castletooting.com',          180, 'Pub',                    'trialing'),
    -- More SW11 (Battersea / Lavender Hill)
    ('The Thieves',          '51 Lavender Gardens, SW11 1DJ',                     51.4630, -0.1622, null,                                 170, 'Pub',                    'active'),
    ('The Crown',            '102 Lavender Hill, SW11 5RD',                       51.4661, -0.1610, null,                                 150, 'Pub',                    'trialing'),
    -- More SW4 (Clapham / Abbeville / Clapham North)
    ('The Abbeville',        'Abbeville Road, Clapham, SW4 9JW',                  51.4551, -0.1385, 'https://theabbeville.co.uk',         140, 'Pub',                    'active'),
    ('The Landor',           'Landor Road, Clapham, SW9 9PH',                     51.4661, -0.1215, 'https://thelandorpub.com',           160, 'Pub',                    'active'),
    ('The Nel',              'Clapham Common North Side, SW4 0QW',                51.4648, -0.1425, 'https://thenel.co.uk',               190, 'Pub',                    'active'),
    -- More SW12 (Balham / Clapham South)
    ('The Avalon',           '16 Balham Hill, Clapham South, SW12 9EB',           51.4506, -0.1487, 'https://theavalonlondon.com',        200, 'Pub',                    'active')
  ) as v(name, address, lat, lng, website, capacity, type, sub);

  -- ── Team access for the demo account ─────────────────────────────────────
  insert into venue_members (venue_id, user_id, role)
  select v.id, demo_user, m.role
  from (values
    ('The Bedford',         'admin'),
    ('The Clapham Grand',   'admin'),
    ('Venn Street Records', 'admin'),
    ('Tooting Tavern',      'events_manager')
  ) as m(venue_name, role)
  join venues v on v.name = m.venue_name and v.is_demo;

  -- ── Events ───────────────────────────────────────────────────────────────
  -- Each sits on its next occurrence of the advertised weekday. Times marked
  -- ~ were not published by the venue and are a plausible stand-in.
  insert into events (venue_id, name, category, date, time, price, capacity,
                      description, special_offer)
  select v.id, e.name, e.category, demo_next_dow(e.dow), e.time, e.price, e.capacity,
         e.description, e.offer
  from (values
    -- ── Monday ──────────────────────────────────────────────────────────────
    ('The Bedford',         'Monday Pop Quiz',            'quiz',   1, '20:00'::time,  2.50, 200, 'Long-running music, film and TV quiz at The Bedford. £2.50 to play, teams welcome.', null),
    ('The Railway',         'Comedy Bandits',             'comedy', 1, '19:30'::time,  0.00, 120, 'Free Monday stand-up from Comedy Bandits, with new material from acts working the London circuit.', 'Free entry'),
    ('The Goat',            'Monday Night Quiz',          'quiz',   1, '20:00'::time,  2.00, 110, 'The Goat''s Monday quiz on Battersea Rise. General knowledge rounds with a bar tab up for grabs.', null),  -- ~time
    ('The Falcon',          'Monday Night Football',      'sports', 1, '20:00'::time,  0.00, 200, 'Monday night Premier League on the screens at The Falcon, by Clapham Junction station.', null),  -- ~time
    -- ── Tuesday ─────────────────────────────────────────────────────────────
    ('Balham Bowls Club',   'Pub Quiz',                   'quiz',   2, '20:00'::time,  2.00, 100, 'Tuesday night quiz at the Bowls Club. £2 entry, teams of up to six.', null),
    ('The Devonshire',      'Tuesday Quiz',               'quiz',   2, '20:00'::time,  2.00, 130, 'Weekly Tuesday quiz at The Devonshire on Balham High Road.', null),  -- ~time
    ('The Railway',         'Tuesday Quiz Night',         'quiz',   2, '19:00'::time,  2.00, 140, 'Clapham High Street''s Tuesday quiz, with up to £100 in prizes across the night.', null),
    ('St John''s Tavern',   'Pub Quiz Tuesdays',          'quiz',   2, '20:00'::time,  2.00, 140, 'Quiz night with a £50 first prize, free drinks, bottles of wine and spot jackpots between rounds.', 'Spot jackpots between rounds'),  -- ~time
    ('Ramble Inn',          'Tuesday Quiz',               'quiz',   2, '20:00'::time,  2.00,  90, 'Tuesday quiz at the Ramble Inn with a hefty bar tab for the winning team.', null),  -- ~time
    ('Clapham North',       'Pub Quiz',                   'quiz',   2, '20:00'::time,  2.00, 150, 'Interactive quiz with music, sport and general knowledge rounds. £50 first, £20 second, £10 third.', null),  -- ~time
    ('Venn Street Records', 'Open Mic Night',             'music',  2, '20:00'::time,  0.00, 100, 'Open mic at Venn Street Records for anyone wanting to get up and play.', null),  -- ~time
    -- ── Wednesday ───────────────────────────────────────────────────────────
    ('Exhibit Balham',      'Balham Quiz',                'quiz',   3, '19:00'::time,  0.00, 160, 'Free weekly quiz at Exhibit, every Wednesday from 7pm.', 'Free entry'),
    ('The Nightingale',     'Quiz Night',                 'quiz',   3, '20:00'::time,  2.00, 110, 'General knowledge quiz hosted by a professional quizzer, every Wednesday at 8pm.', null),
    ('The Railway',         'Comedy Bandits',             'comedy', 3, '19:30'::time,  0.00, 120, 'The midweek Comedy Bandits show — free entry, four acts and a compere.', 'Free entry'),
    ('Tooting Tavern',      'Weekly Quiz',                'quiz',   3, '20:00'::time,  2.00, 140, '£2 a head with £100 in bar tab prizes and a weekly cash prize on top.', '£100 bar tab for the winners'),
    ('St John''s Tavern',   'Wing Wednesday',             'comedy', 3, '19:00'::time,  0.00, 140, 'Wings all night at St John''s Tavern, with the bar running late.', '£1 wings all night'),
    ('The Falcon',          'Wednesday Quiz',             'quiz',   3, '20:00'::time,  2.00, 200, 'General knowledge quiz at The Falcon, a Clapham Junction institution.', null),  -- ~time
    ('The Bread & Roses',   'Open Mic Night',             'music',  3, '20:00'::time,  0.00, 120, 'Weekly open mic at the union-owned Bread & Roses. Sign up at the bar.', null),  -- ~time
    -- ── Thursday ────────────────────────────────────────────────────────────
    ('The Regent',          'Quiz of Legends',            'quiz',   4, '20:00'::time,  2.50, 130, 'Bar tabs of £75, £50 and £25 for the top three teams. £2.50 per person to enter.', 'Bar tabs of £75, £50 and £25'),  -- ~day
    ('The Bread & Roses',   'Live Music Night',           'music',  4, '20:00'::time,  0.00, 130, 'Weekly live music in the back room of this award-winning Clapham pub.', null),  -- ~time
    ('The Wheatsheaf',      'Open Mic Night',             'music',  4, '20:00'::time,  0.00, 150, 'Open mic at The Wheatsheaf in Tooting Bec.', null),  -- ~time
    ('Northcote Records',   'Live Music Thursdays',       'music',  4, '20:00'::time,  0.00, 120, 'Live music at the record-themed bar just off Clapham Junction. Cocktails, keg beer and a big patio.', null),  -- ~time
    ('The Alexandra',       'Europa League Live',         'sports', 4, '20:00'::time,  0.00, 220, 'Thursday night European football across two projectors and five HD screens.', null),  -- ~time
    -- ── Friday ──────────────────────────────────────────────────────────────
    ('The Regent',          'Live Music Friday',          'music',  5, '21:00'::time,  0.00, 140, 'Live music every Friday from 9pm at The Regent in Balham.', null),
    ('The Devonshire',      'Friday Live Music',          'music',  5, '21:00'::time,  0.00, 150, 'Live music every Friday night at The Devonshire.', null),  -- ~time
    ('Clapham North',       'Friday Live Music',          'music',  5, '21:00'::time,  0.00, 180, 'Acoustic duos and solo artists playing indie, pop and rock hits every Friday.', null),  -- ~time
    ('Tooting Tavern',      'Live Music Friday',          'music',  5, '20:00'::time,  0.00, 160, 'A different local up-and-coming artist every Friday from 8pm.', null),
    ('The Wheatsheaf',      'Friday DJ Night',            'music',  5, '21:00'::time,  0.00, 170, 'DJs every Friday at The Wheatsheaf, Tooting Bec.', null),  -- ~time
    ('Venn Street Records', 'Friday Live Session',        'music',  5, '21:00'::time,  0.00, 120, 'Bands and DJs almost every night of the week — Friday is the busiest of them.', null),  -- ~time
    ('Northcote Records',   'Friday Night Live',          'music',  5, '21:00'::time,  0.00, 130, 'Rock bar vibes, live music and DJ sets on Northcote Road.', null),  -- ~time
    ('St John''s Tavern',   'Live Music Friday',          'music',  5, '21:00'::time,  0.00, 160, 'Rotating musicians playing live every Friday at St John''s Tavern.', null),  -- ~time
    ('Two Brewers',         'Friday Night Club',          'comedy', 5, '22:00'::time,  8.00, 230, 'Drag, disco and two dance floors, open late every Friday at Clapham''s longest-running cabaret club.', null),  -- ~time
    -- ── Saturday ────────────────────────────────────────────────────────────
    ('The Clapham Grand',   'Comedy Carnival',            'comedy', 6, '20:00'::time, 15.00, 700, 'The Grand''s weekly Saturday comedy night in a restored Victorian music hall.', null),  -- ~time
    ('Two Brewers',         'Saturday Night Drag Extravaganza','comedy',6,'21:00'::time, 10.00, 240, 'Show-stopping drag across two stages and two dance floors. Clapham institution since 1981.', null),  -- ~time
    ('The Regent',          'Live Music Saturday',        'music',  6, '21:00'::time,  0.00, 140, 'Live music every Saturday from 9pm.', null),
    ('The Windmill',        'Premier League Saturday',    'sports', 6, '15:00'::time,  0.00, 200, 'All the major fixtures shown on Clapham Common — Premier League, Six Nations and Wimbledon finals.', null),  -- ~time
    ('The Alexandra',       'Saturday Football',          'sports', 6, '15:00'::time,  0.00, 220, 'Two projectors, five massive HD screens and plenty of room for the Saturday kick-offs.', null),  -- ~time
    ('Belle Vue',           'Six Nations Live',           'sports', 6, '14:30'::time,  0.00, 160, 'Six Nations, Premier League and Champions League shown live on Clapham Common South Side.', null),  -- ~time
    ('The Northcote',       'Saturday Live Sport',        'sports', 6, '15:00'::time,  0.00, 170, 'A well-regarded live sport programme on Northcote Road, with the Saturday kick-offs across the screens.', null),  -- ~time
    ('Venn Street Records', 'Saturday Live Music',        'music',  6, '21:00'::time,  0.00, 120, 'Live bands and DJs on Venn Street, running late into the night.', null),  -- ~time
    ('Northcote Records',   'Saturday Night Live',        'music',  6, '21:00'::time,  0.00, 130, 'Live music and DJ sets every Saturday, with pizza served alongside.', null),  -- ~time
    ('St John''s Tavern',   'Live Music Saturday',        'music',  6, '21:00'::time,  0.00, 160, 'Live music every Saturday from a rotating cast of local musicians.', null),  -- ~time
    -- ── Sunday ──────────────────────────────────────────────────────────────
    ('The Windmill',        'Sunday Quiz',                'quiz',   0, '19:30'::time,  2.00, 180, 'Sunday evening quiz at The Windmill with a £50 bar tab for the winning team.', '£50 bar tab for first place'),
    ('The Trafalgar Arms',  'Sunday Quiz',                'quiz',   0, '19:30'::time,  2.00, 170, 'Weekly Sunday quiz from 7:30pm on Tooting High Street.', null),
    ('The Northcote',       'Sunday Night Pub Quiz',      'quiz',   0, '19:30'::time,  2.00, 160, 'Traditional pub quiz every Sunday from 7.30pm. £50 bar tab for first, and a bottle of wine for second to last.', '£50 bar tab for first place'),
    ('Two Brewers',         'The Power of Three',         'comedy', 0, '19:00'::time,  0.00, 220, 'Three drag acts every Sunday. Free entry before 7pm.', 'Free entry before 7pm'),
    ('Clapham North',       'Super Sunday Football',      'sports', 0, '16:30'::time,  0.00, 180, 'The Sunday afternoon fixtures across the screens at Clapham North.', null),  -- ~time
    -- ── Added on the SW4 / SW11 / SW12 / SW17 sweep ─────────────────────────
    ('The Avalon',          'Pub Quiz',                   'quiz',   1, '20:00'::time,  2.50, 170, 'Monday quiz at Clapham South. Teams of up to six, rounds on TV themes, mystery voices, music and pictures. £50 first prize.', '£50 first prize'),
    ('The Thieves',         'The Big Quiffy Quiz',        'quiz',   2, '20:00'::time,  2.50, 150, 'Lavender Gardens'' Tuesday quiz, running 8pm to 10:30pm. £2.50 per person.', null),
    ('The Abbeville',       'Pub Quiz',                   'quiz',   2, '20:00'::time,  2.00, 120, 'Weekly quiz at the only pub on Abbeville Road.', null),  -- ~day
    ('The Crown',           'Pub Quiz',                   'quiz',   3, '20:00'::time,  2.50, 130, 'Quiz night at The Crown on Lavender Hill. £2.50 to play.', null),  -- ~day
    ('The Landor',          'Quiz Night',                 'quiz',   3, '20:00'::time,  2.00, 140, 'Regular quiz night at The Landor, a Clapham pub with a theatre upstairs.', null),  -- ~day
    ('Castle Tooting',      'Wednesday Quiz',             'quiz',   3, '20:00'::time,  2.00, 160, 'Long-running Wednesday quiz at the Castle in Tooting.', null),  -- ~time
    ('The Selkirk',         'Pub Quiz',                   'quiz',   4, '20:00'::time,  2.00, 140, 'Thursday quiz at this Victorian two-bar pub, with a large walled garden out the back.', null),
    ('The Abbeville',       'Comedy Night',               'comedy', 4, '20:00'::time,  8.00, 110, 'Regular comedy evenings alongside the wine tastings and quizzes at The Abbeville.', null),  -- ~day
    ('The Abbeville',       'Live Music',                 'music',  5, '20:00'::time,  0.00, 120, 'Live music at The Abbeville, Clapham.', null),  -- ~day
    ('The Landor',          'Karaoke Night',              'comedy', 5, '21:00'::time,  0.00, 140, 'Karaoke with a difference — recently picked out by Time Out.', null),  -- ~day
    ('The Avalon',          'Friday DJs',                 'music',  5, '21:00'::time,  0.00, 180, 'DJs from 9pm through to 1am every Friday.', null),
    ('The Landor',          'Live Music & DJs',           'music',  6, '21:00'::time,  0.00, 150, 'Live music and DJ sets at The Landor.', null),  -- ~day
    ('The Avalon',          'Saturday DJs',               'music',  6, '21:00'::time,  0.00, 180, 'DJs from 9pm through to 1am every Saturday.', null),
    ('The Nel',             'Saturday Live Sport',        'sports', 6, '15:00'::time,  0.00, 170, 'The Saturday fixtures across the screens, with a terrace overlooking Clapham Common.', null),  -- ~time
    ('The Nel',             'Quiz of Legends',            'quiz',   0, '19:00'::time,  2.00, 170, 'Quiz of Legends every Sunday night from 7pm at The Nel.', null)
  ) as e(venue_name, name, category, dow, time, price, capacity, description, offer)
  join venues v on v.name = e.venue_name and v.is_demo;

  -- ── Past events ──────────────────────────────────────────────────────────
  -- Earlier instances of the same weekly nights, so the venue-side Past
  -- Events tab has history without inventing events that never happened.
  -- Dated beyond the 7-day window the roll-forward job sweeps.
  insert into events (venue_id, name, category, date, time, price, capacity, description)
  select v.id, e.name, e.category, current_date - e.days_ago, e.time, e.price, e.capacity, e.description
  from (values
    ('The Bedford',         'Monday Pop Quiz',      'quiz',   14, '20:00'::time,  2.50, 200, 'Long-running music, film and TV quiz at The Bedford.'),
    ('Venn Street Records', 'Saturday Live Music',  'music',  19, '21:00'::time,  0.00, 120, 'Live bands and DJs on Venn Street, running late into the night.'),
    ('The Clapham Grand',   'Comedy Carnival',      'comedy', 23, '20:00'::time, 15.00, 700, 'The Grand''s weekly Saturday comedy night in a restored Victorian music hall.'),
    ('Tooting Tavern',      'Weekly Quiz',          'quiz',   28, '20:00'::time,  2.00, 140, '£2 a head with £100 in bar tab prizes and a weekly cash prize on top.'),
    ('The Bedford',         'Monday Pop Quiz',      'quiz',   35, '20:00'::time,  2.50, 200, 'Long-running music, film and TV quiz at The Bedford.'),
    ('Venn Street Records', 'Open Mic Night',       'music',  40, '20:00'::time,  0.00, 100, 'Open mic at Venn Street Records for anyone wanting to get up and play.'),
    ('The Clapham Grand',   'Comedy Carnival',      'comedy', 47, '20:00'::time, 15.00, 700, 'The Grand''s weekly Saturday comedy night in a restored Victorian music hall.')
  ) as e(venue_name, name, category, days_ago, time, price, capacity, description)
  join venues v on v.name = e.venue_name and v.is_demo;

  raise notice 'Demo data seeded: % venues, % upcoming events, % past events',
    (select count(*) from venues where is_demo),
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
