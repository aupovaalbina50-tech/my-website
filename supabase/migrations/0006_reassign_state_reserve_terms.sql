-- =============================================================
-- Reassign terms from the removed "state_reserve" category
--
-- The "Государственный резерв" / "Мемлекеттік резерв" category was
-- removed from the site (see src/i18n/translations.js CATEGORIES).
-- Any existing terms tagged with it are moved to "coordination"
-- (Управление и координация), the closest remaining category.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

update public.terms
set category = 'coordination'
where category = 'state_reserve';
