-- =============================================================
-- First batch of unofficial term variants (approved by the site owner,
-- 2026-10-03). Each official term is matched by its exact ru text in
-- public.terms; a variant whose term is missing is simply skipped.
-- Applied with: npx supabase db query --linked -f supabase/migrations/0022_term_variants_batch1.sql
-- =============================================================

insert into public.term_variants (term_id, lang, variant, note)
select distinct on (v.lang, lower(v.variant)) t.id, v.lang, v.variant, v.note
from (
  values
    ('ru', 'пожарный шланг', 'рукав пожарный', 'бытовое название'),
    ('ru', 'шланг пожарный', 'рукав пожарный', 'бытовое название'),
    ('ru', 'дымовой извещатель', 'извещатель пожарный дымовой', 'неполное название'),
    ('ru', 'датчик дыма', 'извещатель пожарный дымовой', 'бытовое название'),
    ('ru', 'пожарка', 'часть пожарная', 'жаргон'),
    ('ru', 'противопожарная безопасность', 'пожарная безопасность', 'частая ошибка'),
    ('ru', 'пожаробезопасность', 'пожарная безопасность', 'неофициальное слово'),
    ('ru', 'противопожарная опасность', 'пожарная опасность', 'частая ошибка'),
    ('ru', 'спасжилет', 'спасательный жилет', 'сокращение'),
    ('ru', 'дымоотсос', 'дымосос', 'искажённое слово'),
    ('ru', 'вертушка', 'вертолет', 'жаргон'),
    ('ru', 'потоп', 'наводнение', 'бытовое слово'),
    ('kk', 'пожарник', 'огнеборец', 'русское разговорное слово в казахском тексте')
) as v (lang, variant, official_ru, note)
join public.terms t on lower(t.ru) = lower(v.official_ru)
order by v.lang, lower(v.variant), t.id
on conflict do nothing;
