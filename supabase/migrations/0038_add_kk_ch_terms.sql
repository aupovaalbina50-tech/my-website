-- Terms on «Ч» (Kazakh): there were none; the 4 terms the user sent
-- («Адия буква Ч-4 + англ.docx», kk / ru / en) are added.
-- Applied with: npx supabase db query --linked -f supabase/migrations/0038_add_kk_ch_terms.sql

begin;

insert into public.terms (kk, ru, en, category) values
  ('чартер', 'чартер', 'charter', 'coordination'),
  ('чартер-партия', 'чартер-партия', 'charter party', 'coordination'),
  ('чартерлік рейс', 'чартерный рейс', 'charter flight', 'coordination'),
  ('чартер, жалдау шарт', 'чартер', 'charter; charter agreement; charter contract', 'coordination');

select (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Ч') as ch_now,
       (select count(*) from public.terms) as terms_now;

commit;
