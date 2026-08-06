-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Retire the two "Live Music Venue" types
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- 'Pub & Live Music Venue' and 'Live Music Venue' described what a venue
-- programmes rather than what it is, and the events already carry that. A pub
-- that puts bands on is a pub, so it now says so.
--
-- The two venues typed 'Live Music Venue' are reclassified by name because
-- they are not the same kind of place: the Grand is a Grade II listed variety
-- theatre, Venn Street Records a bar. Anything else still on that type falls
-- to 'Bar', which is what the app resolves it to.
-- ════════════════════════════════════════════════════════════════════════════

update venues set type = 'Pub'     where type = 'Pub & Live Music Venue';

update venues set type = 'Theatre' where type = 'Live Music Venue' and name = 'The Clapham Grand';
update venues set type = 'Bar'     where type = 'Live Music Venue';

-- Anything left on a type the app no longer offers
select id, name, type
from venues
where type is not null
  and type not in ('Pub', 'Bar', 'Club', 'Theatre', 'Comedy Club', 'Restaurant', 'Other');
