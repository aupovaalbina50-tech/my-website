// The result of an expertise inside the document editor and the work on it.
// Pure functions only (no React, no network): the editor keeps the check in
// state and saves it with the document (work_documents.issues), so a reload
// restores the remarks, the decisions and the history of changes.
//
// check = {
//   v: 2,
//   at,                     when the check finished
//   docLang,                language the document was checked in
//   parts: { structure, terminology, language, lookup }   'ok' | 'partial' | 'failed' | 'skipped'
//   errors: { terminology?, language?, lookup? }           error codes of failed parts
//   snapshots: { [target]: text }   the text of every checked field AT CHECK
//                           TIME — an item is applied only while its field
//                           still holds exactly this text (offsets are valid)
//   items: [item],
//   changes: [change],      applied fixes, newest last (undo works from here)
//   termsFound,             base terms found used correctly
//   glossarySize,
// }
//
// item = {
//   id, category: 'terminology' | 'language' | 'structure',
//   severity: 'error' | 'remark' | 'recommendation',
//   target,                 value path of the field ('' = the whole document)
//   label,                  field label
//   start, end, fragment,   exact range in snapshots[target]; null when the
//                           fragment could not be located unambiguously
//   suggestion, alternatives,
//   title, explanation, errorType,
//   basis: { kind: 'base' | 'kb' | 'official' | 'ai' | 'rule', term?, pair?, entry?, source? },
//   confirmation: 'base' | 'source' | 'rule' | 'ai' | 'unconfirmed',
//   confidence,             0..1 from the analysis, null when not estimated
//   factual,                the suggestion changes dates / numbers / names:
//                           never applied in one click
//   status: 'open' | 'accepted' | 'rejected' | 'edited',
// }
//
// The future (not built yet): remarks anchored in a rich-text editor and a
// side-by-side comparison of versions — the ranges and `changes` are the data
// they will need.

export const CHECK_VERSION = 2
export const CATEGORIES = ['terminology', 'language', 'structure']
export const FILTERS = ['all', 'terminology', 'language', 'structure', 'unconfirmed']

/** The stored check, or null for an old-format check of the constructor. */
export function readExpertise(raw) {
  return raw && typeof raw === 'object' && !Array.isArray(raw) && raw.v === CHECK_VERSION ? raw : null
}

export function valueAtPath(values, path) {
  const [key, row, col] = String(path).split('.')
  const v = values?.[key]
  if (row === undefined) return typeof v === 'string' ? v : v == null ? '' : String(v)
  return String(v?.[Number(row)]?.[col] ?? '')
}

export function setValueAtPath(values, path, next) {
  const [key, row, col] = String(path).split('.')
  if (row === undefined) return { ...values, [key]: next }
  const rows = Array.isArray(values?.[key]) ? values[key].map((r) => ({ ...r })) : []
  rows[Number(row)] = { ...(rows[Number(row)] ?? {}), [col]: next }
  return { ...values, [key]: rows }
}

/** The field changed after the check: its offsets no longer hold. */
export function isStale(item, check, values) {
  if (!check) return false
  if (!item.target) return Object.keys(check.snapshots ?? {}).some((t) => valueAtPath(values, t) !== check.snapshots[t])
  if (!(item.target in (check.snapshots ?? {}))) return false
  return valueAtPath(values, item.target) !== check.snapshots[item.target]
}

export const needsConfirmation = (item) => item.confirmation === 'unconfirmed' || item.confirmation === 'source'

export function matchesFilter(item, filter) {
  if (filter === 'all') return true
  if (filter === 'unconfirmed') return needsConfirmation(item)
  return item.category === filter
}

/** Open remarks that still refer to the current text. */
export const activeItems = (check, values) => (check?.items ?? []).filter((i) => i.status === 'open' && !isStale(i, check, values))

/** Counts from the actual remarks — nothing else. */
export function counts(check, values) {
  const active = activeItems(check, values)
  return {
    all: active.length,
    terminology: active.filter((i) => i.category === 'terminology').length,
    language: active.filter((i) => i.category === 'language').length,
    structure: active.filter((i) => i.category === 'structure').length,
    unconfirmed: active.filter(needsConfirmation).length,
    stale: (check?.items ?? []).filter((i) => i.status === 'open' && isStale(i, check, values)).length,
    errors: active.filter((i) => i.severity === 'error').length,
  }
}

/**
 * Final state of the check:
 *   error        neither the terminology nor the language analysis finished
 *   needs_review a part failed or was partial — the result is incomplete
 *   unconfirmed  open recommendations without base / rule confirmation
 *   issues       open remarks
 *   complete     nothing open
 */
export function expertiseState(check, values) {
  if (!check) return null
  const parts = Object.entries(check.parts ?? {}).filter(([, v]) => v !== 'skipped')
  // The template rules are local and always run; the check failed when none of
  // the analyses of the text (terminology, language) could finish.
  const analyses = parts.filter(([k]) => k === 'terminology' || k === 'language')
  if (analyses.length && analyses.every(([, v]) => v === 'failed')) return 'error'
  const c = counts(check, values)
  if (parts.some(([, v]) => v === 'failed' || v === 'partial')) return 'needs_review'
  if (c.unconfirmed) return 'unconfirmed'
  if (c.all) return 'issues'
  return 'complete'
}

/** Whether «Принять исправление» can replace exactly this range now. */
export function canApply(item, check, values) {
  if (item.status !== 'open' || item.start == null || !item.target) return false
  if (isStale(item, check, values)) return false
  return valueAtPath(values, item.target).slice(item.start, item.end) === item.fragment
}

/**
 * Replaces exactly item's range with `replacement` (the suggestion, or the
 * user's own text) — nothing else in the document changes. Other remarks of
 * the same field are shifted by the length difference; one that overlaps the
 * replaced range is no longer valid and is dropped from the open list.
 * Returns { values, check } or { error: 'stale' | 'no_range' }.
 */
export function applyItem(check, values, itemId, replacement, how = 'accepted') {
  const item = check.items.find((i) => i.id === itemId)
  if (!item || item.start == null || !item.target) return { error: 'no_range' }
  if (!canApply(item, check, values)) return { error: 'stale' }
  const before = valueAtPath(values, item.target)
  const after = before.slice(0, item.start) + replacement + before.slice(item.end)
  const delta = replacement.length - (item.end - item.start)

  const items = check.items.map((i) => {
    if (i.id === item.id) return { ...i, status: how, applied: replacement }
    if (i.target !== item.target || i.start == null) return i
    if (i.end <= item.start) return i
    if (i.start >= item.end) return { ...i, start: i.start + delta, end: i.end + delta }
    // Overlaps the replaced text: its fragment is gone.
    return i.status === 'open' ? { ...i, start: null, end: null, overlapped: true } : i
  })
  const change = {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    itemId,
    target: item.target,
    label: item.label,
    how,
    was: item.fragment,
    now: replacement,
    before,
    after,
    at: new Date().toISOString(),
    // Enough to undo exactly this step.
    itemsBefore: check.items,
    snapshotBefore: check.snapshots[item.target],
  }
  return {
    values: setValueAtPath(values, item.target, after),
    check: { ...check, items, snapshots: { ...check.snapshots, [item.target]: after }, changes: [...(check.changes ?? []), change] },
  }
}

/** Undo is possible while the field still holds the text the last change produced. */
export function canUndo(check, values) {
  const last = check?.changes?.at(-1)
  return Boolean(last && valueAtPath(values, last.target) === last.after)
}

export function undoLast(check, values) {
  if (!canUndo(check, values)) return { error: 'stale' }
  const last = check.changes.at(-1)
  return {
    values: setValueAtPath(values, last.target, last.before),
    check: {
      ...check,
      items: last.itemsBefore,
      snapshots: { ...check.snapshots, [last.target]: last.snapshotBefore },
      changes: check.changes.slice(0, -1),
    },
  }
}

export const setItemStatus = (check, itemId, status) => ({
  ...check,
  items: check.items.map((i) => (i.id === itemId ? { ...i, status } : i)),
})

/** The changes list without the undo payloads (for display). */
export const changeList = (check) =>
  (check?.changes ?? []).map((c) => {
    const rest = { ...c }
    delete rest.itemsBefore
    delete rest.snapshotBefore
    return rest
  })

/** What the document is stored with: the check minus undo payloads older than the last few steps. */
export function forStorage(check, keepUndo = 5) {
  if (!check) return check
  const changes = check.changes ?? []
  return {
    ...check,
    changes: changes.map((c, i) => (i < changes.length - keepUndo ? { ...c, itemsBefore: undefined, snapshotBefore: undefined, before: undefined } : c)),
  }
}

// ---- helpers used by the runner -------------------------------------------------

/** Every occurrence of `fragment` in `text`. */
export function occurrences(text, fragment) {
  if (!fragment) return []
  const out = []
  for (let i = text.indexOf(fragment); i !== -1; i = text.indexOf(fragment, i + 1)) out.push(i)
  return out
}

const digits = (s) => (String(s ?? '').match(/\d+/g) ?? []).join(' ')
// The polite «Вы / Ваш…» (Kazakh «Сіз / Сіздің…») is capitalised by the official style, not a name.
const POLITE = /^(Вы|Вас|Вам|Вами|Ваш\p{L}*|Сіз\p{L}*)$/u
const capitals = (s) =>
  (String(s ?? '').match(/(?<![\p{L}])\p{Lu}\p{Ll}+/gu) ?? [])
    .slice(1)
    .filter((w) => !POLITE.test(w))
    .join(' ')

/** True when a suggestion would change factual data: numbers, dates, times, names. */
export function touchesFacts(fragment, suggestion) {
  if (suggestion == null) return false
  return digits(fragment) !== digits(suggestion) || capitals(fragment) !== capitals(suggestion)
}
