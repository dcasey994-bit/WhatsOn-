-- ════════════════════════════════════════════════════════════════════════════
-- WhatsOn? — Venue website field migration
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Adds an optional venue website URL, shown as a clickable link on the
-- venue's public profile page.
-- ════════════════════════════════════════════════════════════════════════════

alter table venues add column if not exists website text;
