// The constructor's step-by-step flow, kept inside the document itself
// (values.__flow — never rendered, never checked), so closing the page and
// coming back restores the method, the step, the user's own description and
// what was generated:
//
//   __flow = {
//     method:  'form' | 'text'      «Заполнить форму» / «Описать ситуацию своими словами»
//     stage:   one of STAGES        the step the user was on
//     brief:   string               the user's description, kept as written
//     fromText: { [key]: quote }    values taken from the description that the
//                                   user has not yet marked as checked
//     gen:     { [key]: { text, at } }   what the AI generated for a field —
//                                   a field whose text differs was edited by the user
//     genBasis: string              fingerprint of the data the draft was made from
//   }
//
// Steps 1–2 (type, method) happen in the catalog before the document exists.

import { fieldsOf } from '../../account/documents/catalog/index.js'
import { isEmptyValue, missingRequired } from '../../account/documents/render.js'

export const FLOW_KEY = '__flow'
export const STAGES = ['info', 'complete', 'draft', 'preview', 'check', 'export']

const DEFAULT_FLOW = { method: 'form', stage: 'info', brief: '', fromText: {}, gen: {}, genBasis: null }

export const readFlow = (values) => ({ ...DEFAULT_FLOW, ...(values?.[FLOW_KEY] ?? {}) })

export const withFlow = (values, patch) => ({ ...values, [FLOW_KEY]: { ...readFlow(values), ...patch } })

const FACT_TYPES = new Set(['date', 'time', 'datetime', 'number', 'person', 'position', 'rank', 'organization', 'department', 'location', 'signature', 'file', 'checkbox', 'select', 'radio', 'multiselect', 'table', 'repeating'])

/** Fields the AI may write as connected text: free-text parts of the body. Requisites and facts are never generated. */
export function narrativeFields(template) {
  return fieldsOf(template).filter((f) => f.type === 'textarea' && (f.role ?? 'body') === 'body' && !FACT_TYPES.has(f.type))
}

const text = (v) => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v))

/** Fingerprint of what the draft is made from: every non-narrative value + the description. */
export function dataBasis(template, values) {
  const narrative = new Set(narrativeFields(template).map((f) => f.key))
  const parts = fieldsOf(template)
    .filter((f) => !narrative.has(f.key))
    .map((f) => `${f.key}=${text(values?.[f.key])}`)
  parts.push(`brief=${readFlow(values).brief}`)
  let h = 0
  for (const ch of parts.join('\u0001')) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0
  return String(h)
}

/** 'empty' | 'user' (written by the user) | 'generated' (as the AI wrote it) | 'edited' (generated, then changed). */
export function fieldOrigin(key, values) {
  const value = text(values?.[key]).trim()
  const gen = readFlow(values).gen?.[key]
  if (!value) return 'empty'
  if (!gen) return 'user'
  return gen.text.trim() === value ? 'generated' : 'edited'
}

/** Narrative fields whose text the user wrote or changed: a new draft must not replace them silently. */
export const protectedFields = (template, values) => narrativeFields(template).filter((f) => ['user', 'edited'].includes(fieldOrigin(f.key, values)))

/** «Уточняющие вопросы»: one per required field still empty, in the order of the template. */
export function questions(template, values) {
  const fields = fieldsOf(template)
  return missingRequired(template, values).map((key) => fields.find((f) => f.key === key)).filter(Boolean)
}

/** Values taken from the description and not yet checked by the user. */
export function unconfirmed(template, values) {
  const fromText = readFlow(values).fromText ?? {}
  return fieldsOf(template).filter((f) => f.key in fromText && !isEmptyValue(f, values?.[f.key]))
}

/** Field types a question can be answered in place (others: «Перейти к полю»). */
export const INLINE_TYPES = new Set(['text', 'textarea', 'date', 'time', 'number', 'person', 'position', 'rank', 'organization', 'department', 'location', 'signature'])
