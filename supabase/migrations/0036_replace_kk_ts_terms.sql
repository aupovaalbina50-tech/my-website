-- =============================================================
-- Terms on «Ц» (Kazakh): the 3 old cards are replaced by the 13 terms the
-- user sent («Адия буква Ц-13 + англ.docx», kk / ru / en). Copy of the old
-- cards: supabase/backups/terms_kk_TS_2026-10-05.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Ц» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0036_replace_kk_ts_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'циклдік қозғалыс', 'движение циклическое', 'cyclic motion', 'industrial_safety'),
  (2, 'циркуляциялық су', 'вода циркуляционная', 'circulating water', 'industrial_safety'),
  (3, 'цилиндрлер бастиегі', 'головка цилиндров', 'cylinder head', 'industrial_safety'),
  (4, 'циркуляциялық арна', 'циркуляционный канал', 'circulation channel', 'industrial_safety'),
  (5, 'цистерна', 'цистерна', 'tank', 'industrial_safety'),
  (6, 'цифр', 'цифра', 'digit', 'coordination'),
  (7, 'цифрлық бейнеақпарат', 'цифровая видеоинформация', 'digital video information', 'alerting_comms'),
  (8, 'цифрлық навигациялық карта', 'цифровая навигационная карта', 'digital navigation map', 'coordination'),
  (9, 'ценоэкожүйе климаты', 'климат ценоэкосистемы', 'climate of the cenoecosystem', 'industrial_safety'),
  (10, 'цифрлық сигнал', 'цифровой сигнал', 'digital signal', 'alerting_comms'),
  (11, 'цифрлық түрлендіру', 'цифровые преобразования', 'digital transformations', 'alerting_comms'),
  (12, 'циркуляциялық сорғы', 'насос циркуляционный', 'circulation pump', 'industrial_safety'),
  (13, 'цифрлық мемлекетке өту', 'переход в цифровое государство', 'transition to a digital state', 'coordination');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Ц';

-- One old card per new term with the same Kazakh text (the first one).
create temp table keep_map on commit drop as
select distinct on (n.n) n.n, o.id
from new_o n join old_o o on lower(trim(o.kk)) = n.kk
order by n.n, o.id;

delete from keep_map k using keep_map k2 where k.id = k2.id and k.n > k2.n;

update public.terms t set kk = n.kk, ru = n.ru, en = n.en, category = n.category
from keep_map k join new_o n on n.n = k.n
where t.id = k.id;

delete from public.terms t using old_o o
where t.id = o.id and t.id not in (select id from keep_map);

insert into public.terms (kk, ru, en, category)
select kk, ru, en, category from new_o where n not in (select n from keep_map) order by n;

select (select count(*) from keep_map) as updated_in_place,
       (select count(*) from new_o) - (select count(*) from keep_map) as inserted,
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Ц') as ts_now,
       (select count(*) from public.terms) as terms_now;

commit;
