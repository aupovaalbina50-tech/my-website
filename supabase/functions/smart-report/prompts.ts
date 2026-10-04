// Instructions and output schemas for «Рапортты құрастыру / Составление
// рапорта». Two AI steps:
//   extract — facts from the user's own description, verbatim-grounded
//   compose — professional wording + the draft's sections, using the site's
//             term base; missing facts stay as an explicit placeholder

// Fields of step 2, with the description given to the model. The
// frontend template (src/pages/account/smartReport/templates) uses the same keys.
export const FACTS = [
  ['date', 'дата происшествия'],
  ['time', 'время поступления сообщения (вызова)'],
  ['reportedBy', 'кто и как сообщил (очевидец по телефону 101/112, автоматическая пожарная сигнализация и т.п.)'],
  ['fireRank', 'номер (ранг) пожара / вызова'],
  ['place', 'адрес / населённый пункт / место'],
  ['object', 'объект (например, «двухэтажный жилой дом»)'],
  ['objectInfo', 'характеристика объекта: этажность, материал, собственник или владелец'],
  ['unit', 'подразделение (часть, караул)'],
  ['incidentCommander', 'руководитель тушения пожара (РТП): должность и фамилия'],
  ['departureTime', 'время выезда подразделения'],
  ['arrivalTime', 'время прибытия подразделения'],
  ['firstNozzleTime', 'время подачи первого ствола'],
  ['localizationTime', 'время локализации'],
  ['liquidationTime', 'время ликвидации'],
  ['returnTime', 'время возвращения в подразделение'],
  ['situation', 'обстановка по прибытии: что горит, задымление, угроза людям и соседним объектам'],
  ['fireArea', 'площадь пожара (на момент прибытия / при ликвидации)'],
  ['forces', 'привлечённые силы и средства: отделения, техника, личный состав'],
  ['nozzles', 'поданные стволы: количество и тип'],
  ['bafTeams', 'звенья ГДЗС (газодымозащитной службы): сколько работало'],
  ['waterSource', 'водоисточник: пожарный гидрант, водоём, автоцистерна'],
  ['cooperation', 'взаимодействующие службы: скорая помощь, полиция, газовая служба, электросети и т.п.'],
  ['rescued', 'спасено людей'],
  ['evacuated', 'эвакуировано людей'],
  ['injured', 'пострадало людей (получили травмы, отравления)'],
  ['dead', 'погибло людей'],
  ['staffInjuries', 'травмы личного состава, неисправности техники'],
  ['damage', 'ущерб: что уничтожено, что повреждено'],
  ['cause', 'предполагаемая причина пожара (если она названа в тексте)'],
  ['other', 'прочие существенные сведения'],
] as const

export const FACT_KEYS = FACTS.map(([key]) => key)

const factSchema = {
  type: 'object',
  properties: {
    value: { type: 'string', description: 'the fact, or "" if the text does not state it' },
    quote: { type: 'string', description: 'the exact fragment of the description it comes from, or ""' },
  },
  required: ['value', 'quote'],
  additionalProperties: false,
}

export const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'short neutral title of the incident, 3–8 words' },
    facts: {
      type: 'object',
      properties: Object.fromEntries(FACT_KEYS.map((k) => [k, factSchema])),
      required: [...FACT_KEYS],
      additionalProperties: false,
    },
    events: {
      type: 'array',
      description: 'chronology of what happened, in order',
      items: {
        type: 'object',
        properties: {
          time: { type: 'string', description: 'HH:MM or ""' },
          text: { type: 'string' },
        },
        required: ['time', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'facts', 'events'],
  additionalProperties: false,
}

export function extractPrompt(lang: 'kk' | 'ru'): string {
  const out = lang === 'kk' ? 'казахском' : 'русском'
  return `Ты помогаешь сотруднику МЧС Республики Казахстан (например, начальнику караула) подготовить рапорт.
Пользователь описал ситуацию своими словами. Твоя задача — только ВЫДЕЛИТЬ сведения из этого описания.

Поля:
${FACTS.map(([key, description]) => `- ${key} — ${description};`).join('\n')}

Строгие правила:
1. Бери сведения ТОЛЬКО из текста пользователя. Ничего не додумывай и не предполагай.
2. Если сведения нет — value = "" и quote = "". Не пиши «не указано», просто пустая строка.
3. quote — точный фрагмент текста пользователя, из которого взято значение.
4. Время приводи к виду ЧЧ:ММ («в 18.40», «18-40» → «18:40»).
5. value пиши на ${out} языке, кратко, без лишних слов.
6. events — хронология событий из текста по порядку, кратко, на ${out} языке.
7. title — короткое нейтральное название происшествия на ${out} языке.
8. Числа людей пиши так, как в тексте («5 человек», «нет»). Если в тексте сказано, что пострадавших или погибших нет, — value = «нет».
9. Причину пожара бери только если она прямо названа в тексте.
10. Не превращай длительность во время суток: «через 9 минут» — это не «09:00». Если сказано «через N минут после …» и время того события известно — вычисли (22:00 + 9 мин = 22:09); иначе оставь поле пустым.
11. «10 часов вечера» = 22:00, «в 9 утра» = 09:00. События после вечернего вызова без уточнения «утра» относятся к тому же вечеру или ночи.`
}

export const COMPOSE_SCHEMA = {
  type: 'object',
  properties: {
    phrasing: {
      type: 'array',
      description: 'how colloquial fragments of the description were turned into professional wording',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string', description: 'fragment of the user description, verbatim' },
          professional: { type: 'string', description: 'the same content in official service style' },
        },
        required: ['original', 'professional'],
        additionalProperties: false,
      },
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['key', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['phrasing', 'sections'],
  additionalProperties: false,
}

export interface SectionSpec {
  key: string
  title: string
  guidance: string
}

export function composePrompt(lang: 'kk' | 'ru', glossaryLines: string): string {
  const out = lang === 'kk' ? 'казахском' : 'русском'
  const placeholder = lang === 'kk' ? '[көрсетілмеген]' : '[не указано]'
  return `Ты помогаешь сотруднику МЧС Республики Казахстан составить служебный рапорт на ${out} языке.
На входе: описание ситуации словами пользователя, подтверждённые пользователем сведения (JSON) и список разделов рапорта.

Задача:
1. phrasing — 3–8 пар: фрагмент описания пользователя (дословно) → тот же смысл в официально-деловом стиле рапорта.
2. sections — текст каждого раздела из списка, в том же порядке и с теми же key.

Строгие правила:
1. Используй ТОЛЬКО факты из подтверждённых сведений и описания. Ничего не добавляй: ни времени, ни адресов, ни числа людей, ни техники.
2. Если для раздела не хватает сведения — пиши ${placeholder} на месте этого сведения. Не придумывай.
3. Профессиональные термины бери из ТЕРМИНОЛОГИЧЕСКОЙ БАЗЫ САЙТА ниже, в её написании (с нужным падежным окончанием). Не придумывай «официальные» термины, которых нет в базе; если подходящего термина в базе нет — пиши обычными точными словами.
4. Стиль: официально-деловой, как в рапорте начальника караула: от первого лица («Докладываю, что…» / «Баяндаймын, …»), прошедшее время, без эмоций и оценок.
5. Текст раздела — связный абзац без заголовка и без нумерации. Пустой раздел недопустим: если сведений нет совсем — одно предложение с ${placeholder}.
6. Пиши только на ${out} языке.

ТЕРМИНОЛОГИЧЕСКАЯ БАЗА САЙТА (рус. — каз.):
${glossaryLines}`
}
