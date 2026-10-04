import {
  addressee,
  approval,
  attachments,
  docDate,
  docNumber,
  docPlace,
  f,
  HINT_ACTIONS,
  L,
  members,
  organization,
  serviceHead,
  signature,
  subject,
  text,
} from './fields.js'

// The catalog of «Конструктор профессиональной документации».
//
// Every type here is a WORKING TEMPLATE OF THE PLATFORM (status 'platform'):
// a structure prepared for convenience, not a form approved by a normative
// act. A type becomes 'official' only together with `source` — the act, its
// date / edition and a link — and 'recommended' only with `basis`. No type is
// marked so without a confirmed source.
//
// A new document type is a new entry in this list; the editor, preview,
// check and export work from the configuration and need no changes.
// `engine: 'smart'` opens the existing «Умный рабочий рапорт» instead of the
// generic editor. A type listed in two categories (заявление, представление…)
// is one template with `categories: [...]`.

export const TEMPLATE_STATUSES = ['official', 'recommended', 'platform']

const T = (id, categories, title, docTitle, purpose, sections, extra = {}) => ({
  id,
  categories,
  title,
  docTitle,
  purpose,
  status: 'platform',
  sections,
  ...extra,
})

const content = (fields, title = L('Мазмұны', 'Содержание')) => ({ key: 'content', title, fields })
const attachSection = () => ({ key: 'attachments', title: L('Қосымшалар', 'Приложения'), fields: [attachments()] })

/** Head + subject + body + attachments + signature: записки, письма, заявления. */
const memo = (id, categories, title, docTitle, purpose, bodyFields, { number = true, org = false, withSubject = true } = {}) =>
  T(id, categories, title, docTitle, purpose, [
    serviceHead({ number, org }),
    content([...(withSubject ? [subject()] : []), ...bodyFields]),
    attachSection(),
    signature(),
  ])

// ---- incident documents ------------------------------------------------------

const incidentWhen = () => ({
  key: 'incident',
  title: L('Оқиға', 'Происшествие'),
  fields: [
    f('incidentDate', 'date', L('Оқиға күні', 'Дата происшествия'), { required: true, inline: true, volatile: true }),
    f('incidentTime', 'time', L('Хабар түскен уақыт', 'Время поступления сообщения'), { inline: true, volatile: true }),
    f('location', 'location', L('Орны (мекенжайы)', 'Место (адрес)'), { required: true, inline: true, volatile: true }),
    f('object', 'text', L('Объект', 'Объект'), { inline: true, volatile: true }),
  ],
})

const incidentBody = (extraFields = []) => ({
  key: 'circumstances',
  title: L('Мән-жайы', 'Обстоятельства'),
  fields: [
    text('description', L('Не болды', 'Что произошло'), { required: true, volatile: true }),
    ...extraFields,
    text('actions', L('Қабылданған шаралар', 'Принятые меры'), { hint: HINT_ACTIONS, volatile: true }),
    text('result', L('Нәтиже', 'Результат'), { volatile: true }),
  ],
})

const people = () => ({
  key: 'people',
  title: L('Адамдар', 'Люди'),
  fields: [
    f('injured', 'number', L('Зардап шеккендер', 'Пострадавшие'), { inline: true, volatile: true }),
    f('dead', 'number', L('Қаза тапқандар', 'Погибшие'), { inline: true, volatile: true }),
    f('rescued', 'number', L('Құтқарылғандар', 'Спасённые'), { inline: true, volatile: true }),
    f('evacuated', 'number', L('Эвакуацияланғандар', 'Эвакуированные'), { inline: true, volatile: true }),
  ],
})

const forces = () => ({
  key: 'forces',
  title: L('Күштер мен құралдар', 'Силы и средства'),
  fields: [
    f('unit', 'department', L('Бөлімше', 'Подразделение'), { inline: true, profile: 'department' }),
    f('staffCount', 'number', L('Жеке құрам, адам', 'Личный состав, чел.'), { inline: true, volatile: true }),
    f('equipmentCount', 'number', L('Техника, бірлік', 'Техника, ед.'), { inline: true, volatile: true }),
    f('equipmentList', 'textarea', L('Техника тізімі', 'Перечень техники'), { inline: true, volatile: true }),
  ],
})

const incidentReport = (id, title, purpose, extra = [], extraSections = []) =>
  T(id, ['incident'], title, L('РАПОРТ', 'РАПОРТ'), purpose, [
    serviceHead(),
    incidentWhen(),
    incidentBody(extra),
    people(),
    forces(),
    ...extraSections,
    signature(),
  ])

// ---- planning documents --------------------------------------------------------

const planTable = (columns) =>
  f('items', 'table', L('Іс-шаралар', 'Мероприятия'), {
    role: 'table',
    required: true,
    columns: columns ?? [
      { key: 'what', label: L('Іс-шараның атауы', 'Наименование мероприятия') },
      { key: 'when', label: L('Мерзімі', 'Срок') },
      { key: 'who', label: L('Жауапты', 'Ответственный') },
      { key: 'note', label: L('Белгі', 'Отметка') },
    ],
  })

const plan = (id, title, docTitle, purpose, intro = [], columns) =>
  T(id, ['organization'], title, docTitle, purpose, [
    approval(),
    {
      key: 'head',
      title: L('Атауы', 'Наименование'),
      fields: [organization(), subject({ label: L('Не туралы / кезең', 'Предмет и период') }), docPlace(), ...intro],
    },
    { key: 'items', title: L('Кесте', 'Таблица'), fields: [planTable(columns)] },
    signature({ title: L('Әзірлеген', 'Разработал') }),
  ])

const ruleDoc = (id, title, docTitle, purpose) =>
  T(id, ['organization'], title, docTitle, purpose, [
    approval(),
    { key: 'head', title: L('Атауы', 'Наименование'), fields: [organization(), subject()] },
    {
      key: 'chapters',
      title: L('Тараулар', 'Разделы'),
      fields: [
        f('chapters', 'repeating', L('Тарау', 'Раздел'), {
          required: true,
          fields: [
            f('heading', 'text', L('Тараудың атауы', 'Название раздела')),
            f('body', 'textarea', L('Мәтіні', 'Текст')),
          ],
        }),
      ],
    },
    signature({ title: L('Әзірлеген', 'Разработал') }),
  ])

// ---- acts and protocols --------------------------------------------------------

const act = (id, title, purpose, findings, { approve = true, table } = {}) =>
  T(id, ['acts'], title, L('АКТ', 'АКТ'), purpose, [
    ...(approve ? [approval()] : []),
    {
      key: 'head',
      title: L('Деректемелер', 'Реквизиты'),
      fields: [organization(), subject(), docNumber(), docDate(), docPlace({ required: true })],
    },
    {
      key: 'commission',
      title: L('Комиссия', 'Комиссия'),
      fields: [
        members('commission', L('Комиссия құрамы', 'Состав комиссии'), { required: true }),
        text('basis', L('Негіздеме', 'Основание'), {
          hint: L('Бұйрық, тапсырма немесе өтінім (нөмірі мен күні).', 'Приказ, поручение или заявка (номер и дата), на основании которых составлен акт.'),
        }),
      ],
    },
    content([...findings, ...(table ? [table] : [])], L('Анықталды', 'Установлено')),
    {
      key: 'outcome',
      title: L('Қорытынды', 'Заключение'),
      fields: [text('conclusion', L('Қорытынды', 'Заключение'), { required: true })],
    },
    attachSection(),
    signature({ title: L('Комиссия төрағасы', 'Председатель комиссии') }),
  ])

const protocol = (id, title, purpose, extra = []) =>
  T(id, ['acts'], title, L('ХАТТАМА', 'ПРОТОКОЛ'), purpose, [
    {
      key: 'head',
      title: L('Деректемелер', 'Реквизиты'),
      fields: [organization(), subject(), docNumber(), docDate(), docPlace()],
    },
    {
      key: 'participants',
      title: L('Қатысушылар', 'Участники'),
      fields: [
        f('chair', 'person', L('Төраға', 'Председатель'), { inline: true }),
        f('secretary', 'person', L('Хатшы', 'Секретарь'), { inline: true }),
        members('present', L('Қатысқандар', 'Присутствовали')),
      ],
    },
    {
      key: 'agenda',
      title: L('Күн тәртібі', 'Повестка дня'),
      fields: [
        ...extra,
        f('questions', 'repeating', L('Мәселе', 'Вопрос'), {
          required: true,
          fields: [
            f('question', 'text', L('Мәселе', 'Вопрос')),
            f('heard', 'textarea', L('Тыңдалды', 'Слушали')),
            f('decided', 'textarea', L('Шешілді', 'Решили')),
          ],
        }),
      ],
    },
    signature({ title: L('Төраға', 'Председатель') }),
  ])

// ---- reports and analytics -----------------------------------------------------

const period = () => f('period', 'text', L('Кезең', 'Период'), { inline: true, required: true, volatile: true })

const reportDoc = (id, categories, title, docTitle, purpose, bodyFields) =>
  T(id, categories, title, docTitle, purpose, [
    {
      key: 'head',
      title: L('Деректемелер', 'Реквизиты'),
      fields: [organization(), addressee({ required: false }), subject(), period(), docDate()],
    },
    content(bodyFields),
    attachSection(),
    signature(),
  ])

const analytic = (id, title, docTitle, purpose) =>
  reportDoc(id, ['analytics'], title, docTitle, purpose, [
    text('basis', L('Талдау негізі мен дереккөздері', 'Основание и источники данных'), {
      required: true,
      hint: L('Қандай деректер мен құжаттар талданды.', 'Какие данные и документы проанализированы. Нормативные акты указывайте только реально существующие.'),
    }),
    f('indicators', 'table', L('Көрсеткіштер', 'Показатели'), {
      role: 'table',
      columns: [
        { key: 'name', label: L('Көрсеткіш', 'Показатель') },
        { key: 'prev', label: L('Өткен кезең', 'Прошлый период') },
        { key: 'now', label: L('Есепті кезең', 'Отчётный период') },
        { key: 'change', label: L('Өзгеріс', 'Изменение') },
      ],
    }),
    text('analysis', L('Талдау', 'Анализ'), { required: true }),
    text('conclusions', L('Қорытындылар', 'Выводы'), { required: true }),
    text('proposals', L('Ұсыныстар', 'Предложения')),
  ])

// ---- the catalog -----------------------------------------------------------------

export const TEMPLATES = [
  // A. Service and reporting correspondence
  T(
    'report',
    ['service'],
    L('Рапорт', 'Рапорт'),
    L('РАПОРТ', 'РАПОРТ'),
    L(
      'Басшыға қызметтік оқиға туралы баяндау. «Ақылды жұмыс рапорты»: сипаттамадан мәліметтерді бөліп алу, кәсіби тұжырым, тексеру, DOCX.',
      'Доклад начальнику о служебном событии. «Умный рабочий рапорт»: извлечение фактов из описания, профессиональная формулировка, проверка, DOCX.',
    ),
    [],
    { engine: 'smart' },
  ),
  T('briefing', ['service'], L('Баяндама', 'Доклад'), L('БАЯНДАМА', 'ДОКЛАД'), L('Басшылыққа немесе кеңесте ауызша не жазбаша баяндау.', 'Устное или письменное изложение для руководства или совещания.'), [
    serviceHead({ number: false }),
    content([
      subject(),
      text('situation', L('Жағдай', 'Обстановка'), { required: true }),
      text('done', L('Атқарылған жұмыс', 'Проделанная работа'), { hint: HINT_ACTIONS }),
      text('problems', L('Проблемалар', 'Проблемные вопросы')),
      text('proposals', L('Ұсыныстар', 'Предложения')),
    ]),
    signature(),
  ]),
  memo('service_note', ['service', 'personnel'], L('Қызметтік жазба', 'Служебная записка'), L('ҚЫЗМЕТТІК ЖАЗБА', 'СЛУЖЕБНАЯ ЗАПИСКА'), L('Бір ұйым ішіндегі бөлімшелер арасындағы хат алмасу.', 'Переписка между подразделениями внутри одной организации.'), [
    text('body', L('Мәтіні', 'Текст'), { required: true }),
    text('request', L('Өтініш / ұсыныс', 'Просьба или предложение')),
  ]),
  memo('memo_report', ['service'], L('Баяндау хат', 'Докладная записка'), L('БАЯНДАУ ХАТ', 'ДОКЛАДНАЯ ЗАПИСКА'), L('Басшыға фактілер, жағдай немесе орындалған жұмыс туралы хабарлау.', 'Информирование руководителя о фактах, ситуации или выполненной работе.'), [
    text('facts', L('Фактілер', 'Изложение фактов'), { required: true }),
    text('conclusions', L('Қорытындылар', 'Выводы')),
    text('proposals', L('Ұсыныстар', 'Предложения')),
  ]),
  memo('explanation', ['service', 'personnel'], L('Түсініктеме хат', 'Объяснительная записка'), L('ТҮСІНІКТЕМЕ ХАТ', 'ОБЪЯСНИТЕЛЬНАЯ ЗАПИСКА'), L('Оқиғаның немесе тәртіп бұзудың себептерін түсіндіру.', 'Объяснение причин события, нарушения или невыполнения задачи.'), [
    f('eventDate', 'date', L('Оқиға күні', 'Дата события'), { inline: true, volatile: true }),
    text('what', L('Не болды', 'Что произошло'), { required: true }),
    text('reasons', L('Себептері', 'Причины'), { required: true }),
  ], { withSubject: false }),
  memo('letter', ['service'], L('Қызметтік хат', 'Служебное письмо'), L('ХАТ', 'ПИСЬМО'), L('Басқа ұйымға ресми хат.', 'Официальное письмо в другую организацию.'), [
    f('outNumber', 'text', L('Шығыс нөмірі', 'Исходящий номер'), { inline: true, volatile: true }),
    f('replyTo', 'text', L('Хатқа жауап (нөмірі, күні)', 'В ответ на письмо (номер, дата)'), { inline: true }),
    text('body', L('Мәтіні', 'Текст'), { required: true }),
    f('needReply', 'checkbox', L('Жауап қажет', 'Требуется ответ'), { inline: true }),
  ], { org: true }),
  memo('cover_letter', ['service'], L('Ілеспе хат', 'Сопроводительное письмо'), L('ІЛЕСПЕ ХАТ', 'СОПРОВОДИТЕЛЬНОЕ ПИСЬМО'), L('Жіберілетін құжаттарға ілеспе хат.', 'Сопровождение направляемых документов или материалов.'), [
    text('body', L('Не жіберіледі және не үшін', 'Что направляется и с какой целью'), { required: true }),
  ], { org: true }),
  memo('application', ['service', 'personnel'], L('Өтініш', 'Заявление'), L('ӨТІНІШ', 'ЗАЯВЛЕНИЕ'), L('Жеке өтініш: демалыс, ауыстыру, анықтама беру және т.б.', 'Личная просьба: отпуск, перевод, выдача справки и т. п.'), [
    text('request', L('Өтініш мәтіні', 'Текст просьбы'), { required: true, hint: L('«...беруіңізді сұраймын» деп аяқталады.', 'Начинается со слов «Прошу…».') }),
    text('grounds', L('Негіздеме', 'Основание')),
  ], { number: false, withSubject: false }),
  memo('nomination', ['service', 'personnel'], L('Ұсыным', 'Представление'), L('ҰСЫНЫМ', 'ПРЕДСТАВЛЕНИЕ'), L('Қызметкерді марапаттауға, атаққа, лауазымға ұсыну.', 'Представление сотрудника к награде, званию, должности.'), [
    f('nominee', 'person', L('Ұсынылатын қызметкер', 'Представляемый сотрудник'), { inline: true, required: true }),
    f('nomineePosition', 'position', L('Лауазымы', 'Должность'), { inline: true }),
    f('nomineeRank', 'rank', L('Атағы', 'Звание'), { inline: true }),
    f('nominationKind', 'select', L('Ұсыну түрі', 'Вид представления'), {
      inline: true,
      required: true,
      options: L(['Марапаттау', 'Кезекті атақ', 'Лауазымға тағайындау', 'Көтермелеу'], ['К награждению', 'К очередному званию', 'К назначению на должность', 'К поощрению']),
    }),
    text('merits', L('Негіздеме (еңбегі)', 'Обоснование (заслуги)'), { required: true }),
  ]),
  memo('proposal', ['service'], L('Ұсыныс', 'Предложение'), L('ҰСЫНЫС', 'ПРЕДЛОЖЕНИЕ'), L('Жұмысты жетілдіру бойынша ұсыныс.', 'Предложение по совершенствованию работы.'), [
    text('problem', L('Мәселе', 'Проблема'), { required: true }),
    text('solution', L('Ұсынылатын шешім', 'Предлагаемое решение'), { required: true }),
    text('effect', L('Күтілетін нәтиже', 'Ожидаемый результат')),
  ]),

  // B. Reports
  reportDoc('activity_report', ['reports'], L('Есеп', 'Отчёт'), L('ЕСЕП', 'ОТЧЁТ'), L('Кезең ішіндегі жұмыс туралы есеп.', 'Отчёт о работе за период.'), [
    text('done', L('Атқарылған жұмыс', 'Выполненная работа'), { required: true, hint: HINT_ACTIONS }),
    text('results', L('Нәтижелер', 'Результаты')),
    text('problems', L('Проблемалар', 'Проблемные вопросы')),
  ]),
  reportDoc('final_report', ['reports'], L('Қорытынды есеп', 'Итоговый отчёт'), L('ҚОРЫТЫНДЫ ЕСЕП', 'ИТОГОВЫЙ ОТЧЁТ'), L('Жыл, тоқсан немесе жоба бойынша қорытынды.', 'Итоги года, квартала или проекта.'), [
    text('goals', L('Мақсаттар мен міндеттер', 'Цели и задачи')),
    text('done', L('Атқарылған жұмыс', 'Выполненная работа'), { required: true, hint: HINT_ACTIONS }),
    f('indicators', 'table', L('Негізгі көрсеткіштер', 'Основные показатели'), {
      role: 'table',
      columns: [
        { key: 'name', label: L('Көрсеткіш', 'Показатель') },
        { key: 'plan', label: L('Жоспар', 'План') },
        { key: 'fact', label: L('Нақты', 'Факт') },
      ],
    }),
    text('conclusions', L('Қорытындылар', 'Выводы'), { required: true }),
  ]),
  reportDoc('task_report', ['reports'], L('Тапсырманың орындалуы туралы есеп', 'Отчёт о выполнении задания'), L('ЕСЕП', 'ОТЧЁТ'), L('Берілген тапсырманың орындалуы туралы.', 'О выполнении полученного задания или поручения.'), [
    f('task', 'text', L('Тапсырма (нөмірі, күні)', 'Задание (номер, дата)'), { inline: true, required: true }),
    text('done', L('Орындалғаны', 'Что выполнено'), { required: true, hint: HINT_ACTIONS }),
    f('completion', 'radio', L('Орындалу деңгейі', 'Степень выполнения'), {
      inline: true,
      options: L(['Толық орындалды', 'Ішінара орындалды', 'Орындалмады'], ['Выполнено полностью', 'Выполнено частично', 'Не выполнено']),
    }),
    text('reasons', L('Орындалмау себептері', 'Причины невыполнения')),
  ]),
  reportDoc('events_report', ['reports'], L('Өткізілген іс-шаралар туралы есеп', 'Отчёт о проведённых мероприятиях'), L('ЕСЕП', 'ОТЧЁТ'), L('Өткізілген іс-шаралардың тізімі мен нәтижесі.', 'Перечень и итоги проведённых мероприятий.'), [
    f('events', 'table', L('Іс-шаралар', 'Мероприятия'), {
      role: 'table',
      required: true,
      columns: [
        { key: 'date', label: L('Күні', 'Дата') },
        { key: 'what', label: L('Іс-шара', 'Мероприятие') },
        { key: 'who', label: L('Қатысқандар', 'Участники') },
        { key: 'result', label: L('Нәтиже', 'Результат') },
      ],
    }),
    text('summary', L('Жалпы қорытынды', 'Общий итог')),
  ]),
  reportDoc('results_report', ['reports'], L('Жұмыс нәтижелері туралы есеп', 'Отчёт о результатах работы'), L('ЕСЕП', 'ОТЧЁТ'), L('Бөлімшенің жұмыс нәтижелері.', 'Результаты работы подразделения.'), [
    text('results', L('Нәтижелер', 'Результаты'), { required: true }),
    text('comparison', L('Өткен кезеңмен салыстыру', 'Сравнение с прошлым периодом')),
    text('problems', L('Кемшіліктер', 'Недостатки')),
    text('plans', L('Алдағы міндеттер', 'Задачи на следующий период')),
  ]),
  reportDoc('certificate', ['reports'], L('Анықтама', 'Справка'), L('АНЫҚТАМА', 'СПРАВКА'), L('Фактіні растау немесе мәліметтерді қысқаша баяндау.', 'Подтверждение факта или краткое изложение сведений.'), [
    text('body', L('Мәтіні', 'Текст'), { required: true }),
    f('issuedFor', 'text', L('Ұсыну үшін', 'Для представления'), { inline: true }),
  ]),
  reportDoc('info_certificate', ['reports'], L('Ақпараттық анықтама', 'Информационная справка'), L('АҚПАРАТТЫҚ АНЫҚТАМА', 'ИНФОРМАЦИОННАЯ СПРАВКА'), L('Мәселе бойынша мәліметтер жиынтығы.', 'Свод сведений по вопросу для руководства.'), [
    text('background', L('Мәселенің мәні', 'Суть вопроса'), { required: true }),
    text('facts', L('Негізгі мәліметтер', 'Основные сведения'), { required: true }),
    text('status', L('Ағымдағы жағдай', 'Текущее положение')),
  ]),

  // C. Incidents and emergencies
  T(
    'incident_report',
    ['incident'],
    L('Оқиға туралы рапорт', 'Рапорт о происшествии'),
    L('РАПОРТ', 'РАПОРТ'),
    L('«Ақылды жұмыс рапорты»: оқиғаны өз сөзіңізбен сипаттаңыз — жүйе рапорт жобасын жинайды.', '«Умный рабочий рапорт»: опишите происшествие своими словами — система соберёт проект рапорта.'),
    [],
    { engine: 'smart' },
  ),
  incidentReport('fire_report', L('Өрт туралы рапорт', 'Рапорт о пожаре'), L('Өрт, оны сөндіру және салдары туралы.', 'О пожаре, его тушении и последствиях.'), [
    f('fireRank', 'select', L('Өрттің нөмірі (дәрежесі)', 'Номер (ранг) пожара'), {
      inline: true,
      options: L(['№ 1', '№ 1-бис', '№ 2', '№ 3', '№ 4', '№ 5'], ['№ 1', '№ 1-бис', '№ 2', '№ 3', '№ 4', '№ 5']),
    }),
    f('fireArea', 'text', L('Өрт ауданы', 'Площадь пожара'), { inline: true, volatile: true }),
    f('localized', 'time', L('Оқшаулау уақыты', 'Время локализации'), { inline: true, volatile: true }),
    f('extinguished', 'time', L('Жою уақыты', 'Время ликвидации'), { inline: true, volatile: true }),
    text('cause', L('Болжамды себебі', 'Предполагаемая причина'), {
      hint: L('Себеп анықталмаса — «анықталуда» деп жазыңыз.', 'Если причина не установлена — пишите «устанавливается».'),
    }),
  ]),
  incidentReport('dispatch_report', L('Бөлімшенің шығуы туралы рапорт', 'Рапорт о выезде подразделения'), L('Бөлімшенің шақыру бойынша шығуы.', 'Выезд подразделения по вызову.'), [
    f('departure', 'time', L('Шығу уақыты', 'Время выезда'), { inline: true, required: true, volatile: true }),
    f('arrival', 'time', L('Келу уақыты', 'Время прибытия'), { inline: true, volatile: true }),
    f('returned', 'time', L('Оралу уақыты', 'Время возвращения'), { inline: true, volatile: true }),
  ]),
  incidentReport('rescue_report', L('Авариялық-құтқару жұмыстарын жүргізу туралы рапорт', 'Рапорт о проведении аварийно-спасательных работ'), L('АҚЖ барысы мен нәтижелері.', 'Ход и результаты аварийно-спасательных работ.'), [
    f('workStart', 'datetime', L('Жұмыстың басталуы', 'Начало работ'), { inline: true, volatile: true }),
    f('workEnd', 'datetime', L('Жұмыстың аяқталуы', 'Окончание работ'), { inline: true, volatile: true }),
    f('workKinds', 'multiselect', L('Жұмыс түрлері', 'Виды работ'), {
      inline: true,
      options: L(
        ['Іздестіру', 'Құтқару', 'Алғашқы медициналық көмек', 'Эвакуация', 'Үйінділерді бөлшектеу', 'Суда құтқару'],
        ['Поиск', 'Спасение', 'Первая помощь', 'Эвакуация', 'Разбор завалов', 'Спасение на воде'],
      ),
    }),
  ]),
  incidentReport('completion_report', L('Жұмыстардың аяқталуы туралы рапорт', 'Рапорт о завершении работ'), L('Жұмыстардың аяқталуы және нәтижесі.', 'Завершение работ на месте и их итог.'), [
    f('workEnd', 'datetime', L('Аяқталған уақыты', 'Время завершения'), { inline: true, required: true, volatile: true }),
    text('handover', L('Объектінің берілуі', 'Передача объекта'), { hint: L('Кімге және қашан берілді.', 'Кому и когда передан объект.') }),
  ]),
  T('incident_certificate', ['incident'], L('Оқиға туралы анықтама', 'Справка о происшествии'), L('АНЫҚТАМА', 'СПРАВКА'), L('Оқиға туралы қысқаша мәліметтер.', 'Краткие сведения о происшествии.'), [
    { key: 'head', title: L('Деректемелер', 'Реквизиты'), fields: [organization(), addressee({ required: false }), docDate()] },
    incidentWhen(),
    incidentBody(),
    people(),
    signature(),
  ]),
  T('emergency_info', ['incident'], L('Төтенше жағдай туралы ақпарат', 'Информация о чрезвычайной ситуации'), L('АҚПАРАТ', 'ИНФОРМАЦИЯ'), L('ТЖ туралы мәліметтерді жоғары тұрған органға беру.', 'Передача сведений о ЧС в вышестоящий орган.'), [
    { key: 'head', title: L('Деректемелер', 'Реквизиты'), fields: [organization(), addressee(), docNumber(), docDate()] },
    {
      key: 'emergency',
      title: L('Төтенше жағдай', 'Чрезвычайная ситуация'),
      fields: [
        f('emergencyKind', 'select', L('ТЖ сипаты', 'Характер ЧС'), {
          inline: true,
          required: true,
          options: L(['Табиғи', 'Техногендік'], ['Природного характера', 'Техногенного характера']),
        }),
        f('emergencyLevel', 'select', L('Деңгейі', 'Масштаб'), {
          inline: true,
          options: L(['Объектілік', 'Жергілікті', 'Өңірлік', 'Ғаламдық'], ['Объектовый', 'Местный', 'Региональный', 'Глобальный']),
        }),
        f('startedAt', 'datetime', L('Басталған уақыты', 'Время возникновения'), { inline: true, required: true, volatile: true }),
        f('location', 'location', L('Орны', 'Место'), { inline: true, required: true, volatile: true }),
        text('description', L('Сипаттамасы', 'Описание'), { required: true, volatile: true }),
      ],
    },
    people(),
    {
      key: 'response',
      title: L('Ден қою', 'Реагирование'),
      fields: [
        text('actions', L('Қабылданған шаралар', 'Принятые меры'), { hint: HINT_ACTIONS, volatile: true }),
        f('forcesInvolved', 'textarea', L('Тартылған күштер мен құралдар', 'Привлечённые силы и средства'), { inline: true, volatile: true }),
        text('damage', L('Шығын', 'Ущерб'), { volatile: true }),
      ],
    },
    signature(),
  ]),
  T('operational_info', ['incident'], L('Жедел ақпарат', 'Оперативная информация'), L('ЖЕДЕЛ АҚПАРАТ', 'ОПЕРАТИВНАЯ ИНФОРМАЦИЯ'), L('Оқиға бойынша жедел мәліметтер (белгілі уақытқа).', 'Оперативные сведения по происшествию на определённое время.'), [
    { key: 'head', title: L('Деректемелер', 'Реквизиты'), fields: [addressee({ required: false }), f('asOf', 'datetime', L('Уақыттағы жағдай бойынша', 'По состоянию на'), { inline: true, required: true, volatile: true })] },
    incidentWhen(),
    incidentBody(),
    people(),
    forces(),
    {
      key: 'state',
      title: L('Ақпарат мәртебесі', 'Статус информации'),
      fields: [f('preliminary', 'checkbox', L('Ақпарат нақтылануда', 'Информация уточняется'), { inline: true, volatile: true })],
    },
    signature({ title: L('Ақпаратты берген', 'Информацию передал') }),
  ]),
  T('incident_summary', ['incident'], L('Оқиға бойынша қорытынды ақпарат', 'Итоговая информация по происшествию'), L('ҚОРЫТЫНДЫ АҚПАРАТ', 'ИТОГОВАЯ ИНФОРМАЦИЯ'), L('Оқиға жойылғаннан кейінгі қорытынды мәліметтер.', 'Итоговые сведения после ликвидации происшествия.'), [
    { key: 'head', title: L('Деректемелер', 'Реквизиты'), fields: [organization(), addressee(), docDate()] },
    incidentWhen(),
    incidentBody([
      f('timeline', 'table', L('Хронология', 'Хронология'), {
        role: 'table',
        columns: [
          { key: 'time', label: L('Уақыты', 'Время') },
          { key: 'event', label: L('Оқиға', 'Событие') },
        ],
      }),
    ]),
    people(),
    forces(),
    { key: 'lessons', title: L('Қорытынды', 'Выводы'), fields: [text('lessons', L('Қорытындылар мен ұсыныстар', 'Выводы и предложения'))] },
    signature(),
  ]),

  // D. Organisational documents
  plan('plan', L('Жоспар', 'План'), L('ЖОСПАР', 'ПЛАН'), L('Жұмыс жоспары.', 'План работы.')),
  plan('events_plan', L('Іс-шаралар жоспары', 'План мероприятий'), L('ІС-ШАРАЛАР ЖОСПАРЫ', 'ПЛАН МЕРОПРИЯТИЙ'), L('Кезеңге арналған іс-шаралар тізбесі.', 'Перечень мероприятий на период.')),
  plan('event_plan', L('Іс-шараны өткізу жоспары', 'План проведения мероприятия'), L('ӨТКІЗУ ЖОСПАРЫ', 'ПЛАН ПРОВЕДЕНИЯ'), L('Бір іс-шараны (оқу-жаттығу, сабақ) өткізу жоспары.', 'План проведения одного мероприятия (учения, занятия).'), [
    f('eventDate', 'datetime', L('Өткізу уақыты', 'Время проведения'), { inline: true, required: true, volatile: true }),
    text('goal', L('Мақсаты', 'Цель'), { required: true }),
    f('participants', 'textarea', L('Қатысушылар', 'Участники'), { inline: true }),
  ], [
    { key: 'when', label: L('Уақыты', 'Время') },
    { key: 'what', label: L('Іс-қимыл', 'Действие') },
    { key: 'who', label: L('Орындаушы', 'Исполнитель') },
  ]),
  plan('action_plan', L('Іс-қимыл жоспары', 'План действий'), L('ІС-ҚИМЫЛ ЖОСПАРЫ', 'ПЛАН ДЕЙСТВИЙ'), L('Белгілі бір жағдайдағы іс-қимыл тәртібі.', 'Порядок действий в определённой ситуации.'), [
    text('situation', L('Жағдай', 'Ситуация'), { required: true }),
  ], [
    { key: 'step', label: L('Іс-қимыл', 'Действие') },
    { key: 'when', label: L('Мерзімі', 'Срок') },
    { key: 'who', label: L('Жауапты', 'Ответственный') },
  ]),
  plan('schedule', L('Кесте', 'График'), L('КЕСТЕ', 'ГРАФИК'), L('Кезекшілік, сабақ, тексеру кестесі.', 'График дежурств, занятий, проверок.'), [], [
    { key: 'date', label: L('Күні', 'Дата') },
    { key: 'what', label: L('Не', 'Что') },
    { key: 'who', label: L('Кім', 'Кто') },
  ]),
  plan('list', L('Тізбе', 'Перечень'), L('ТІЗБЕ', 'ПЕРЕЧЕНЬ'), L('Объектілер, құжаттар, мүлік тізбесі.', 'Перечень объектов, документов, имущества.'), [], [
    { key: 'name', label: L('Атауы', 'Наименование') },
    { key: 'qty', label: L('Саны', 'Количество') },
    { key: 'note', label: L('Ескертпе', 'Примечание') },
  ]),
  T('program', ['organization'], L('Бағдарлама', 'Программа'), L('БАҒДАРЛАМА', 'ПРОГРАММА'), L('Оқыту немесе іс-шара бағдарламасы.', 'Программа обучения или мероприятия.'), [
    approval(),
    { key: 'head', title: L('Атауы', 'Наименование'), fields: [organization(), subject(), text('goal', L('Мақсаты мен міндеттері', 'Цели и задачи'), { required: true }), f('audience', 'text', L('Кімге арналған', 'Для кого'), { inline: true })] },
    {
      key: 'items',
      title: L('Бағдарлама', 'Содержание программы'),
      fields: [
        planTable([
          { key: 'topic', label: L('Тақырып', 'Тема') },
          { key: 'hours', label: L('Сағат', 'Часы') },
          { key: 'form', label: L('Өткізу түрі', 'Форма проведения') },
        ]),
      ],
    },
    signature({ title: L('Әзірлеген', 'Разработал') }),
  ]),
  ruleDoc('regulation', L('Ереже', 'Положение'), L('ЕРЕЖЕ', 'ПОЛОЖЕНИЕ'), L('Бөлімшенің, комиссияның немесе байқаудың ережесі.', 'Положение о подразделении, комиссии или конкурсе.')),
  ruleDoc('instruction', L('Нұсқаулық', 'Инструкция'), L('НҰСҚАУЛЫҚ', 'ИНСТРУКЦИЯ'), L('Іс-әрекет тәртібін белгілейтін нұсқаулық.', 'Порядок действий или выполнения работ.')),

  // E. Acts and records
  act('act', L('Акт', 'Акт'), L('Комиссия анықтаған фактілерді тіркеу.', 'Фиксация фактов, установленных комиссией.'), [
    text('findings', L('Анықталғаны', 'Что установлено'), { required: true }),
  ]),
  act('inspection_act', L('Тексеріп-қарау акті', 'Акт обследования'), L('Объектіні тексеріп-қарау нәтижелері.', 'Результаты обследования объекта.'), [
    f('object', 'text', L('Объект', 'Объект'), { inline: true, required: true }),
    text('state', L('Объектінің жай-күйі', 'Состояние объекта'), { required: true }),
    text('violations', L('Анықталған кемшіліктер', 'Выявленные недостатки')),
  ]),
  act('audit_act', L('Тексеру акті', 'Акт проверки'), L('Тексеру нәтижелері мен бұзушылықтар.', 'Результаты проверки и выявленные нарушения.'), [
    f('checkedUnit', 'department', L('Тексерілген бөлімше', 'Проверяемое подразделение'), { inline: true, required: true }),
    f('checkPeriod', 'text', L('Тексеру мерзімі', 'Сроки проверки'), { inline: true, volatile: true }),
    text('findings', L('Тексеру нәтижелері', 'Результаты проверки'), { required: true }),
  ], {
    table: f('violations', 'table', L('Бұзушылықтар', 'Нарушения'), {
      role: 'table',
      columns: [
        { key: 'what', label: L('Бұзушылық', 'Нарушение') },
        { key: 'fix', label: L('Жою мерзімі', 'Срок устранения') },
      ],
    }),
  }),
  act('handover_act', L('Қабылдау-беру акті', 'Акт приёма-передачи'), L('Мүлікті, құжаттарды, істерді беру.', 'Передача имущества, документов, дел.'), [
    f('gives', 'person', L('Тапсырды', 'Передал'), { inline: true, required: true }),
    f('takes', 'person', L('Қабылдады', 'Принял'), { inline: true, required: true }),
  ], {
    approve: false,
    table: f('items', 'table', L('Берілетін мүлік', 'Передаваемое имущество'), {
      role: 'table',
      required: true,
      columns: [
        { key: 'name', label: L('Атауы', 'Наименование') },
        { key: 'qty', label: L('Саны', 'Количество') },
        { key: 'state', label: L('Жай-күйі', 'Состояние') },
      ],
    }),
  }),
  act('works_act', L('Орындалған жұмыстар акті', 'Акт выполненных работ'), L('Жұмыстардың орындалғанын растау.', 'Подтверждение выполнения работ.'), [
    f('contractor', 'organization', L('Орындаушы', 'Исполнитель'), { inline: true, required: true }),
  ], {
    approve: false,
    table: f('works', 'table', L('Жұмыстар', 'Работы'), {
      role: 'table',
      required: true,
      columns: [
        { key: 'name', label: L('Жұмыс', 'Работа') },
        { key: 'volume', label: L('Көлемі', 'Объём') },
        { key: 'date', label: L('Күні', 'Дата') },
      ],
    }),
  }),
  protocol('protocol', L('Хаттама', 'Протокол'), L('Отырыс немесе іс-шара барысын тіркеу.', 'Фиксация хода заседания или мероприятия.')),
  protocol('audit_protocol', L('Тексеру хаттамасы', 'Протокол проверки'), L('Тексеру барысын және нәтижесін тіркеу.', 'Ход и результаты проверки.'), [
    f('checkedUnit', 'department', L('Тексерілген бөлімше', 'Проверяемое подразделение'), { inline: true }),
  ]),
  protocol('meeting_protocol', L('Кеңес хаттамасы', 'Протокол совещания'), L('Кеңестің шешімдері.', 'Решения совещания.')),
  T('statement', ['acts'], L('Тізімдеме', 'Ведомость'), L('ТІЗІМДЕМЕ', 'ВЕДОМОСТЬ'), L('Көрсеткіштерді немесе берілген заттарды есепке алу.', 'Учёт показателей, выдачи имущества, оценок.'), [
    { key: 'head', title: L('Атауы', 'Наименование'), fields: [organization(), subject(), period()] },
    {
      key: 'rows',
      title: L('Кесте', 'Таблица'),
      fields: [
        f('rows', 'table', L('Жазбалар', 'Записи'), {
          role: 'table',
          required: true,
          columns: [
            { key: 'name', label: L('Аты-жөні / атауы', 'ФИО / наименование') },
            { key: 'value', label: L('Мәні', 'Значение') },
            { key: 'note', label: L('Ескертпе', 'Примечание') },
          ],
        }),
      ],
    },
    signature({ title: L('Құрастырған', 'Составил') }),
  ]),
  T('register', ['acts'], L('Тіркеу журналы', 'Журнал регистрации'), L('ТІРКЕУ ЖУРНАЛЫ', 'ЖУРНАЛ РЕГИСТРАЦИИ'), L('Құжаттарды, шақыруларды, нұсқамаларды тіркеу.', 'Регистрация документов, вызовов, инструктажей.'), [
    { key: 'head', title: L('Атауы', 'Наименование'), fields: [organization(), subject(), f('started', 'date', L('Басталған күні', 'Начат'), { inline: true })] },
    {
      key: 'rows',
      title: L('Жазбалар', 'Записи'),
      fields: [
        f('rows', 'table', L('Жазбалар', 'Записи'), {
          role: 'table',
          required: true,
          columns: [
            { key: 'no', label: L('№', '№') },
            { key: 'date', label: L('Күні', 'Дата') },
            { key: 'content', label: L('Мазмұны', 'Содержание') },
            { key: 'who', label: L('Жауапты', 'Ответственный') },
          ],
        }),
      ],
    },
  ]),

  // F. Analytics
  analytic('analytic_certificate', L('Талдамалық анықтама', 'Аналитическая справка'), L('ТАЛДАМАЛЫҚ АНЫҚТАМА', 'АНАЛИТИЧЕСКАЯ СПРАВКА'), L('Деректерді талдау және қорытынды.', 'Анализ данных и выводы.')),
  analytic('analytic_report', L('Талдамалық есеп', 'Аналитический отчёт'), L('ТАЛДАМАЛЫҚ ЕСЕП', 'АНАЛИТИЧЕСКИЙ ОТЧЁТ'), L('Кезең бойынша көрсеткіштерді жан-жақты талдау.', 'Развёрнутый анализ показателей за период.')),
  analytic('analytic_note', L('Қызметтік-талдамалық жазба', 'Служебно-аналитическая записка'), L('ҚЫЗМЕТТІК-ТАЛДАМАЛЫҚ ЖАЗБА', 'СЛУЖЕБНО-АНАЛИТИЧЕСКАЯ ЗАПИСКА'), L('Басшылыққа арналған талдау мен ұсыныстар.', 'Анализ и предложения для руководства.')),
  analytic('review', L('Шолу', 'Обзор'), L('ШОЛУ', 'ОБЗОР'), L('Оқиғалар немесе тәжірибе шолуы.', 'Обзор происшествий, практики, изменений.')),
  analytic('analytic_material', L('Ақпараттық-талдамалық материал', 'Информационно-аналитический материал'), L('АҚПАРАТТЫҚ-ТАЛДАМАЛЫҚ МАТЕРИАЛ', 'ИНФОРМАЦИОННО-АНАЛИТИЧЕСКИЙ МАТЕРИАЛ'), L('Кеңеске немесе баяндамаға арналған материал.', 'Материал к совещанию или докладу.')),

  // G. Personnel
  T('reference', ['personnel'], L('Мінездеме', 'Характеристика'), L('МІНЕЗДЕМЕ', 'ХАРАКТЕРИСТИКА'), L('Қызметкердің қызметтік мінездемесі.', 'Служебная характеристика сотрудника.'), [
    { key: 'head', title: L('Деректемелер', 'Реквизиты'), fields: [organization(), docDate()] },
    {
      key: 'employee',
      title: L('Қызметкер', 'Сотрудник'),
      fields: [
        f('employee', 'person', L('Аты-жөні', 'ФИО'), { inline: true, required: true }),
        f('employeeRank', 'rank', L('Атағы', 'Звание'), { inline: true }),
        f('employeePosition', 'position', L('Лауазымы', 'Должность'), { inline: true, required: true }),
        f('birthYear', 'number', L('Туған жылы', 'Год рождения'), { inline: true }),
        f('serviceSince', 'text', L('Қызметте (жылдан бері)', 'На службе с'), { inline: true }),
      ],
    },
    content([
      text('service', L('Қызметі', 'Служебная деятельность'), { required: true }),
      text('qualities', L('Кәсіби және жеке қасиеттері', 'Профессиональные и личные качества'), { required: true }),
      f('issuedFor', 'text', L('Ұсыну үшін', 'Для представления'), { inline: true }),
    ]),
    signature(),
  ]),
  T('personnel_report', ['personnel'], L('Жеке құрам бойынша рапорт', 'Рапорт по личному составу'), L('РАПОРТ', 'РАПОРТ'), L('Жеке құрамның қызметі мәселелері: демалыс, ауыстыру, көтермелеу.', 'Вопросы службы личного состава: отпуск, перевод, поощрение.'), [
    serviceHead(),
    content([
      f('personnelKind', 'select', L('Мәселе', 'Вопрос'), {
        inline: true,
        required: true,
        options: L(['Демалыс', 'Ауыстыру', 'Көтермелеу', 'Тәртіптік жаза', 'Іссапар', 'Басқа'], ['Отпуск', 'Перевод', 'Поощрение', 'Дисциплинарное взыскание', 'Командировка', 'Другое']),
      }),
      f('employees', 'repeating', L('Қызметкерлер', 'Сотрудники'), {
        fields: [
          f('name', 'person', L('Аты-жөні', 'ФИО')),
          f('rank', 'rank', L('Атағы', 'Звание')),
          f('position', 'position', L('Лауазымы', 'Должность')),
        ],
      }),
      text('body', L('Мәтіні', 'Текст'), { required: true }),
    ]),
    attachSection(),
    signature(),
  ]),
]

