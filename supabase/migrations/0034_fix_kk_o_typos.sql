-- Typos in three «Ө» terms from the user's list (0033), corrected at the user's request.
-- Applied with: npx supabase db query --linked -f supabase/migrations/0034_fix_kk_o_typos.sql

begin;

update public.terms set kk = 'өрт сөндіру мүмкіндіктері' where kk = 'өрт сөндіру мүкіндіктері';
update public.terms set kk = 'өрт қауіпсіздігін қамтамасыз ету' where kk = 'өрт кауіпсіздігін қамтамасыз ету';
update public.terms set kk = 'өртке қарсы қабырға' where kk = 'өртке қарсы жасалған' and ru = 'противопожарная стена';

select kk, ru from public.terms
where ru in ('возможности по тушению пожара', 'обеспечение пожарной безопасности', 'противопожарная стена')
order by ru;

commit;
