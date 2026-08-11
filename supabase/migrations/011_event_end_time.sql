-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Optional end time on an event
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Nullable on purpose: plenty of nights genuinely have no advertised finish,
-- and forcing a guess is worse than saying nothing.
--
-- No constraint that end_time > time. An end earlier than the start means the
-- event runs past midnight — a club night at 22:00–03:00 — which is the normal
-- case rather than an error, and the app reads it that way.
-- ════════════════════════════════════════════════════════════════════════════

alter table events add column if not exists end_time time;
