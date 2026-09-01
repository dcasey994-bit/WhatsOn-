-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Free trial goes from 3 months to 12
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- The trial length is written down in three places and they have to agree:
--   • this column default (venues created by anything other than the app)
--   • registerVenue() in apps/web/src/data/eventsStore.js, which sets the date
--     explicitly on insert — it is what actually applies to a real signup
--   • the Terms of Service page, which is the promise being made
-- ════════════════════════════════════════════════════════════════════════════

alter table venues
  alter column trial_ends_at set default (now() + interval '12 months');

-- ── Venues already on a 3-month trial ────────────────────────────────────────
-- Extended rather than left alone: the Terms now say twelve months, and a venue
-- that signed up last week being archived after three would contradict that.
--
-- Measured from created_at, so everyone gets twelve months from when they
-- joined rather than twelve more from today. `greatest` means this can only
-- ever move a trial later — re-running it, or running it after someone has
-- been given a longer trial by hand, does not shorten anything.
--
-- Only touches rows still trialing. A venue already paying, or archived after
-- its trial ran out, is not silently put back on a free trial.

update venues
   set trial_ends_at = greatest(trial_ends_at, created_at + interval '12 months')
 where subscription_status = 'trialing';

-- ── Check ────────────────────────────────────────────────────────────────────
-- Every trialing venue should now end twelve months after it was created.

select id, name, created_at::date, trial_ends_at::date,
       round(extract(epoch from trial_ends_at - created_at) / 86400) as trial_days
  from venues
 where subscription_status = 'trialing'
 order by created_at;
