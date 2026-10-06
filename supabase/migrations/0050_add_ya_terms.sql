-- Terms on «Я»: there were none; the 36 terms the user sent
-- («я- 36+англ.docx», kk / ru / en) are added.
-- Applied with: npx supabase db query --linked -f supabase/migrations/0050_add_ya_terms.sql

begin;

insert into public.terms (kk, ru, en, category)
select v.kk, v.ru, v.en, v.category
from (values
  ('ядролық жарылыс түрлері', 'виды ядерных взрывов', 'types of nuclear explosions', 'civil_defense'),
  ('ядролық соғыс', 'война ядерная', 'nuclear war', 'civil_defense'),
  ('ядро заряды', 'заряд ядра', 'nuclear charge', 'civil_defense'),
  ('ядролық жарылыстарды белгілеу', 'засечка ядерных взрывов', 'nuclear detonation detection', 'civil_defense'),
  ('ядроның бөлінуі', 'разделение ядер', 'nuclear fission', 'industrial_safety'),
  ('ядролық жарылыстың соққы толқыны', 'ударная волна ядерного взрыва', 'nuclear blast wave', 'civil_defense'),
  ('ядролық реакцияның энергетикалық шығымы', 'энергетический выход ядерной реакции', 'nuclear energy yield', 'industrial_safety'),
  ('ядроның байланыс энергиясы', 'энергия связи ядра', 'nuclear binding energy', 'industrial_safety'),
  ('ядролық авария', 'ядерная авария', 'nuclear accident', 'emergencies'),
  ('ядролық қауіпсіздік', 'ядерная безопасность', 'nuclear safety', 'industrial_safety'),
  ('ядролы бомба', 'ядерная бомба', 'nuclear bomb', 'civil_defense'),
  ('ядролы мина', 'ядерная мина', 'nuclear mine', 'civil_defense'),
  ('ядролық реакция', 'ядерная реакция', 'nuclear reaction', 'industrial_safety'),
  ('ядролық физика', 'ядерная физика', 'nuclear physics', 'industrial_safety'),
  ('ядролық электроника', 'ядерная электроника', 'nuclear electronics', 'industrial_safety'),
  ('ядролық энергетика', 'ядерная энергетика', 'nuclear power, nuclear energy industry', 'industrial_safety'),
  ('ядролық энергетикалық қондырғы', 'ядерная энергетическая установка', 'nuclear power plant, nuclear propulsion plant', 'industrial_safety'),
  ('ядролық энергия', 'ядерная энергия', 'nuclear energy, atomic energy', 'industrial_safety'),
  ('ядролы-миналық бөгеттер', 'ядерно-минные заграждения', 'nuclear landmines, atomic demolition munitions (ADMs)', 'civil_defense'),
  ('ядролық жарылғыш зат', 'ядерное взрывчатое вещество', 'nuclear explosive material', 'civil_defense'),
  ('ядролық уақыт', 'ядерное время', 'nuclear time', 'coordination'),
  ('ядролық сәулешығару', 'ядерное излучение', 'nuclear radiation', 'industrial_safety'),
  ('ядролық қару', 'ядерное оружие', 'nuclear weapons', 'civil_defense'),
  ('ядролық қарусыздану', 'ядерное разоружение', 'nuclear disarmament', 'civil_defense'),
  ('ядролық сақтандыру', 'ядерное страхование', 'nuclear insurance', 'coordination'),
  ('ядролық отын', 'ядерное топливо', 'nuclear fuel', 'industrial_safety'),
  ('ядролық күштер', 'ядерные силы', 'nuclear forces', 'civil_defense'),
  ('ядролы оқ-дәрі', 'ядерный боеприпас', 'nuclear weapon', 'civil_defense'),
  ('ядролық жарылыс', 'ядерный взрыв', 'nuclear explosion', 'civil_defense'),
  ('ядролық заряд', 'ядерный заряд', 'nuclear warhead', 'civil_defense'),
  ('ядролық парамагнетизм', 'ядерный парамагнетизм', 'nuclear paramagnetism', 'industrial_safety'),
  ('ядролық реактор', 'ядерный реактор', 'nuclear reactor', 'industrial_safety'),
  ('ядро шырыны', 'ядерный сок', 'nucleoplasm, nuclear sap', 'industrial_safety'),
  ('ядро', 'ядро', 'nucleus', 'industrial_safety'),
  ('ядрошық', 'ядрышко', 'nucleolus', 'industrial_safety'),
  ('ярлык', 'ярлык', 'label, shortcut, tag', 'coordination')
) as v(kk, ru, en, category)
where not exists (select 1 from public.terms t where lower(t.kk) = v.kk and lower(t.ru) = v.ru);

select (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Я') as ya_now,
       (select count(*) from public.terms) as terms_now;

commit;
