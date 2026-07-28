-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Fold Karaoke into Entertainment
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Karaoke in this area is mostly a bookable private room rather than a
-- scheduled night, so it doesn't work as a category on a date-filtered map.
-- It now lives under Entertainment alongside comedy, drag and cabaret.
--
-- Also retags the categories retired earlier ('theatre', 'jazz') so stored
-- data matches what the app displays, instead of relying on the fallback.
-- ════════════════════════════════════════════════════════════════════════════

update events set category = 'comedy' where category in ('karaoke', 'theatre');
update events set category = 'music'  where category = 'jazz';

-- Anything left on a category the app no longer knows about
select id, name, category
from events
where category not in ('music', 'comedy', 'quiz', 'sports');
