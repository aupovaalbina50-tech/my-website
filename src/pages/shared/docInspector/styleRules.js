// «Справочник служебной лексики»: jargon, colloquial and descriptive names of
// professional notions, and colloquial service phrases that keep turning up
// in reports. Checked in the browser, without AI, so a check finds them even
// when the AI pass is unavailable or quiet.
//
// Each rule: `re` finds the phrase (Russian, any case), `official` is the
// wording to use, `reason` explains it. `forms` maps a matched phrase (lower
// case) to its replacement in the same grammatical form; only such a
// verified form may be written into the document, any other form is left
// for the user to rephrase.

const L = '[а-яёА-ЯЁ]*'

export const STYLE_RULES = [
  {
    id: 'rtp',
    re: new RegExp(`главн${L}\\s+тушител${L}(\\s+пожара)?`, 'giu'),
    official: 'руководитель тушения пожара (РТП)',
    kind: 'unofficial_variant',
    reason: 'Термина «главный тушитель» нет: должностное лицо, управляющее силами на пожаре, — руководитель тушения пожара (РТП).',
    forms: {
      'главный тушитель пожара': 'руководитель тушения пожара',
      'главного тушителя пожара': 'руководителя тушения пожара',
      'главному тушителю пожара': 'руководителю тушения пожара',
      'главным тушителем пожара': 'руководителем тушения пожара',
    },
  },
  {
    id: 'booth',
    re: new RegExp(`(одноэтажн${L}\\s+)?будк${L}-склад${L}`, 'giu'),
    official: 'складское здание',
    kind: 'usage',
    reason: '«Будка» — мелкое подсобное или караульное помещение; для складского объекта используется «складское здание».',
    forms: { 'будка-склад': 'складское здание', 'одноэтажная будка-склад': 'одноэтажное складское здание' },
  },
  {
    id: 'rank',
    re: new RegExp(`(ранг${L}\\s+пожарной\\s+опасности|уров${L}\\s+сложности)`, 'giu'),
    official: 'номер (ранг) пожара',
    kind: 'unofficial_variant',
    reason: 'Сложность пожара указывается номером (рангом) пожара по установленной шкале, например «Номер (ранг) пожара — № 2», а не «уровнем сложности».',
    forms: { 'ранг пожарной опасности': 'номер (ранг) пожара' },
  },
  {
    id: 'brigade',
    re: new RegExp(`бригад${L}\\s+спасател${L}`, 'giu'),
    official: 'дежурный караул',
    kind: 'unofficial_variant',
    reason: '«Бригада» характерна для медицинской или ремонтной службы; пожарно-спасательные силы действуют в составе караулов и отделений.',
    forms: {
      'бригада спасателей': 'дежурный караул',
      'бригады спасателей': 'дежурного караула',
      'бригаду спасателей': 'дежурный караул',
      'бригадой спасателей': 'дежурным караулом',
    },
  },
  {
    id: 'first_nozzle',
    re: /включени[а-яё]*\s+первого\s+водного\s+пистолета/giu,
    official: 'подача первого ствола',
    kind: 'unofficial_variant',
    reason: 'Этап боевых действий фиксируется как подача первого ствола на тушение, а не «включение пистолета».',
    forms: { 'включение первого водного пистолета': 'подача первого ствола' },
  },
  {
    id: 'nozzle',
    re: new RegExp(`(водн${L}|водян${L})\\s+(пистолет${L}|ствол${L})`, 'giu'),
    official: 'пожарный ствол',
    kind: 'unofficial_variant',
    reason: 'Устройство для формирования и направления струи огнетушащего вещества — пожарный ствол (с указанием типа: ствол «А», ствол «Б»).',
    forms: {
      'водный пистолет': 'пожарный ствол',
      'водного пистолета': 'пожарного ствола',
      'водяной ствол': 'пожарный ствол',
      'водяного ствола': 'пожарного ствола',
      'водяных ствола': 'пожарных ствола',
      'водяные стволы': 'пожарные стволы',
    },
  },
  {
    id: 'stop_burning',
    re: new RegExp(`остановк${L}\\s+горения`, 'giu'),
    official: 'локализация пожара',
    kind: 'unofficial_variant',
    reason: 'Момент, когда распространение горения прекращено, — локализация пожара.',
    forms: { 'остановка горения': 'локализация пожара', 'остановки горения': 'локализации пожара' },
  },
  {
    id: 'extinguished',
    re: new RegExp(`(окончательн${L}\\s+)?потушени${L}(\\s+пожара)?`, 'giu'),
    official: 'ликвидация пожара',
    kind: 'unofficial_variant',
    reason: 'Полное прекращение горения фиксируется как ликвидация пожара.',
    forms: { 'окончательное потушение пожара': 'ликвидация пожара', 'окончательного потушения пожара': 'ликвидации пожара' },
  },
  {
    id: 'breathing',
    re: new RegExp(`дыхательн${L}\\s+костюм${L}(\\s+кислородного\\s+типа)?`, 'giu'),
    official: 'средства индивидуальной защиты органов дыхания (СИЗОД)',
    kind: 'unofficial_variant',
    reason: '«Дыхательных костюмов» нет: используются СИЗОД — дыхательные аппараты на сжатом воздухе или изолирующие противогазы.',
    forms: {
      'дыхательных костюмах кислородного типа': 'средствах индивидуальной защиты органов дыхания (СИЗОД)',
      'дыхательные костюмы кислородного типа': 'средства индивидуальной защиты органов дыхания (СИЗОД)',
    },
  },
  {
    id: 'evacuating',
    re: new RegExp(`эвакуировани${L}`, 'giu'),
    official: 'эвакуация',
    kind: 'usage',
    reason: 'Отглагольное «эвакуирование» в служебных документах не употребляется: «эвакуация людей».',
    forms: { эвакуирование: 'эвакуацию' },
  },
  {
    id: 'carry_out',
    re: new RegExp(`переносн${L}\\s+извлечени${L}`, 'giu'),
    official: 'вынос пострадавшего из опасной зоны',
    kind: 'usage',
    reason: 'Неуклюжий оборот: в рапорте пишется «вынос пострадавшего из опасной зоны» или «спасение пострадавшего».',
    forms: {},
  },
  {
    id: 'walk',
    re: /не\s+мог\s+совершать\s+ходьбу/giu,
    official: 'не мог передвигаться самостоятельно',
    kind: 'usage',
    reason: 'Канцелярская громоздкость: «не мог передвигаться самостоятельно».',
    forms: { 'не мог совершать ходьбу': 'не мог передвигаться самостоятельно' },
  },
  {
    id: 'victim',
    re: new RegExp(`потерпевш${L}`, 'giu'),
    official: 'пострадавший',
    kind: 'usage',
    reason: '«Потерпевший» — процессуальный (уголовно-правовой) термин; в рапорте о ЧС — «пострадавший».',
    forms: {
      потерпевший: 'пострадавший',
      потерпевшего: 'пострадавшего',
      потерпевшему: 'пострадавшему',
      потерпевшим: 'пострадавшим',
      потерпевшие: 'пострадавшие',
      потерпевших: 'пострадавших',
    },
  },
  {
    id: 'ambulance',
    re: new RegExp(`врачебн${L}\\s+сотрудник${L}\\s+скорой\\s+помощи`, 'giu'),
    official: 'бригада скорой медицинской помощи',
    kind: 'unofficial_variant',
    reason: 'Пострадавший передаётся бригаде скорой медицинской помощи (СМП).',
    forms: { 'врачебным сотрудникам скорой помощи': 'бригаде скорой медицинской помощи' },
  },
  {
    id: 'killed',
    re: /убит[а-яё]*\s+не\s+имеется/giu,
    official: 'погибших нет',
    kind: 'usage',
    reason: '«Убитые» — криминальная лексика; о жертвах пожара или ЧС пишут «погибшие»: «погибших нет».',
    forms: { 'убитых не имеется': 'погибших нет' },
  },
  {
    id: 'arrival',
    re: /по\s+прибытию/giu,
    official: 'по прибытии',
    kind: 'usage',
    reason: 'Предлог «по» в значении «после» требует предложного падежа: «по прибытии».',
    forms: { 'по прибытию': 'по прибытии' },
  },
  {
    id: 'pouring_hearth',
    re: new RegExp(`заливк${L}\\s+очага`, 'giu'),
    official: 'тушение',
    kind: 'unofficial_variant',
    reason: 'Бытовое «заливка очага»: ствол подаётся на тушение.',
    forms: { 'заливку очага': 'тушение', 'заливка очага': 'тушение' },
  },
  {
    id: 'pouring',
    re: new RegExp(`полива(ни${L}|ть|ли|л)`, 'giu'),
    official: 'охлаждение',
    kind: 'unofficial_variant',
    reason: 'Защита соседних ёмкостей и конструкций водой — охлаждение.',
    forms: { поливание: 'охлаждение' },
  },
  {
    id: 'barrels',
    re: new RegExp(`бочк${L}\\s+с\\s+соляркой|бочек\\s+с\\s+соляркой`, 'giu'),
    official: 'ёмкости с дизельным топливом',
    kind: 'unofficial_variant',
    reason: 'Разговорное «бочки с соляркой»: технологические ёмкости (резервуары) с дизельным топливом (ГСМ).',
    forms: { 'бочек с соляркой': 'ёмкостей с дизельным топливом' },
  },
  {
    id: 'admin',
    re: new RegExp(`админ-корпус${L}`, 'giu'),
    official: 'административное здание',
    kind: 'usage',
    reason: 'Разговорное сокращение «админ-корпус» в служебном документе не используется.',
    forms: { 'админ-корпуса': 'административного здания', 'админ-корпус': 'административное здание' },
  },
  {
    id: 'hose_hookup',
    re: new RegExp(`подцеплени${L}\\s+шланга`, 'giu'),
    official: 'прокладка рукавной линии',
    kind: 'unofficial_variant',
    reason: 'Пожарные прокладывают рукавные линии от пожарного гидранта; «подцепление шланга» — бытовое описание.',
    forms: {},
  },
  {
    id: 'hydrant',
    re: new RegExp(`водопроводн${L}\\s+кран${L}`, 'giu'),
    official: 'пожарный гидрант (ПГ)',
    kind: 'unofficial_variant',
    reason: 'Источник наружного противопожарного водоснабжения — пожарный гидрант (ПГ), а не «водопроводный кран».',
    forms: { 'водопроводному крану': 'пожарному гидранту', 'водопроводный кран': 'пожарный гидрант', 'водопроводного крана': 'пожарного гидранта' },
  },
  {
    id: 'hose',
    re: new RegExp(`(водн${L}\\s+|водян${L}\\s+)?шланг${L}`, 'giu'),
    official: 'пожарный рукав',
    kind: 'unofficial_variant',
    reason: 'Пожарные используют пожарные рукава, а не «шланги».',
    forms: { 'водные шланги': 'пожарные рукава', шланги: 'рукава', шланга: 'рукава', шланг: 'рукав' },
  },
  {
    id: 'militia',
    re: new RegExp(`милици${L}`, 'giu'),
    official: 'полиция',
    kind: 'usage',
    reason: 'Устаревшее наименование: в Республике Казахстан — полиция (органы внутренних дел).',
    forms: { милиции: 'полиции', милиция: 'полиция', милицию: 'полицию' },
  },
  {
    id: 'smoking',
    re: new RegExp(`несанкционированн${L}\\s+раскуривани${L}\\s+табачных\\s+изделий(\\s+в\\s+неустановленном\\s+месте)?`, 'giu'),
    official: 'неосторожное обращение с огнём при курении',
    kind: 'usage',
    reason: 'Причина пожара формулируется установленно: «неосторожное обращение с огнём при курении».',
    forms: {
      'несанкционированное раскуривание табачных изделий в неустановленном месте': 'неосторожное обращение с огнём при курении',
    },
  },
  {
    id: 'roof',
    re: /испортилась\s+крыша/giu,
    official: 'повреждена кровля',
    kind: 'usage',
    reason: 'Ущерб описывается через повреждённые конструкции: «повреждена кровля здания» (с площадью).',
    forms: { 'испортилась крыша': 'повреждена кровля' },
  },
  {
    id: 'boxes',
    re: /сгорели\s+коробки/giu,
    official: 'уничтожена продукция в картонной таре',
    kind: 'usage',
    reason: 'Материальный ущерб описывается точно: что уничтожено или повреждено и в каком объёме.',
    forms: { 'сгорели коробки': 'уничтожена продукция в картонной таре' },
  },
  {
    id: 'intact',
    re: /наход[а-яё]*\s+в\s+целостности/giu,
    official: 'исправны',
    kind: 'usage',
    reason: 'Состояние техники и вооружения: «исправны», «повреждений не имеют».',
    forms: { 'находятся в целостности': 'исправны' },
  },
  {
    id: 'fire_cars',
    re: new RegExp(`пожарн${L}\\s+машин${L}`, 'giu'),
    official: 'пожарный автомобиль',
    kind: 'unofficial_variant',
    reason: 'Официальное наименование техники — пожарный автомобиль (пожарная автоцистерна и т. д.).',
    forms: { 'пожарные машины': 'пожарные автомобили', 'пожарная машина': 'пожарный автомобиль', 'пожарной машины': 'пожарного автомобиля' },
  },
  {
    id: 'fighters',
    re: new RegExp(`(человек\\s+)?бойц${L}`, 'giu'),
    official: 'личный состав',
    kind: 'unofficial_variant',
    reason: 'В служебных документах — личный состав (пожарные, спасатели), а не «бойцы».',
    forms: {},
  },
  {
    id: 'barracks',
    re: new RegExp(`казарм${L}`, 'giu'),
    official: 'место постоянной дислокации подразделения',
    kind: 'unofficial_variant',
    reason: 'Подразделение возвращается в место постоянной дислокации (пожарную часть), а не в «казарму».',
    forms: {},
  },
  {
    id: 'current',
    re: /замыкани[а-яё]*\s+электротока/giu,
    official: 'короткое замыкание электропроводки',
    kind: 'usage',
    reason: 'Замыкает электропроводка или электрооборудование, а не «электроток».',
    forms: {},
  },
]

/** A style rule's pseudo term (not a base term: never added to the dictionary). */
export function isStyleTerm(term) {
  return typeof term?.id === 'string' && term.id.startsWith('style:')
}

const capitalize = (text, like) => (like[0] && like[0] !== like[0].toLowerCase() ? text[0].toUpperCase() + text.slice(1) : text)

function sentenceAround(text, start, end) {
  let from = start
  while (from > 0 && start - from < 220 && !/[.!?\n•]/.test(text[from - 1])) from--
  let to = end
  while (to < text.length && to - end < 220 && !/[.!?\n•]/.test(text[to])) to++
  return text.slice(from, Math.min(text.length, to + 1)).trim()
}

/**
 * Findings of the rules in the pages, as inspection results. A longer rule
 * comes first in STYLE_RULES, so a phrase is reported once.
 */
export function styleFindings(pages) {
  const found = []
  for (const page of pages) {
    const taken = []
    for (const rule of STYLE_RULES) {
      for (const m of page.text.matchAll(rule.re)) {
        const start = m.index
        const end = start + m[0].length
        // Whole words only: not the tail of a longer word.
        if (start > 0 && /[\p{L}\p{N}]/u.test(page.text[start - 1])) continue
        if (taken.some((t) => start < t.end && t.start < end)) continue
        taken.push({ start, end })
        const text = m[0]
        const form = rule.forms[text.toLowerCase().replace(/\s+/g, ' ')]
        const suggestion = form ? capitalize(form, text) : null
        const term = { id: `style:${rule.id}`, ru: rule.official, kk: null, en: null, category: 'style' }
        const candidate = { suggestion, official: rule.official, term, difference: '', applicable: Boolean(suggestion) }
        found.push({
          page: page.number,
          start,
          end,
          text,
          status: 'review',
          matchType: 'semantic',
          confidence: 0.95,
          level: 'high',
          candidates: [candidate],
          suggestion,
          official: rule.official,
          term,
          errorType: rule.kind,
          explanation: rule.reason,
          context: sentenceAround(page.text, start, end),
          meaningPreserved: true,
          source: 'style',
        })
      }
    }
  }
  return found
}

/**
 * Adds the rule findings to the check's results: a phrase the AI already
 * reported keeps the AI's finding; base matches inside a jargon phrase
 * («пожара» in «главный тушитель пожара») give way to it.
 */
export function mergeStyleFindings(results, pages) {
  const style = styleFindings(pages).filter(
    (s) => !results.some((r) => r.status !== 'ok' && r.page === s.page && s.start < r.end && r.start < s.end),
  )
  const kept = results.filter((r) => r.status !== 'ok' || !style.some((s) => s.page === r.page && s.start <= r.start && r.end <= s.end))
  return [...kept, ...style]
}
