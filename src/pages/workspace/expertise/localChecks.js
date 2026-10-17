// Checks of the text that need no AI: normative references against the
// registry of sources (public.kb_sources) and the consistency of numbers and
// dates. Pure functions; the runner passes the registry in.
//
// A reference the registry cannot confirm is never called wrong: it is a
// question for the specialist («Требуется проверка актуальности»).

import { actualityOf } from '../sources/actuality.js'

// Any character of a sentence; a dot only inside a dotted date («03.05.2020»).
const C = String.raw`(?:[^.;\n]|(?<=\d)\.(?=\d))`

const REF_RU = new RegExp(
  String.raw`(?:[Зз]акон(?:а|у|ом|е|ы|ов|ами)?|[Кк]одекс(?:а|у|ом|е)?|Конституци(?:я|и|ю|ей)|Указ(?:а|у|ом|е)?|[Пп]остановлени(?:е|я|ю|ем|и)|[Пп]риказ(?:а|у|ом|е|ы|ов)?|Правил(?:а|ам|ами|ах)?|Инструкци(?:я|и|ю|ей))(?=[\s«"])${C}{0,220}?(?:№\s*[\p{L}\d\-/]+|«[^»\n]{3,200}»)(?:${C}{0,80}?№\s*[\p{L}\d\-/]+)?`,
  'gu',
)
const REF_KK = new RegExp(
  String.raw`(?:«[^»\n]{3,200}»\s*)?(?:Қазақстан Республикасының${C}{0,160}?(?:Заңы|Заңына|Заңында|Заңымен|Кодексі|Кодексіне|Кодексінде|Жарлығы|қаулысы|қаулысымен|бұйрығы|бұйрығымен|Қағидалары|Қағидаларына)|(?:Министрінің|министрінің|Үкіметінің)${C}{0,160}?(?:бұйрығы|бұйрығымен|қаулысы|қаулысымен))(?:${C}{0,80}?№\s*[\p{L}\d\-/]+)?`,
  'gu',
)

const MONTHS = { январ: 1, феврал: 2, март: 3, апрел: 4, ма: 5, июн: 6, июл: 7, август: 8, сентябр: 9, октябр: 10, ноябр: 11, декабр: 12 }

const normNumber = (s) => String(s ?? '').replace(/[№\s]/g, '').toUpperCase()
const lower = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е')

/** The parts of a reference that can be compared with the registry. */
export function parseReference(fragment) {
  const number = /№\s*([\p{L}\d\-/]+)/u.exec(fragment)?.[1] ?? null
  const title = /«([^»]+)»/u.exec(fragment)?.[1] ?? null
  let date = null
  const dotted = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(fragment)
  if (dotted) date = `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`
  else {
    const worded = /(\d{1,2})\s+(\p{L}+)\s+(\d{4})/u.exec(fragment)
    const month = worded && Object.entries(MONTHS).find(([stem]) => lower(worded[2]).startsWith(stem))?.[1]
    if (month) date = `${worded[3]}-${String(month).padStart(2, '0')}-${worded[1].padStart(2, '0')}`
  }
  return { number, title, date }
}

/** The registry entry a reference names: by number first, then by its quoted title. */
export function matchSource(ref, registry) {
  if (ref.number) {
    const n = normNumber(ref.number)
    const byNumber = registry.find((s) => normNumber(s.doc_number) === n)
    if (byNumber) return { source: byNumber, by: 'number' }
  }
  if (ref.title && ref.title.length >= 6) {
    const t = lower(ref.title)
    const byTitle = registry.find((s) => lower(s.title_ru).includes(t) || lower(s.title_kk).includes(t))
    if (byTitle) return { source: byTitle, by: 'title' }
  }
  return null
}

/** Every normative reference in the text, with offsets. */
export function findReferences(text) {
  const out = []
  for (const re of [REF_RU, REF_KK]) {
    re.lastIndex = 0
    for (const m of text.matchAll(re)) {
      const start = m.index
      const end = start + m[0].length
      if (out.some((r) => start < r.end && r.start < end)) continue
      out.push({ start, end, fragment: m[0] })
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

/**
 * References of every block → { references, items }. `references` lists
 * all of them (shown in the panel with their source); `items` are remarks
 * for the ones that need the specialist.
 */
export function referenceChecks(blocks, registry, c, nextId) {
  const references = []
  const items = []
  const base = { category: 'structure', group: 'references', alternatives: [], suggestion: null, confidence: null, factual: true, status: 'open' }
  for (const block of blocks) {
    for (const r of findReferences(block.text)) {
      const parsed = parseReference(r.fragment)
      const match = registry ? matchSource(parsed, registry) : null
      const source = match?.source ?? null
      const actuality = registry ? actualityOf(source) : 'registry_failed'
      references.push({ target: block.key, label: block.label, fragment: r.fragment, parsed, source, actuality })
      const where = { ...base, id: nextId('r'), target: block.key, label: block.label, start: r.start, end: r.end, fragment: r.fragment }
      if (source && parsed.number && source.doc_number && normNumber(parsed.number) !== normNumber(source.doc_number)) {
        items.push({
          ...where,
          severity: 'error',
          title: c.refNumberMismatch,
          explanation: c.refNumberMismatchReason(source.doc_number),
          basis: { kind: 'registry', source },
          confirmation: 'rule',
        })
        continue
      }
      if (actuality === 'confirmed') continue
      items.push({
        ...where,
        severity: actuality === 'outdated' ? 'error' : 'remark',
        title: actuality === 'outdated' ? c.refOutdated : c.refNeedsCheck,
        explanation: c.refReason[actuality],
        basis: source ? { kind: 'registry', source } : { kind: 'unverified_reference' },
        confirmation: actuality === 'outdated' ? 'rule' : 'unconfirmed',
      })
    }
  }
  return { references, items }
}

// ---- numbers and dates --------------------------------------------------------

const RU_UNITS = { ноль: 0, один: 1, одна: 1, одно: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19 }
const RU_TENS = { двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90 }
const KK_UNITS = { нөл: 0, бір: 1, екі: 2, үш: 3, төрт: 4, бес: 5, алты: 6, жеті: 7, сегіз: 8, тоғыз: 9 }
const KK_TENS = { он: 10, жиырма: 20, отыз: 30, қырық: 40, елу: 50, алпыс: 60, жетпіс: 70, сексен: 80, тоқсан: 90 }

/** «двадцать три» → 23; null when the words are not a number below 100 the checker knows. */
export function wordsToNumber(words) {
  const parts = lower(words).trim().split(/\s+/)
  if (!parts.length || parts.length > 2) return null
  const tens = { ...RU_TENS, ...KK_TENS }
  const units = { ...RU_UNITS, ...KK_UNITS }
  if (parts.length === 1) return parts[0] in units ? units[parts[0]] : parts[0] in tens ? tens[parts[0]] : null
  if (parts[0] in tens && parts[1] in units && units[parts[1]] > 0 && units[parts[1]] < 10) return tens[parts[0]] + units[parts[1]]
  return null
}

const validDate = (d, m, y) => {
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/** «3 (пять)», «31.02.2026», «25:70» — contradictions inside the text itself. */
export function consistencyChecks(blocks, c, nextId) {
  const items = []
  const base = { category: 'structure', group: 'consistency', alternatives: [], suggestion: null, confidence: null, factual: true, status: 'open', basis: { kind: 'rule', rule: 'numbers' }, confirmation: 'rule', severity: 'error' }
  for (const block of blocks) {
    const at = (m) => ({ ...base, id: nextId('n'), target: block.key, label: block.label, start: m.index, end: m.index + m[0].length, fragment: m[0] })
    for (const m of block.text.matchAll(/(\d{1,2})\s*\(\s*([\p{L}]+(?:\s+[\p{L}]+)?)\s*\)/gu)) {
      const n = wordsToNumber(m[2])
      if (n != null && n !== Number(m[1])) items.push({ ...at(m), title: c.numberWordsMismatch, explanation: c.numberWordsMismatchReason(m[1], m[2]) })
    }
    for (const m of block.text.matchAll(/(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d.])/g)) {
      if (!validDate(Number(m[1]), Number(m[2]), Number(m[3]))) items.push({ ...at(m), title: c.invalidDate, explanation: c.invalidDateReason })
    }
    for (const m of block.text.matchAll(/(?<![\d:.])(\d{1,2}):(\d{2})(?![\d:])/g)) {
      if (Number(m[1]) > 23 || Number(m[2]) > 59) items.push({ ...at(m), title: c.invalidTime, explanation: c.invalidTimeReason })
    }
  }
  return items
}
