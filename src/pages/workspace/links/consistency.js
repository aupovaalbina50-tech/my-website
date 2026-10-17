// «Контроль согласованности сведений» между связанными документами.
// Pure functions: no network, no React — the panel and the tests use them.
//
// What is compared are the facts two documents of one incident / event
// share: the date and time of the event, the place and object, the unit,
// the people and equipment counts, the times of arrival / localisation /
// liquidation, the area… Each document's own requisites (its date, its
// number, the addressee, the signature) differ by nature and are never
// compared. A fact comes from a field of the form, or from the narrative
// text when it is stated there in a recognisable way («эвакуировано 14
// человек», «прибыл в 10:25»). Values are normalised before comparing, so
// «01.10.2026» and «2026-10-01», «10.15» and «10:15», «ул. Абая, 12» and
// «ул Абая 12» are the same value and never a discrepancy.
//
// Nothing here decides which value is right.

import { fieldsOf } from '../../account/documents/catalog/index.js'

// Shared facts: slot → kind of value. A slot is also the field key the
// templates use for it, so a field of one document meets the same field —
// or the same fact in the text — of another.
export const SLOTS = {
  incidentDate: 'date',
  eventDate: 'date',
  incidentTime: 'time',
  departure: 'time',
  arrival: 'time',
  localized: 'time',
  extinguished: 'time',
  returned: 'time',
  workStart: 'datetime',
  workEnd: 'datetime',
  location: 'name',
  object: 'name',
  unit: 'name',
  checkedUnit: 'name',
  fireRank: 'name',
  fireArea: 'number',
  injured: 'number',
  dead: 'number',
  rescued: 'number',
  evacuated: 'number',
  staffCount: 'number',
  equipmentCount: 'number',
  period: 'name',
  task: 'name',
}

// Field types whose text is narrative: facts are read from it.
const NARRATIVE = new Set(['textarea', 'text'])

// ---- normalisation ----------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0')

export function normDate(raw) {
  const s = String(raw ?? '').trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  return null
}

export function normTime(raw) {
  const s = String(raw ?? '').trim().toLowerCase()
  const m = /^(\d{1,2})\s*(?:[:.]|ч\.?|час\p{L}*|сағ\.?)\s*(\d{2})(?:\s*(?:мин\.?|минут\p{L}*))?$/u.exec(s)
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return `${pad(m[1])}:${m[2]}`
}

export function normDateTime(raw) {
  const s = String(raw ?? '').trim()
  const m = /^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2}:\d{2})/.exec(s)
  if (m) return `${m[1]} ${normTime(m[2])}`
  const parts = s.split(/\s+/)
  if (parts.length === 2 && normDate(parts[0]) && normTime(parts[1])) return `${normDate(parts[0])} ${normTime(parts[1])}`
  return null
}

export function normNumber(raw) {
  const m = /-?\d+(?:[.,]\d+)?/.exec(String(raw ?? '').replace(/\s+(?=\d{3}\b)/g, ''))
  return m ? String(Number(m[0].replace(',', '.'))) : null
}

// Whole words only; \b of JS regexes does not see Cyrillic letters.
const word = (w) => new RegExp(`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`, 'gu')
const ABBR = [
  [word('ул'), 'улица'],
  [word('пр'), 'проспект'],
  [word('мкр'), 'микрорайон'],
  [word('д'), 'дом'],
  [word('г'), 'город'],
  [word('пч'), 'пожарная часть'],
]

export function normName(raw) {
  let s = String(raw ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"“”„'`]/g, '')
    .replace(/№/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
  for (const [re, full] of ABBR) s = s.replace(re, full)
  return s.replace(/\s+/g, ' ').trim() || null
}

const NORM = { date: normDate, time: normTime, datetime: normDateTime, number: normNumber, name: normName }

/** The comparable form of a value of a slot, or null when it is empty / unreadable. */
export const normalize = (slot, raw) => (SLOTS[slot] ? NORM[SLOTS[slot]](raw) : null)

// ---- facts in the narrative text --------------------------------------------------

const NUM = String.raw`(\d+)`
const TIME = String.raw`(\d{1,2}[:.]\d{2})`
// [slot, regex, index of the value group]. Only statements that name the
// fact; a bare number or time is never taken.
const TEXT_PATTERNS = [
  ['evacuated', new RegExp(String.raw`эвакуирован\p{L}*\s+${NUM}`, 'giu'), 1],
  ['evacuated', new RegExp(String.raw`${NUM}\s+(?:человек|чел\.?)\s+(?:было\s+)?эвакуирован`, 'giu'), 1],
  ['evacuated', new RegExp(String.raw`${NUM}\s+адам\s+эвакуацияланд`, 'giu'), 1],
  ['rescued', new RegExp(String.raw`спас[её]н\p{L}*\s+${NUM}`, 'giu'), 1],
  ['rescued', new RegExp(String.raw`${NUM}\s+(?:человек|чел\.?)\s+(?:было\s+)?спас[её]н`, 'giu'), 1],
  ['rescued', new RegExp(String.raw`${NUM}\s+адам\s+құтқарыл`, 'giu'), 1],
  ['injured', new RegExp(String.raw`пострадал\p{L}*\s+${NUM}`, 'giu'), 1],
  ['injured', new RegExp(String.raw`${NUM}\s+(?:человек|чел\.?)\s+пострадал`, 'giu'), 1],
  ['dead', new RegExp(String.raw`погиб\p{L}*\s+${NUM}`, 'giu'), 1],
  ['dead', new RegExp(String.raw`${NUM}\s+(?:человек|чел\.?)\s+погиб`, 'giu'), 1],
  ['arrival', new RegExp(String.raw`прибы\p{L}*(?:\s+\p{L}+){0,4}\s+в\s+${TIME}`, 'giu'), 1],
  ['localized', new RegExp(String.raw`локализован\p{L}*(?:\s+\p{L}+){0,3}\s+в\s+${TIME}`, 'giu'), 1],
  ['extinguished', new RegExp(String.raw`ликвидирован\p{L}*(?:\s+\p{L}+){0,3}\s+в\s+${TIME}`, 'giu'), 1],
  ['incidentTime', new RegExp(String.raw`(?:сообщение|вызов)\p{L}*(?:\s+\p{L}+){0,3}\s+(?:поступил\p{L}*\s+)?в\s+${TIME}`, 'giu'), 1],
  ['fireArea', new RegExp(String.raw`площад\p{L}*\s+(?:пожара\s+)?(?:составила\s+)?(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв)`, 'giu'), 1],
]

/** Facts stated in one narrative text: [{ slot, raw, start, end, fragment }]. */
export function factsInText(text) {
  const out = []
  for (const [slot, re, group] of TEXT_PATTERNS) {
    re.lastIndex = 0
    for (const m of String(text ?? '').matchAll(re)) {
      if (out.some((o) => o.start < m.index + m[0].length && m.index < o.end)) continue
      out.push({ slot, raw: m[group], start: m.index, end: m.index + m[0].length, fragment: m[0] })
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

// ---- facts of a document -------------------------------------------------------------

const label = (field, lang) => field?.label?.[lang] ?? field?.label?.ru ?? field?.key ?? ''

/**
 * Every shared fact of a document: from its fields first, then from its
 * narrative texts. [{ slot, value, raw, fragment, field, label, origin }]
 */
export function factsOf(template, values, lang = 'ru') {
  const facts = []
  const fields = fieldsOf(template)
  for (const field of fields) {
    if (!SLOTS[field.key]) continue
    const raw = values?.[field.key]
    const value = normalize(field.key, raw)
    if (value == null) continue
    facts.push({ slot: field.key, value, raw: String(raw), fragment: String(raw), field: field.key, label: label(field, lang), origin: 'field' })
  }
  for (const field of fields) {
    if (!NARRATIVE.has(field.type) || SLOTS[field.key]) continue
    const text = values?.[field.key]
    if (typeof text !== 'string' || !text.trim()) continue
    for (const f of factsInText(text)) {
      const value = normalize(f.slot, f.raw)
      if (value == null) continue
      facts.push({ slot: f.slot, value, raw: f.raw, fragment: f.fragment, field: field.key, label: label(field, lang), origin: 'text', start: f.start, end: f.end })
    }
  }
  return facts
}

/** One fact per slot: the field when the form has it, else the first mention in the text. */
function primary(facts) {
  const bySlot = new Map()
  for (const f of facts) {
    const cur = bySlot.get(f.slot)
    if (!cur || (cur.origin === 'text' && f.origin === 'field')) bySlot.set(f.slot, f)
  }
  return bySlot
}

/** The id of a discrepancy: the slot and both values, the documents in the stored (sorted) order. */
export function discrepancyId(slot, aId, aValue, bId, bValue) {
  return aId < bId ? `${slot}|${aValue}|${bValue}` : `${slot}|${bValue}|${aValue}`
}

/**
 * Compares two documents. `a` and `b` are { id, template, values, lang }.
 * Returns { matches: [{ slot, kind, a, b }], discrepancies: [{ id, slot,
 * kind, a, b }] } — a and b are the facts (with their fragments) of each
 * document. Only slots both documents state are compared.
 */
export function compareDocuments(a, b) {
  const pa = primary(factsOf(a.template, a.values, a.lang))
  const pb = primary(factsOf(b.template, b.values, b.lang))
  const matches = []
  const discrepancies = []
  for (const [slot, fa] of pa) {
    const fb = pb.get(slot)
    if (!fb) continue
    const kind = SLOTS[slot]
    if (fa.value === fb.value) matches.push({ slot, kind, a: fa, b: fb })
    else discrepancies.push({ id: discrepancyId(slot, a.id, fa.value, b.id, fb.value), slot, kind, a: fa, b: fb })
  }
  return { matches, discrepancies }
}

/** The stored decision on a discrepancy — only while both values are still the ones decided on. */
export const decisionFor = (link, discrepancy) => link?.decisions?.[discrepancy.id] ?? null

// ---- transfer ----------------------------------------------------------------------

/**
 * The values of `source` that may be transferred into `target`: shared
 * facts that are fields in both forms and filled in the source. Each item
 * says what the target holds now; nothing is selected or applied here.
 */
export function transferable(source, target) {
  const targetFields = new Map(fieldsOf(target.template).map((f) => [f.key, f]))
  const out = []
  for (const field of fieldsOf(source.template)) {
    if (!SLOTS[field.key] || !targetFields.has(field.key)) continue
    const raw = source.values?.[field.key]
    if (normalize(field.key, raw) == null) continue
    const current = target.values?.[field.key] ?? ''
    out.push({
      key: field.key,
      label: label(targetFields.get(field.key), target.lang),
      value: String(raw),
      current: String(current),
      same: normalize(field.key, current) === normalize(field.key, raw),
    })
  }
  return out
}

/**
 * The target values with the chosen transfers applied and their origin
 * recorded in values.__provenance[key] — nothing else changes.
 */
export function applyTransfer(targetValues, items, source, at = new Date().toISOString()) {
  const next = { ...targetValues }
  const provenance = { ...(targetValues?.__provenance ?? {}) }
  for (const item of items) {
    next[item.key] = item.value
    provenance[item.key] = { documentId: source.id, title: source.title, label: item.label, value: item.value, at }
  }
  next.__provenance = provenance
  return next
}

/**
 * What became of each transferred value: 'kept' (the field still holds
 * it), 'edited' (changed in this document since), and — when the source
 * document is known — 'source_changed' (the source now holds another
 * value). [{ key, ...provenance, state, sourceValue }]
 */
export function provenanceState(values, sources = new Map()) {
  return Object.entries(values?.__provenance ?? {}).map(([key, p]) => {
    const source = sources.get(p.documentId)
    const now = values?.[key]
    let state = normalize(key, now) === normalize(key, p.value) ? 'kept' : 'edited'
    let sourceValue = null
    if (source && state === 'kept') {
      sourceValue = source.values?.[key] ?? ''
      if (normalize(key, sourceValue) !== normalize(key, p.value)) state = 'source_changed'
    }
    return { key, ...p, state, sourceValue, sourceMissing: !source && p.documentId != null }
  })
}

// ---- staleness ------------------------------------------------------------------------

/** The other document changed after this side last reviewed the link. */
export function isOutdated(link, selfId, other) {
  // Never reviewed from this side: the moment of linking is the reference.
  const seen = link?.reviewed?.[selfId] ?? link?.created_at
  if (!other?.updated_at || !seen) return false
  return new Date(other.updated_at) > new Date(seen)
}

/** The ordered pair stored in the table. */
export const orderedPair = (x, y) => (x < y ? [x, y] : [y, x])
