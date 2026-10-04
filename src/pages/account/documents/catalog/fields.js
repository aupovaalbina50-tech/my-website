// Building blocks of document templates. A template is configuration, not a
// page: sections of fields, each field with a type, a role (where it goes in
// the finished document), `required` and an optional hint «Что сюда вводить?».
// Common parts — requisites, signature, approval, commission — are built
// here once and reused by every template that needs them.
//
// Field: {
//   key, type, label: {kk, ru}, required?, hint?: {kk, ru},
//   role?: 'to' | 'from' | 'approve' | 'meta' | 'subject' | 'body' | 'table' | 'signature' | 'attachments',
//   inline?  — in the document as «Label: value» instead of a bare paragraph,
//   options? — {kk: [], ru: []} for select / multiselect / radio,
//   columns? — [{key, label}] for table, fields? — sub-fields of repeating,
//   profile? — profile value offered by «Заполнить данными профиля»,
//   volatile? — facts and dates that are NOT copied into a duplicate,
// }

export const FIELD_TYPES = [
  'text',
  'textarea',
  'date',
  'time',
  'datetime',
  'number',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'person',
  'position',
  'rank',
  'organization',
  'department',
  'location',
  'file',
  'table',
  'signature',
  'repeating',
]

export const L = (kk, ru) => ({ kk, ru })

/** A field; `label` is L(kk, ru). Everything else is optional. */
export const f = (key, type, label, extra = {}) => ({ key, type, label, role: 'body', ...extra })

// ---- requisites -------------------------------------------------------------

export const addressee = (extra = {}) =>
  f('to', 'textarea', L('Кімге', 'Кому'), {
    role: 'to',
    required: true,
    hint: L(
      'Адресаттың лауазымы, атағы, тегі мен аты-жөнінің бас әріптері. Мысалы: «Төтенше жағдайлар департаментінің бастығына азаматтық қорғау полковнигі А. Б. Сейітовке».',
      'Должность, звание и фамилия с инициалами адресата в дательном падеже. Например: «Начальнику Департамента по чрезвычайным ситуациям полковнику гражданской защиты Сейтову А. Б.».',
    ),
    ...extra,
  })

export const author = (extra = {}) =>
  f('from', 'textarea', L('Кімнен', 'От кого'), {
    role: 'from',
    required: true,
    profile: 'fromLine',
    hint: L(
      'Сіздің лауазымыңыз, атағыңыз, тегіңіз және аты-жөніңіздің бас әріптері.',
      'Ваши должность, звание, фамилия и инициалы в родительном падеже: «Начальника караула ПЧ № 2 капитана гражданской защиты Иванова А. А.».',
    ),
    ...extra,
  })

export const organization = (extra = {}) =>
  f('org', 'organization', L('Ұйым (бланк)', 'Организация (бланк)'), { role: 'meta', profile: 'organization', ...extra })

export const docNumber = (extra = {}) =>
  f('number', 'text', L('Құжат нөмірі', 'Номер документа'), { role: 'meta', volatile: true, ...extra })

export const docDate = (extra = {}) =>
  f('date', 'date', L('Құжат күні', 'Дата документа'), { role: 'meta', required: true, volatile: true, ...extra })

export const docPlace = (extra = {}) =>
  f('place', 'location', L('Жасалған орны', 'Место составления'), { role: 'meta', ...extra })

export const subject = (extra = {}) =>
  f('subject', 'text', L('Тақырыбы (не туралы)', 'Тема (о чём)'), {
    role: 'subject',
    required: true,
    hint: L('Қысқа: «Оқу-жаттығуды өткізу туралы».', 'Коротко, с предлогом «о»: «О проведении учений».'),
    ...extra,
  })

/** Recipient + sender + date: the head of рапорт, записка, заявление… */
export const serviceHead = ({ number = true, org = false } = {}) => ({
  key: 'requisites',
  title: L('Деректемелер', 'Реквизиты'),
  fields: [...(org ? [organization()] : []), addressee(), author(), ...(number ? [docNumber()] : []), docDate()],
})

/** «БЕКІТЕМІН / УТВЕРЖДАЮ» block for plans, acts, programmes. */
export const approval = () => ({
  key: 'approval',
  title: L('Бекіту грифі', 'Гриф утверждения'),
  fields: [
    f('approvePosition', 'position', L('Бекітетін адамның лауазымы', 'Должность утверждающего'), { role: 'approve' }),
    f('approveName', 'person', L('Бекітетін адамның аты-жөні', 'ФИО утверждающего'), {
      role: 'approve',
      hint: L('Бас әріптері мен тегі: «А. Б. Сейітов».', 'Инициалы и фамилия: «А. Б. Сейтов».'),
    }),
    f('approveDate', 'date', L('Бекіту күні', 'Дата утверждения'), { role: 'approve', volatile: true }),
  ],
})

export const signature = ({ title = L('Қолтаңба', 'Подпись') } = {}) => ({
  key: 'signature',
  title,
  fields: [
    f('signPosition', 'position', L('Лауазымы', 'Должность'), { role: 'signature', required: true, profile: 'position' }),
    f('signRank', 'rank', L('Атағы', 'Звание'), { role: 'signature', profile: 'rank' }),
    f('signName', 'signature', L('Қол қоюшы (бас әріптері, тегі)', 'Подписант (инициалы, фамилия)'), {
      role: 'signature',
      required: true,
      profile: 'shortName',
      hint: L('Құжатта қол қоятын орын қалдырылады: «__________ А. А. Иванов».', 'В документе остаётся место для подписи: «__________ А. А. Иванов».'),
    }),
  ],
})

export const attachments = () =>
  f('attachments', 'file', L('Қосымшалар', 'Приложения'), {
    role: 'attachments',
    hint: L(
      'Құжатқа қоса берілетін материалдар. Файлдың тек атауы мен көлемі жазылады, файлдың өзі жүктелмейді.',
      'Материалы, прилагаемые к документу. Записываются только название и объём файла, сам файл не загружается.',
    ),
  })

/** Commission / participants: a repeating section of person + position. */
export const members = (key, label, extra = {}) =>
  f(key, 'repeating', label, {
    fields: [
      f('name', 'person', L('Аты-жөні', 'ФИО')),
      f('position', 'position', L('Лауазымы', 'Должность')),
    ],
    ...extra,
  })

// ---- common content fields ---------------------------------------------------

export const HINT_FACTS = L(
  'Тек нақты болған жайттарды жазыңыз. Болмаған мәліметтерді қоспаңыз.',
  'Укажите только фактические сведения. Не добавляйте того, чего не было.',
)
export const HINT_ACTIONS = L(
  'Нақты орындалған әрекеттерді көрсетіңіз. Болмаған мәліметтерді қоспаңыз.',
  'Укажите фактически выполненные действия. Не добавляйте сведения, которых не было.',
)

export const text = (key, label, extra = {}) => f(key, 'textarea', label, { hint: HINT_FACTS, ...extra })
