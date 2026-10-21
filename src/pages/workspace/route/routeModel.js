// «Маршрут подготовки документа»: nine stages and the state of each, worked
// out from what is really there — the template, the values, the expertise
// stored with the document (and whether the text changed since), the final
// check and the export recorded in values.__route. Pure functions: the
// editor, the passport and the tests use them.
//
// Statuses: not_started · running · done · issues · clarify · recheck · unavailable
// Nothing is «done» because a check found nothing: a failed part, a text
// changed after the check, or a module that is not available is shown so.

import { fieldsOf, kindOfTemplate } from '../../account/documents/catalog/index.js'
import { isEmptyValue, missingRequired } from '../../account/documents/render.js'
import { fieldOrigin, narrativeFields, readFlow, unconfirmed } from '../constructor/flow.js'
import { classify, isStale, readExpertise, valueAtPath } from '../expertise/model.js'
import { consistencyChecks } from '../expertise/localChecks.js'

export const STAGES = ['define', 'draft', 'structure', 'terminology', 'language', 'facts', 'remarks', 'final', 'export']
export const ROUTE_KEY = '__route'

export const readRoute = (values) => values?.[ROUTE_KEY] ?? {}
export const withRoute = (values, patch) => ({ ...values, [ROUTE_KEY]: { ...readRoute(values), ...patch } })

const TEXT_TYPES = new Set(['text', 'textarea'])

/** Fields whose text differs from what the last check read (top-level keys). */
export function changedSinceCheck(check, values, template) {
  const out = new Set()
  if (!check) return out
  const snap = check.snapshots ?? {}
  for (const path of Object.keys(snap)) if (valueAtPath(values, path) !== snap[path]) out.add(path.split('.')[0])
  // A text field filled after the check was never read by it.
  for (const f of fieldsOf(template)) {
    if (!TEXT_TYPES.has(f.type) || Object.keys(snap).some((p) => p.split('.')[0] === f.key)) continue
    if (typeof values?.[f.key] === 'string' && values[f.key].trim()) out.add(f.key)
  }
  return out
}

const open = (check, values) => (check?.items ?? []).filter((i) => i.status === 'open' && !isStale(i, check, values))
const staleOpen = (check, values) => (check?.items ?? []).filter((i) => i.status === 'open' && isStale(i, check, values))

/** A part of the check: missing service → unavailable; failed → recheck; skipped → done (nothing to read). */
function partState(check, part) {
  const st = check?.parts?.[part]
  const code = check?.errors?.[part]
  if (!st) return null
  if (st === 'failed') return code === 'service_unavailable' || code === 'ai_declined' ? 'unavailable' : 'recheck'
  if (st === 'partial') return 'recheck'
  return null
}

function analysisStage({ check, values, changed, part, categories, running }) {
  if (running) return { status: 'running' }
  if (!check) return { status: 'not_started' }
  const ps = partState(check, part)
  const items = open(check, values).filter((i) => categories.includes(classify(i).category))
  const mandatory = items.filter((i) => ['high', 'medium'].includes(classify(i).priority))
  const base = { at: check.at, count: items.length, mandatory: mandatory.length, recommendations: items.length - mandatory.length }
  if (ps === 'unavailable') return { ...base, status: 'unavailable', reason: check.errors?.[part] }
  if (ps === 'recheck') return { ...base, status: 'recheck', reason: check.errors?.[part] ?? 'partial' }
  if (changed.size || staleOpen(check, values).some((i) => categories.includes(classify(i).category))) return { ...base, status: 'recheck', reason: 'changed' }
  if (items.some((i) => classify(i).category === 'clarify')) return { ...base, status: 'clarify' }
  if (mandatory.length) return { ...base, status: 'issues' }
  return { ...base, status: 'done' }
}

/**
 * The route of one document.
 * @returns { stages: [{ key, status, at?, count?, … }], next, complete, limits }
 */
export function routeOf({ template, values, issues, running = false, runningFinal = false, contentHash = null }) {
  const check = readExpertise(issues)
  const fields = new Map(fieldsOf(template).map((f) => [f.key, f]))
  const route = readRoute(values)
  const changed = changedSinceCheck(check, values, template)
  const kind = kindOfTemplate(template)
  const source = values?.__source ?? null
  const stages = []

  // 1. What document: type, language, addressee / organisation when the form has them.
  const missingDefine = ['to', 'org', 'unit'].filter((k) => fields.has(k) && fields.get(k).required && isEmptyValue(fields.get(k), values?.[k]))
  const optionalEmpty = ['org', 'unit'].filter((k) => fields.has(k) && !fields.get(k).required && isEmptyValue(fields.get(k), values?.[k]))
  stages.push({ key: 'define', status: missingDefine.length ? 'clarify' : 'done', missing: missingDefine, optionalEmpty, templateId: template?.id ?? null })

  // 2. Draft: the narrative of the document; AI text not yet confirmed by the user is marked.
  const narrative = narrativeFields(template)
  const filledNarrative = narrative.filter((f) => !isEmptyValue(f, values?.[f.key]))
  const aiUnconfirmed = narrative.filter((f) => fieldOrigin(f.key, values) === 'generated').length + unconfirmed(template, values).length
  const draft = { key: 'draft', method: readFlow(values).method, upload: source?.origin === 'upload' ? { fileName: source.fileName, ocrPages: source.ocrPages ?? 0, unreadable: source.unreadablePages ?? null, illegible: source.illegiblePages ?? null } : null, aiUnconfirmed }
  if (!filledNarrative.length && narrative.length) stages.push({ ...draft, status: 'not_started' })
  else if (aiUnconfirmed) stages.push({ ...draft, status: 'clarify' })
  else if (draft.upload && (draft.upload.unreadable > 0 || draft.upload.illegible > 0)) stages.push({ ...draft, status: 'clarify' })
  else stages.push({ ...draft, status: 'done' })

  // 3. Structure and requisites: the rules of the chosen template, worked out live (no AI).
  const missing = missingRequired(template, values)
  const blocks = fieldsOf(template)
    .filter((f) => TEXT_TYPES.has(f.type) && typeof values?.[f.key] === 'string' && values[f.key].trim())
    .map((f) => ({ key: f.key, label: f.label.ru, text: values[f.key] }))
  const contradictions = consistencyChecks(blocks, new Proxy({}, { get: () => () => '' }), (p) => p).length
  const present = fieldsOf(template).filter((f) => !isEmptyValue(f, values?.[f.key])).length
  stages.push({ key: 'structure', status: missing.length || contradictions ? 'issues' : 'done', missing, contradictions, present, total: fields.size, live: true })

  // 4–6. Parts of the expertise.
  stages.push({ key: 'terminology', ...analysisStage({ check, values, changed, part: 'terminology', categories: ['terminology', 'clarify'], running }) })
  stages.push({ key: 'language', ...analysisStage({ check, values, changed, part: 'language', categories: ['language', 'style'], running }), logic: kind === 'report' })
  // Facts and normative grounds: only what the document has. Without acts and contradictions there is nothing to ground.
  const facts = analysisStage({ check, values, changed, part: 'references', categories: ['normative', 'factual'], running })
  const references = check?.references?.length ?? 0
  const lookupFailed = check?.parts?.lookup === 'failed'
  stages.push({ key: 'facts', ...facts, references, needed: Boolean(references) || facts.count > 0 || !check, lookupFailed })

  // 7. Remarks: all open remarks of the current text; questions marked «требует уточнения».
  const clarifyMarked = (check?.items ?? []).filter((i) => i.status === 'clarify').length
  const openNow = open(check, values)
  const stale = staleOpen(check, values).length
  stages.push({
    key: 'remarks',
    // Recommendations (low / info) stay listed but do not hold the route up.
    status: running ? 'running' : !check ? 'not_started' : stale || changed.size ? 'recheck' : openNow.some((i) => ['high', 'medium'].includes(classify(i).priority)) ? 'issues' : clarifyMarked || openNow.some((i) => classify(i).category === 'clarify') ? 'clarify' : 'done',
    at: check?.at ?? null,
    count: openNow.length,
    recommendations: openNow.filter((i) => ['low', 'info'].includes(classify(i).priority)).length,
    clarifyMarked,
    stale,
  })

  // 8. Final check: a full check after the corrections, for exactly the current text.
  const final = route.final ?? null
  const finalHash = final?.hash ?? null
  const currentHash = contentHash
  let finalStatus = 'not_started'
  if (runningFinal) finalStatus = 'running'
  else if (final) {
    if (finalHash && currentHash && finalHash !== currentHash) finalStatus = 'recheck'
    else if (changed.size || stale) finalStatus = 'recheck'
    else if (final.failedParts?.length) finalStatus = 'recheck'
    else if (openNow.some((i) => ['high', 'medium'].includes(classify(i).priority))) finalStatus = 'issues'
    else if (openNow.some((i) => classify(i).category === 'clarify') || clarifyMarked) finalStatus = 'clarify'
    else finalStatus = 'done'
  }
  stages.push({ key: 'final', status: finalStatus, at: final?.at ?? null, version: final?.version ?? null, count: openNow.length })

  // 9. Export: done when the current text was exported.
  const exp = route.exported ?? null
  stages.push({ key: 'export', status: !exp ? 'not_started' : currentHash && exp.hash !== currentHash ? 'recheck' : 'done', at: exp?.at ?? null, format: exp?.format ?? null })

  const counted = stages.filter((s) => !(s.key === 'facts' && !s.needed))
  const required = counted.filter((s) => s.key !== 'export')
  const complete = required.every((s) => s.status === 'done')
  const next = counted.find((s) => s.status !== 'done') ?? null
  // What the checks could not do — listed, never hidden.
  const limits = []
  for (const s of stages) if (s.status === 'unavailable') limits.push({ stage: s.key, reason: s.reason ?? null })
  if (lookupFailed) limits.push({ stage: 'facts', reason: 'lookup' })
  limits.push({ stage: 'facts', reason: 'no_articles' })
  limits.push({ stage: 'language', reason: 'no_bilingual' })
  return { stages, next, complete, limits }
}

/** Short summary before the export: what was checked, what is left, what is out of date. */
export function exportSummary(route, issues, values) {
  const check = readExpertise(issues)
  const openNow = open(check, values)
  const byPriority = Object.fromEntries(['high', 'medium', 'low', 'info'].map((p) => [p, openNow.filter((i) => classify(i).priority === p).length]))
  const clarify = openNow.filter((i) => classify(i).category === 'clarify').length + (check?.items ?? []).filter((i) => i.status === 'clarify').length
  return {
    done: route.stages.filter((s) => s.status === 'done').map((s) => s.key),
    outdated: route.stages.filter((s) => s.status === 'recheck').map((s) => s.key),
    unavailable: route.stages.filter((s) => s.status === 'unavailable').map((s) => s.key),
    notStarted: route.stages.filter((s) => s.status === 'not_started' && s.key !== 'export' && !(s.key === 'facts' && !s.needed)).map((s) => s.key),
    remaining: byPriority,
    clarify,
    // «ready with respect to the checks done»: the final check holds for this text and nothing important is open.
    ready: route.complete && byPriority.high === 0,
  }
}

/** Merges a re-check of some fields into the stored check: other fields keep their remarks. */
export function mergeCheck(previous, partial, keys) {
  const inKeys = (target) => keys.has(String(target ?? '').split('.')[0])
  // Template rules are worked out for the whole document each time.
  const keep = (previous.items ?? []).filter((i) => i.basis?.kind !== 'rule' && i.target && !inKeys(i.target))
  const snapshots = { ...Object.fromEntries(Object.entries(previous.snapshots ?? {}).filter(([k]) => !inKeys(k))), ...(partial.snapshots ?? {}) }
  return {
    ...partial,
    items: [...keep, ...partial.items],
    snapshots,
    references: [...(previous.references ?? []).filter((r) => !inKeys(r.target)), ...(partial.references ?? [])],
    changes: previous.changes ?? [],
    partialOf: [...keys],
    // Not recounted for the fields that were not re-read.
    termsFound: null,
  }
}
