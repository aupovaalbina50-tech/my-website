-- Terms on Russian «Ю»: there were none; the 3 terms the user sent
-- («ю- 3+англ.docx», kk / ru / en) are added.
-- Applied with: npx supabase db query --linked -f supabase/migrations/0042_add_ru_yu_terms.sql

begin;

insert into public.terms (kk, ru, en, category)
select v.kk, v.ru, v.en, v.category
from (values
  ('ювениль суы', 'воды ювениальные', 'juvenile waters', 'industrial_safety'),
  ('заңдық құзыры', 'юрисдикция', 'jurisdiction', 'coordination'),
  ('юриспруденция', 'юриспруденция', 'jurisprudence', 'coordination')
) as v(kk, ru, en, category)
where not exists (select 1 from public.terms t where lower(t.kk) = v.kk and lower(t.ru) = v.ru);

select (select count(*) from public.terms where upper(left(trim(ru), 1)) = 'Ю') as ru_yu_now,
       (select count(*) from public.terms) as terms_now;

commit;
