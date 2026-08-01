-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Special Offer field migration
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Adds an optional per-event promotion field (e.g. "2-for-1 drinks before 9pm")
-- that venues can post and customers see on the event page.
-- ════════════════════════════════════════════════════════════════════════════

alter table events add column if not exists special_offer text;
