-- =============================================================
-- Knowledge base of «Рапортты құрастыру» (RAG): МЧС РК terminology,
-- legal definitions with their exact source, and rules for service documents.
--
--   kb_sources  documents an entry rests on, with a priority:
--               1 internal base of the site · 2 normative legal act of RK ·
--               3 official state information resource · 4 other verified source
--   kb_entries  one piece of knowledge: kk / ru / en, definition, source +
--               clause (only when actually known), status official /
--               needs_review / outdated, category, embedding for semantic search
--
-- Every row of public.terms is mirrored here automatically (trigger), so a
-- term added to the glossary is used by the report at the next analysis.
-- Embeddings are filled in by the smart-report Edge Function for rows whose
-- embedding is null (new or changed rows) — no manual step.
-- Nothing below is invented: legal definitions are the verbatim texts already
-- on the site («Не путать» page, checked on adilet.zan.kz 2026-10-02); rules
-- for document wording are marked needs_review because no act is cited.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0030_knowledge_base.sql
-- =============================================================

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.kb_sources (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title_ru text not null,
  title_kk text,
  doc_number text,
  doc_date date,
  url text,
  priority smallint not null check (priority between 1 and 4),
  status text not null default 'official' check (status in ('official', 'needs_review', 'outdated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kb_sources is
  'Sources of the knowledge base; priority 1 internal base, 2 normative act of RK, 3 state resource, 4 other verified.';

create table if not exists public.kb_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('term', 'definition', 'norm', 'phrase', 'rule', 'template', 'position', 'other')),
  category text not null check (category in (
    'fire_safety', 'civil_protection', 'civil_defense', 'emergencies', 'rescue_ops', 'fire_equipment',
    'baf', 'forces', 'evacuation', 'coordination', 'documents', 'terminology', 'regulations', 'ranks', 'tactics')),
  title text not null,
  kk text,
  ru text,
  en text,
  definition_ru text,
  definition_kk text,
  source_id uuid references public.kb_sources (id) on delete set null,
  clause text,
  status text not null default 'needs_review' check (status in ('official', 'needs_review', 'outdated')),
  term_id uuid unique references public.terms (id) on delete cascade,
  is_active boolean not null default true,
  supersedes_id uuid references public.kb_entries (id) on delete set null,
  search_text text not null default '',
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kb_entries is
  'Knowledge base entries used by «Рапортты құрастыру» (retrieval before every AI step).';

create index if not exists kb_entries_active_idx on public.kb_entries (is_active, status);
create index if not exists kb_entries_search_trgm_idx on public.kb_entries using gin (search_text extensions.gin_trgm_ops);
create index if not exists kb_entries_embedding_idx on public.kb_entries using hnsw (embedding extensions.vector_cosine_ops);

-- search_text / updated_at follow the content; a changed text drops the
-- embedding so it is recomputed at the next analysis.
create or replace function public.kb_entries_prepare()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := lower(concat_ws(' ', new.title, new.ru, new.kk, new.en, new.definition_ru, new.definition_kk));
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.search_text is distinct from old.search_text then
    new.embedding := null;
  end if;
  return new;
end;
$$;

drop trigger if exists kb_entries_prepare on public.kb_entries;
create trigger kb_entries_prepare
  before insert or update on public.kb_entries
  for each row execute function public.kb_entries_prepare();

create or replace function public.kb_sources_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kb_sources_touch on public.kb_sources;
create trigger kb_sources_touch
  before update on public.kb_sources
  for each row execute function public.kb_sources_touch();

-- ---- glossary terms are mirrored into the knowledge base -------------------
create or replace function public.kb_category_of(term_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case term_category
    when 'fire_safety' then 'fire_safety'
    when 'civil_defense' then 'civil_defense'
    when 'emergencies' then 'emergencies'
    when 'rescue_ops' then 'rescue_ops'
    when 'evacuation' then 'evacuation'
    when 'alerting_comms' then 'coordination'
    when 'coordination' then 'coordination'
    when 'disaster_medicine' then 'rescue_ops'
    else 'terminology'
  end
$$;

create or replace function public.kb_sync_term()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    return old; -- kb_entries.term_id cascades
  end if;
  insert into public.kb_entries (kind, category, title, kk, ru, en, source_id, status, term_id)
  values (
    'term', public.kb_category_of(new.category), coalesce(nullif(new.ru, ''), new.kk, new.en),
    new.kk, new.ru, new.en,
    (select id from public.kb_sources where code = 'site-glossary'), 'official', new.id)
  on conflict (term_id) do update
    set category = excluded.category, title = excluded.title, kk = excluded.kk, ru = excluded.ru, en = excluded.en;
  return new;
end;
$$;

drop trigger if exists kb_sync_term on public.terms;
create trigger kb_sync_term
  after insert or update on public.terms
  for each row execute function public.kb_sync_term();

-- ---- retrieval -------------------------------------------------------------
-- Semantic: nearest entries by embedding. Lexical fallback: trigram
-- similarity, used when embeddings are unavailable. Outdated / inactive rows
-- never come back; higher-priority sources win ties.
create or replace function public.kb_match(query_embedding extensions.vector(768), match_count int default 8, min_similarity float default 0.55)
returns table (
  id uuid, kind text, category text, title text, kk text, ru text, en text,
  definition_ru text, definition_kk text, clause text, status text, term_id uuid,
  source_title text, source_number text, source_date date, source_url text, source_priority smallint,
  similarity float
)
language sql
stable
set search_path = ''
as $$
  select e.id, e.kind, e.category, e.title, e.kk, e.ru, e.en, e.definition_ru, e.definition_kk, e.clause, e.status, e.term_id,
         s.title_ru, s.doc_number, s.doc_date, s.url, s.priority,
         1 - (e.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.kb_entries e
  left join public.kb_sources s on s.id = e.source_id
  where e.is_active and e.status <> 'outdated' and e.embedding is not null
    and 1 - (e.embedding operator(extensions.<=>) query_embedding) >= min_similarity
  order by e.embedding operator(extensions.<=>) query_embedding, s.priority nulls last
  limit match_count
$$;

create or replace function public.kb_search_text(query text, match_count int default 8)
returns table (
  id uuid, kind text, category text, title text, kk text, ru text, en text,
  definition_ru text, definition_kk text, clause text, status text, term_id uuid,
  source_title text, source_number text, source_date date, source_url text, source_priority smallint,
  similarity float
)
language sql
stable
set search_path = ''
as $$
  with scored as (
    select e.*, greatest(
      extensions.word_similarity(lower(coalesce(e.ru, '')), lower(query)),
      extensions.word_similarity(lower(coalesce(e.kk, '')), lower(query))
    ) as sim
    from public.kb_entries e
    where e.is_active and e.status <> 'outdated' and (coalesce(e.ru, '') <> '' or coalesce(e.kk, '') <> '')
  )
  select e.id, e.kind, e.category, e.title, e.kk, e.ru, e.en, e.definition_ru, e.definition_kk, e.clause, e.status, e.term_id,
         s.title_ru, s.doc_number, s.doc_date, s.url, s.priority, e.sim
  from scored e
  left join public.kb_sources s on s.id = e.source_id
  where e.sim >= 0.6
  order by e.sim desc, length(coalesce(e.ru, e.kk)) desc, s.priority nulls last
  limit match_count
$$;

-- ---- row level security: everyone reads, admins write ----------------------
alter table public.kb_sources enable row level security;
alter table public.kb_entries enable row level security;

drop policy if exists "Anyone can view kb_sources" on public.kb_sources;
create policy "Anyone can view kb_sources" on public.kb_sources for select using (true);
drop policy if exists "Admins can manage kb_sources" on public.kb_sources;
create policy "Admins can manage kb_sources" on public.kb_sources for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Anyone can view kb_entries" on public.kb_entries;
create policy "Anyone can view kb_entries" on public.kb_entries for select using (true);
drop policy if exists "Admins can manage kb_entries" on public.kb_entries;
create policy "Admins can manage kb_entries" on public.kb_entries for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ---- seed: sources -----------------------------------------------------------
insert into public.kb_sources (code, title_ru, title_kk, priority, status)
values ('site-glossary', 'Терминологическая база сайта (внутренняя база)', 'Сайттың терминологиялық базасы (ішкі база)', 1, 'official')
on conflict (code) do nothing;

insert into public.kb_sources (code, title_ru, title_kk, doc_number, doc_date, url, priority, status)
values
  ('Z1400000188', 'Закон Республики Казахстан «О гражданской защите»', '«Азаматтық қорғау туралы» Қазақстан Республикасының Заңы', '№ 188-V', '2014-04-11', 'https://adilet.zan.kz/rus/docs/Z1400000188', 2, 'official'),
  ('Z030000387_', 'Закон Республики Казахстан «О чрезвычайном положении»', '«Төтенше жағдай туралы» Қазақстан Республикасының Заңы', '№ 387-II', '2003-02-08', 'https://adilet.zan.kz/rus/docs/Z030000387_', 2, 'official'),
  ('V2100024045', 'Технический регламент «Общие требования к пожарной безопасности» (приказ МЧС РК)', '«Өрт қауіпсіздігіне қойылатын жалпы талаптар» техникалық регламенті (ҚР ТЖМ бұйрығы)', '№ 405', '2021-08-17', 'https://adilet.zan.kz/rus/docs/V2100024045', 2, 'official'),
  ('V1700015430', 'Правила организации тушения пожаров (приказ МВД РК)', 'Өрт сөндіруді ұйымдастыру қағидалары (ҚР ІІМ бұйрығы)', '№ 446', '2017-06-26', 'https://adilet.zan.kz/rus/docs/V1700015430', 2, 'official'),
  ('V14C0010151', 'Правила организации системы оповещения гражданской защиты (приказ МВД РК)', 'Азаматтық қорғаудың хабарлау жүйесін ұйымдастыру қағидалары (ҚР ІІМ бұйрығы)', '№ 945', '2014-12-26', 'https://adilet.zan.kz/rus/docs/V14C0010151', 2, 'official')
on conflict (code) do nothing;

-- ---- seed: every glossary term ------------------------------------------------
insert into public.kb_entries (kind, category, title, kk, ru, en, source_id, status, term_id)
select 'term', public.kb_category_of(t.category), coalesce(nullif(t.ru, ''), t.kk, t.en), t.kk, t.ru, t.en,
       (select id from public.kb_sources where code = 'site-glossary'), 'official', t.id
from public.terms t
on conflict (term_id) do nothing;

-- ---- seed: legal definitions (verbatim, with the exact citation) ---------------
insert into public.kb_entries (kind, category, title, kk, ru, definition_ru, definition_kk, source_id, clause, status)
select v.kind, v.category, v.title, v.kk, v.ru, v.def_ru, v.def_kk, s.id, v.clause, 'official'
from (values
  ('definition', 'emergencies', 'Чрезвычайная ситуация', 'Төтенше жағдай', 'Чрезвычайная ситуация', 'Обстановка на определённой территории, сложившаяся в результате аварии, пожара, вредного воздействия опасных производственных факторов, опасного природного явления, катастрофы, стихийного или иного бедствия, которые могут повлечь или повлекли за собой человеческие жертвы, вред здоровью людей или окружающей среде, значительный материальный ущерб и нарушение условий жизнедеятельности людей.', 'адам шығынына, адамдардың денсаулығына немесе қоршаған ортаға зиян келтіруге, елеулі материалдық нұқсанға және адамдардың тыныс-тіршілігі жағдайларының бұзылуына әкеп соғуы мүмкін немесе әкеп соққан аварияның, өрттің, қауіпті өндірістік факторлардың зиянды әсерінің, қауіпті табиғи құбылыстың, апаттың, дүлей немесе өзге де зілзаланың салдарынан қалыптасқан белгілі бір аумақтағы жағдай.', 'Z1400000188', 'ст. 1, пп. 66'),
  ('definition', 'emergencies', 'Чрезвычайное положение', 'Төтенше жағдай', 'Чрезвычайное положение', 'Временная мера, применяемая исключительно в интересах обеспечения безопасности граждан и защиты основ конституционного строя Республики Казахстан и представляющая собой особый правовой режим деятельности государственных органов, организаций, допускающий установление отдельных ограничений прав и свобод граждан, иностранных граждан и лиц без гражданства, а также прав юридических лиц и возлагающий на них дополнительные обязанности.', 'азаматтардың қауіпсіздігін қамтамасыз ету және Қазақстан Республикасының конституциялық құрылыс негіздерін қорғау мүдделерінде ғана қолданылатын және азаматтардың, шетел азаматтарының және азаматтығы жоқ адамдардың құқықтары мен бостандықтарына, сондай-ақ заңды тұлғалардың құқықтарына жекелеген шектеулер белгілеуге жол беретін және оларға қосымша міндеттер жүктейтін, мемлекеттік органдар, ұйымдар қызметінің ерекше құқықтық режимі болып табылатын уақытша шара.', 'Z030000387_', 'ст. 1, пп. 5; ст. 5'),
  ('definition', 'fire_safety', 'Возгорание', 'Жану', 'Возгорание', 'Начало горения под действием источника зажигания.', 'от алу көзінің әсерінен өртене бастауы.', 'V2100024045', 'п. 5, пп. 10'),
  ('definition', 'fire_safety', 'Пожар', 'Өрт', 'Пожар', 'Неконтролируемое горение, создающее угрозу, причиняющее вред жизни и здоровью людей, материальный ущерб физическим и юридическим лицам, интересам общества и государства.', 'адамдардың өмірі мен денсаулығына қатер төндіретін, зиян келтіретін, жеке және заңды тұлғаларға, қоғам мен мемлекет мүдделеріне материалдық нұқсан келтіретін бақылаусыз жану.', 'Z1400000188', 'ст. 1, пп. 54'),
  ('definition', 'emergencies', 'Авария', 'Авария', 'Авария', 'Разрушение зданий, сооружений и (или) технических устройств, неконтролируемые взрыв и (или) выброс опасных веществ.', 'ғимараттардың, құрылыстардың және (немесе) техникалық құрылғылардың қирауы, бақыланбайтын жарылыс және (немесе) қауіпті заттардың шығарындысы.', 'Z1400000188', 'ст. 1, пп. 1 и 66'),
  ('definition', 'emergencies', 'Инцидент', 'Оқыс оқиға', 'Инцидент', 'Отказ или повреждение технических устройств, применяемых на опасном производственном объекте, отклонение от параметров, обеспечивающих безопасность ведения технологического процесса, не приведшие к аварии.', 'аварияға алып келмеген, қауіпті өндірістік объектіде қолданылатын техникалық құрылғылардың істен шығуы немесе бүлінуі, технологиялық процесті жүргізудің қауіпсіздігін қамтамасыз ететін параметрлерден ауытқу.', 'Z1400000188', 'ст. 1, пп. 1 и 48'),
  ('definition', 'civil_defense', 'Гражданская оборона', 'Азаматтық қорғаныс', 'Гражданская оборона', 'Составная часть государственной системы гражданской защиты, предназначенная для реализации общегосударственного комплекса мероприятий, проводимых в мирное и военное время, по защите населения и территории Республики Казахстан от воздействия поражающих (разрушающих) факторов современных средств поражения, чрезвычайных ситуаций природного и техногенного характера.', 'Қазақстан Республикасының халқы мен аумағын қазіргі заманғы зақымдаушы құралдардың зақымдау (қирату) факторларының әсерінен, табиғи және техногендік сипаттағы төтенше жағдайлардан қорғау жөнінде бейбіт уақытта және соғыс уақытында жүргізілетін жалпымемлекеттік іс-шаралар кешенін іске асыруға арналған азаматтық қорғаудың мемлекеттік жүйесінің құрамдас бөлігі.', 'Z1400000188', 'ст. 1, пп. 6 и 10'),
  ('definition', 'civil_protection', 'Гражданская защита', 'Азаматтық қорғау', 'Гражданская защита', 'Общегосударственный комплекс мероприятий, проводимых в мирное и военное время, направленных на предупреждение и ликвидацию чрезвычайных ситуаций природного и техногенного характера и их последствий, организацию и ведение гражданской обороны, оказание экстренной медицинской и психологической помощи населению, находящемуся в зоне чрезвычайной ситуации, включающий в себя мероприятия по обеспечению пожарной, промышленной и сейсмической безопасности, формированию, хранению и использованию государственного материального резерва.', 'өрт қауіпсіздігін, өнеркәсіптік және сейсмикалық қауіпсіздікті қамтамасыз ету, мемлекеттік материалдық резервті қалыптастыру, сақтау және пайдалану жөніндегі іс-шараларды қамтитын, табиғи және техногендік сипаттағы төтенше жағдайлар мен олардың салдарларының алдын алуға және оларды жоюға, азаматтық қорғанысты ұйымдастыруға және жүргізуге, төтенше жағдай аймағындағы халыққа шұғыл медициналық және психологиялық көмек көрсетуге бағытталған, бейбіт уақытта және соғыс уақытында жүргізілетін жалпымемлекеттік іс-шаралар кешені.', 'Z1400000188', 'ст. 1, пп. 6 и 10'),
  ('definition', 'emergencies', 'Предупреждение чрезвычайных ситуаций', 'Төтенше жағдайлардың алдын алу', 'Предупреждение чрезвычайных ситуаций', 'Комплекс мероприятий, проводимых заблаговременно и направленных на максимально возможное уменьшение риска возникновения чрезвычайных ситуаций, а также на сохранение жизни и здоровья людей, снижение размеров материальных потерь в случае их возникновения.', 'күні бұрын жүргізілетін және төтенше жағдайлардың туындау тәуекелін мүмкіндігінше барынша азайтуға, сондай-ақ адамдардың өмірі мен денсаулығын сақтауға, олар туындаған жағдайда материалдық шығындардың мөлшерін азайтуға бағытталған іс-шаралар кешені.', 'Z1400000188', 'ст. 1, пп. 70 и 72'),
  ('definition', 'emergencies', 'Ликвидация чрезвычайных ситуаций', 'Төтенше жағдайларды жою', 'Ликвидация чрезвычайных ситуаций', 'Проведение аварийно-спасательных и неотложных работ.', 'авариялық-құтқару жұмыстары мен кезек күттірмейтін жұмыстарды жүргізу.', 'Z1400000188', 'ст. 1, пп. 70 и 72'),
  ('definition', 'rescue_ops', 'Аварийно-спасательные работы', 'Авариялық-құтқару жұмыстары', 'Аварийно-спасательные работы', 'Действия по поиску и спасению людей, материальных и культурных ценностей, оказанию экстренной медицинской и психологической помощи населению, находящемуся в зоне чрезвычайной ситуации, защите окружающей среды в зоне чрезвычайной ситуации и при ведении военных действий, локализации и подавлению или доведению до минимально возможного уровня воздействия характерных для них опасных факторов.', 'адамдарды, материалдық және мәдени құндылықтарды іздеу және құтқару, төтенше жағдай аймағындағы халыққа шұғыл медициналық және психологиялық көмек көрсету, төтенше жағдай аймағында және әскери іс-қимылдар жүргізу кезінде қоршаған ортаны қорғау, оларға тән қауіпті факторлардың әсерін оқшаулау және басу немесе ең төменгі мүмкін болатын деңгейге дейін жеткізу жөніндегі іс-қимылдар.', 'Z1400000188', 'ст. 1, пп. 2, 70 и 71'),
  ('definition', 'rescue_ops', 'Неотложные работы', 'Кезек күттірмейтін жұмыстар', 'Неотложные работы', 'Деятельность по всестороннему обеспечению аварийно-спасательных работ, созданию условий, необходимых для сохранения жизни и здоровья людей.', 'авариялық-құтқару жұмыстарын жан-жақты қамтамасыз ету, адамдардың өмірі мен денсаулығын сақтауға қажетті жағдайлар жасау жөніндегі қызмет.', 'Z1400000188', 'ст. 1, пп. 2, 70 и 71'),
  ('definition', 'evacuation', 'Рассредоточение', 'Бөліп орналастыру', 'Рассредоточение', 'Рассредоточение работников организаций, отнесённых к категориям по гражданской обороне, в мирное и военное время (часть эвакуационных мероприятий).', 'бейбіт уақытта және соғыс уақытында азаматтық қорғаныс бойынша санаттарға жатқызылған ұйымдардың жұмыскерлерін бөліп орналастыру (эвакуациялық іс-шаралардың бөлігі).', 'Z1400000188', 'ст. 1, пп. 79'),
  ('definition', 'evacuation', 'Эвакуация', 'Эвакуациялау', 'Эвакуация', 'Эвакуация населения и материальных средств из городов и зон чрезвычайной ситуации в мирное и военное время (часть эвакуационных мероприятий).', 'бейбіт уақытта және соғыс уақытында қалалар мен төтенше жағдай аймақтарынан халықты және материалдық құралдарды эвакуациялау (эвакуациялық іс-шаралардың бөлігі).', 'Z1400000188', 'ст. 1, пп. 79'),
  ('definition', 'tactics', 'Локализация пожара', 'Өртті оқшаулау', 'Локализация пожара', 'Стадия (этап) тушения пожара, на которой отсутствует или ликвидирована угроза людям (животным), прекращено распространение пожара и созданы условия для его ликвидации имеющимися силами и средствами.', 'адамдарға (жануарларға) қауіп төндірмейтін немесе жойылған, өрттің жайылуы тоқтатылған және қолда бар күштер мен құралдардың көмегімен оны жою үшін жағдай жасалған өртті сөндіру сатысы (кезеңі).', 'V1700015430', 'п. 4, пп. 28 и 35'),
  ('definition', 'tactics', 'Ликвидация пожара', 'Өртті жою', 'Ликвидация пожара', 'Стадия (этап) тушения пожара, на которой прекращено горение и устранены условия для его самопроизвольного возникновения.', 'жану тоқтатылған және оның өздігінен жану жағдайы жойылған өртті сөндіру сатысы (кезеңі).', 'V1700015430', 'п. 4, пп. 28 и 35'),
  ('definition', 'coordination', 'Оповещение населения о чрезвычайных ситуациях', 'Төтенше жағдайлар туралы халықты құлақтандыру', 'Оповещение населения о чрезвычайных ситуациях', 'Доведение до населения сигнала оповещения «Внимание всем!» и экстренной информации об опасностях, возникающих при угрозе возникновения или возникновении чрезвычайных ситуаций природного и техногенного характера, а также о правилах поведения населения в сложившейся ситуации.', 'халыққа табиғи және техногендік сипаттағы төтенше жағдайлардың туындау қатері немесе туындауы кезінде туындайтын қауіптер туралы, сондай-ақ қалыптасқан жағдайда халықтың мінез-құлық қағидалары туралы «Баршаның назарына!» құлақтандыру сигналы мен шұғыл ақпаратты жеткізу.', 'V14C0010151', 'п. 2, пп. 6 и 7'),
  ('definition', 'coordination', 'Сигнал оповещения «Внимание всем!»', '«Баршаның назарына!» құлақтандыру сигналы', 'Сигнал оповещения «Внимание всем!»', 'Единый сигнал оповещения, передаваемый посредством сирен или других сигнальных средств, для привлечения внимания населения при угрозе возникновения или возникновении чрезвычайных ситуаций.', 'төтенше жағдайлар туындау қатері төнген немесе туындаған кезде халықтың назарын аудару үшін сиреналар немесе басқа да сигнал беру құралдары арқылы берілетін құлақтандырудың бірыңғай сигналы.', 'V14C0010151', 'п. 2, пп. 6 и 7'),
  ('definition', 'fire_safety', 'Пожарная безопасность', 'Өрт қауіпсіздігі', 'Пожарная безопасность', 'Состояние защищённости людей, имущества, общества и государства от пожаров.', 'адамдардың, мүліктің, қоғам мен мемлекеттің өрттерден қорғалу жай-күйі.', 'Z1400000188', 'ст. 1, пп. 50 и 57'),
  ('definition', 'regulations', 'Промышленная безопасность', 'Өнеркәсіптік қауіпсіздік', 'Промышленная безопасность', 'Состояние защищённости физических и юридических лиц, окружающей среды от вредного воздействия опасных производственных факторов.', 'жеке және заңды тұлғалардың, қоршаған ортаның қауіпті өндірістік факторлардың зиянды әсерінен қорғалу жай-күйі.', 'Z1400000188', 'ст. 1, пп. 50 и 57')
) as v(kind, category, title, kk, ru, def_ru, def_kk, code, clause)
join public.kb_sources s on s.code = v.code
where not exists (select 1 from public.kb_entries e where e.kind = 'definition' and e.title = v.title);

-- ---- seed: wording rules for service documents (no act cited -> needs_review)
insert into public.kb_entries (kind, category, title, ru, kk, status)
select v.kind, v.category, v.title, v.ru, v.kk, 'needs_review'
from (values
  ('rule', 'documents', 'Реквизит «Кому» — дательный падеж', 'Кому: Начальнику … (должность), полковнику гражданской защиты Самойлову И. И. — должность, специальное звание и фамилия в дательном падеже.', null),
  ('rule', 'documents', 'Реквизит «От кого» — родительный падеж', 'От кого: Начальника караула … капитана гражданской защиты Иванова А. А. — должность, специальное звание и фамилия в родительном падеже.', null),
  ('rule', 'documents', 'Предполагаемая причина пожара', 'Предположение не излагается как установленный факт: «Предварительная (предполагаемая) причина — …; точная причина устанавливается». При отсутствии сведений: «Причина пожара устанавливается».', 'Болжам анықталған факт ретінде жазылмайды: «Болжамды себебі — …; нақты себебі анықталуда». Мәліметтер болмаса: «Өрттің себебі анықталуда».'),
  ('rule', 'documents', 'Изложение рапорта', 'Рапорт излагается от первого лица («Докладываю, что…»), в прошедшем времени, официально-деловым стилем, без оценок; время — в формате ЧЧ:ММ; числительные согласуются с существительными («2 человека»).', 'Рапорт бірінші жақтан («Баяндаймын, …»), өткен шақта, ресми іс қағаздары стилінде жазылады; уақыт СС:ММ форматында.'),
  ('rule', 'documents', '«По прибытии», а не «по прибытию»', 'Предлог «по» в значении «после» требует предложного падежа: «по прибытии», «по окончании», «по завершении».', null)
) as v(kind, category, title, ru, kk)
where not exists (select 1 from public.kb_entries e where e.kind = 'rule' and e.title = v.title);

-- ---- embeddings are written back in one call --------------------------------
-- payload: [{ "id": "<uuid>", "embedding": [0.1, …] }, …]. Service role only
-- (called by the smart-report Edge Function); not exposed to visitors.
create or replace function public.kb_set_embeddings(payload jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated integer;
begin
  update public.kb_entries e
     set embedding = (p ->> 'embedding')::extensions.vector(768)
    from jsonb_array_elements(payload) p
   where e.id = (p ->> 'id')::uuid;
  get diagnostics updated = row_count;
  return updated;
end;
$$;

revoke all on function public.kb_set_embeddings(jsonb) from public, anon, authenticated;
