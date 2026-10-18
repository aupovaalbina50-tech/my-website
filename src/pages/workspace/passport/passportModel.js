// «Паспорт документа»: what the system really knows about a document, put
// together from what is stored — the document row, its versions, the
// expertise saved with it, the log of completed checks (inspection_history)
// and the log of actions (work_document_events). Pure functions: no network,
// nothing invented. A value the system does not have is null and the
// interface says «Не указано» / «Не присвоено» / «не сохранено».

import { fieldsOf } from '../../account/documents/catalog/index.js'
import { classify, expertiseState, isStale, kindOf, readExpertise } from '../expertise/model.js'
import { readFlow } from '../constructor/flow.js'

const str = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(str).join(', ') : typeof v === 'object' ? '' : String(v))
const filled = (v) => str(v).trim() !== ''

// ---- А. Основные сведения ---------------------------------------------------------

const EVENT_DATE_KEYS = ['incidentDate', 'eventDate', 'workStart']
const UNIT_KEYS = ['unit', 'checkedUnit']

/**
 * The basic facts. Every value is the stored one or null: the registration
 * number is the «Номер документа» the user entered — never generated.
 */
export function basicInfo({ doc, template, values, authorName = null }) {
  const fields = new Map(fieldsOf(template).map((f) => [f.key, f]))
  const eventKey = EVENT_DATE_KEYS.find((k) => fields.has(k) && filled(values?.[k]))
  const unitKey = UNIT_KEYS.find((k) => fields.has(k) && filled(values?.[k]))
  return {
    title: str(doc.title).trim() || null,
    templateId: doc.template_id,
    number: str(values?.number).trim() || str(values?.outNumber).trim() || null,
    hasNumberField: fields.has('number') || fields.has('outNumber'),
    createdAt: doc.created_at ?? null,
    updatedAt: doc.updated_at ?? null,
    documentDate: fields.has('date') && filled(values?.date) ? str(values.date) : null,
    eventDate: eventKey ? { key: eventKey, value: str(values[eventKey]) } : null,
    author: authorName || null,
    version: doc.current_version ?? 0,
    lang: doc.lang ?? null,
    organization: fields.has('org') && filled(values?.org) ? str(values.org) : null,
    unit: unitKey ? str(values[unitKey]) : null,
    status: doc.status ?? null,
  }
}

// ---- Б. Статус подготовки ------------------------------------------------------------

/**
 * The stage of preparation from the real state — never «согласован» or
 * «утверждён»: the system has no such process.
 *   draft · review · issues · clarify · checked · export_ready · archive
 * `outdated`: the text changed after the last check (its results describe an earlier text).
 */
export function preparationStage({ status, issues, values, contentHash = null, checkedHash = null }) {
  const check = readExpertise(issues)
  const outdated = Boolean(check && ((checkedHash && contentHash && checkedHash !== contentHash) || (check.items ?? []).some((i) => i.status === 'open' && isStale(i, check, values))))
  if (status === 'archive') return { stage: 'archive', outdated }
  if (status === 'review') return { stage: 'review', outdated }
  if (status === 'ready') return { stage: 'export_ready', outdated }
  if (!check || outdated || expertiseState(check, values) === 'error') return { stage: 'draft', outdated }
  const open = (check.items ?? []).filter((i) => i.status === 'open')
  if (open.some((i) => classify(i).category !== 'clarify' && ['high', 'medium'].includes(classify(i).priority))) return { stage: 'issues', outdated }
  if (open.some((i) => classify(i).category === 'clarify' || kindOf(i) === 'review')) return { stage: 'clarify', outdated }
  return { stage: 'checked', outdated }
}

// ---- В. История проверок -------------------------------------------------------------

const outcomeOf = (snapshot) => {
  if (snapshot?.state === 'error') return 'failed'
  const parts = Object.values(snapshot?.parts ?? {})
  if (parts.some((p) => p === 'failed' || p === 'partial')) return 'partial'
  return 'complete'
}

/**
 * Every check of the document, newest first: completed / partial runs from
 * inspection_history, failed attempts from the event log.
 * Older rows lack version, categories, sources — those stay null.
 */
export function checkRuns({ history = [], events = [], currentHash = null }) {
  const runs = history.map((row) => {
    const sn = row.snapshot ?? {}
    return {
      id: row.id,
      at: sn.at ?? row.created_at,
      type: sn.kind === 'editor' ? 'editor' : 'file',
      version: sn.version ?? null,
      outcome: outcomeOf(sn),
      total: row.issue_count ?? sn.counts?.all ?? null,
      categories: sn.counts?.categories ?? null,
      priorities: sn.counts?.priorities ?? null,
      errors: Object.entries(sn.errors ?? {}).filter(([, v]) => v).map(([part, code]) => ({ part, code })),
      sources: Array.isArray(sn.sources) ? sn.sources : null,
      // Known only when the run stored the fingerprint of the checked text.
      outdated: sn.hash ? (currentHash ? sn.hash !== currentHash : null) : null,
      fileName: row.file_name ?? null,
    }
  })
  for (const e of events.filter((ev) => ev.kind === 'check_failed')) {
    runs.push({ id: e.id, at: e.created_at, type: 'editor', version: e.version ?? null, outcome: 'failed', total: null, categories: null, priorities: null, errors: e.details?.errors ?? [], sources: null, outdated: null, fileName: null })
  }
  return runs.sort((a, b) => new Date(b.at) - new Date(a.at))
}

// ---- Г. Источники и основания --------------------------------------------------------

const remarkRef = (i) => ({ id: i.id, fragment: i.fragment, title: i.title, category: classify(i).category, status: i.status })

/**
 * The sources this check really used, by kind. Nothing is listed that the
 * check did not consult: the term base only when the terminology part ran,
 * official sites only when a search returned them, acts only as found in
 * the text and compared with the registry.
 */
export function sourcesOfCheck(check, template) {
  const out = { normative: [], state: [], termBase: null, internal: [], other: [] }
  if (!check) return out
  const items = check.items ?? []

  // 1–2. Acts referred to in the text, compared with the registry of the platform.
  for (const ref of check.references ?? []) {
    const src = ref.source
    const remarks = items.filter((i) => (i.basis?.kind === 'registry' || i.basis?.kind === 'unverified_reference') && i.fragment === ref.fragment).map(remarkRef)
    const entry = {
      title: src ? src.title_ru : null,
      fragment: ref.fragment,
      number: src?.doc_number ?? ref.parsed?.number ?? null,
      date: src?.doc_date ?? null,
      url: src?.url ?? null,
      clause: null,
      accessed: check.at,
      actuality: ref.actuality,
      verifiedAt: src?.verified_at ?? null,
      inRegistry: Boolean(src),
      remarks,
    }
    if (src && src.priority === 3) out.state.push(entry)
    else out.normative.push(entry)
  }
  // 2. Pages of official sites a search really returned for a term.
  const byUrl = new Map()
  for (const i of items.filter((x) => x.basis?.kind === 'official' && x.basis.source?.url)) {
    const s = i.basis.source
    const cur = byUrl.get(s.url) ?? { title: s.title, url: s.url, officialTerm: s.officialTerm ?? null, accessed: s.retrievedAt ?? check.at, remarks: [] }
    cur.remarks.push(remarkRef(i))
    byUrl.set(s.url, cur)
  }
  out.state.push(...byUrl.values())

  // 3. The term base of the site — only when that part of the check ran.
  const termPart = check.parts?.terminology
  if (termPart && termPart !== 'skipped' && termPart !== 'failed') {
    const terms = items.filter((i) => i.basis?.kind === 'base' && i.basis.term)
    out.termBase = {
      size: check.glossarySize ?? null,
      termsFound: check.termsFound ?? 0,
      accessed: check.at,
      terms: terms.map((i) => ({ term: i.basis.term, remark: remarkRef(i) })),
    }
  }

  // 4. Rules of the template of the platform (not normative requirements).
  const rules = items.filter((i) => i.basis?.kind === 'rule')
  if (rules.length) out.internal.push({ templateId: template?.id ?? null, rules: [...new Set(rules.map((i) => i.basis.rule).filter(Boolean))], remarks: rules.map(remarkRef) })

  // 5. Entries of the knowledge base of the site — reference material, not acts.
  const kb = new Map()
  for (const i of items.filter((x) => x.basis?.kind === 'kb' && x.basis.entry)) {
    const e = i.basis.entry
    const key = e.id ?? e.title
    const cur = kb.get(key) ?? { title: e.title, sourceTitle: e.source_title ?? null, number: e.source_number ?? null, date: e.source_date ?? null, clause: e.clause ?? null, url: e.source_url ?? null, status: e.status ?? null, accessed: check.at, remarks: [] }
    cur.remarks.push(remarkRef(i))
    kb.set(key, cur)
  }
  out.other.push(...kb.values())
  return out
}

/** A compact list of the sources for the log of checks. */
export function sourceSummary(check, template) {
  const s = sourcesOfCheck(check, template)
  const list = [
    ...s.normative.map((x) => ({ kind: 'normative', title: x.title ?? x.fragment, url: x.url, actuality: x.actuality })),
    ...s.state.map((x) => ({ kind: 'state', title: x.title ?? x.fragment, url: x.url })),
    ...(s.termBase ? [{ kind: 'termBase', title: null, count: s.termBase.terms.length }] : []),
    ...s.internal.map(() => ({ kind: 'internal', title: null })),
    ...s.other.map((x) => ({ kind: 'other', title: x.title, url: x.url })),
  ]
  return list.slice(0, 40)
}

/** Remarks of a check in short, kept with the run: what appeared / was resolved between versions. */
export const remarkKey = (i) => `${i.target ?? ''}|${i.fragment ?? ''}|${i.title ?? ''}`
export const compactItems = (check) =>
  (check?.items ?? []).slice(0, 150).map((i) => ({ key: remarkKey(i), target: i.target ?? '', fragment: i.fragment ?? null, title: i.title ?? null, ...classify(i) }))

export function remarkDiff(older, newer) {
  const a = new Map((older ?? []).map((i) => [i.key, i]))
  const b = new Map((newer ?? []).map((i) => [i.key, i]))
  return {
    appeared: [...b.values()].filter((i) => !a.has(i.key)),
    resolved: [...a.values()].filter((i) => !b.has(i.key)),
    remained: [...b.values()].filter((i) => a.has(i.key)),
  }
}

// ---- Д. Происхождение сведений --------------------------------------------------------

/**
 * Where each filled field comes from, as far as the system recorded it:
 *   linked · ai_generated · ai_edited · ai_description_unconfirmed · upload ·
 *   profile · version · manual · unknown («Источник происхождения не сохранён»)
 * plus the accepted corrections of the field with what confirmed them.
 */
export function fieldOrigins({ template, values, issues }) {
  const flow = readFlow(values)
  const prov = values?.__provenance ?? {}
  const origin = values?.__origin ?? {}
  const source = values?.__source ?? null
  const check = readExpertise(issues)
  const out = []
  for (const f of fieldsOf(template)) {
    const v = values?.[f.key]
    if (!filled(v)) continue
    const now = str(v).trim()
    let kind = 'unknown'
    let detail = null
    const gen = flow.gen?.[f.key]
    if (prov[f.key] && str(prov[f.key].value).trim() === now) {
      kind = 'linked'
      detail = { documentId: prov[f.key].documentId, title: prov[f.key].title, at: prov[f.key].at }
    } else if (gen) kind = gen.text.trim() === now ? 'ai_generated' : 'ai_edited'
    else if (f.key in (flow.fromText ?? {})) kind = 'ai_description_unconfirmed'
    else if (origin[f.key]) {
      kind = origin[f.key].by
      detail = { at: origin[f.key].at, version: origin[f.key].version ?? null }
    } else if (source?.origin === 'upload') {
      kind = 'upload'
      detail = { fileName: source.fileName ?? null }
    }
    const confirmed = (check?.changes ?? [])
      .filter((c) => c.target === f.key)
      .map((c) => {
        const item = check.items.find((i) => i.id === c.itemId)
        return { was: c.was, now: c.now, how: c.how, basis: item?.basis?.kind ?? null, confirmation: item?.confirmation ?? null }
      })
    out.push({ key: f.key, label: f.label, kind, detail, unconfirmed: kind === 'ai_generated' || kind === 'ai_description_unconfirmed', corrections: confirmed })
  }
  return out
}

/** Fields that changed between two value sets, as text or as requisites. */
const TEXT_ROLES = new Set(['body', 'subject', 'table', 'attachments'])
export function changedFields(template, before, after) {
  const text = []
  const requisites = []
  for (const f of fieldsOf(template)) {
    if (JSON.stringify(before?.[f.key] ?? '') === JSON.stringify(after?.[f.key] ?? '')) continue
    ;(TEXT_ROLES.has(f.role ?? 'body') ? text : requisites).push(f.key)
  }
  return { text, requisites }
}

/** Requisites that differ between two versions: [{ key, label, was, now }]. */
export function requisiteChanges(template, older, newer) {
  return fieldsOf(template)
    .filter((f) => !TEXT_ROLES.has(f.role ?? 'body'))
    .filter((f) => JSON.stringify(older?.[f.key] ?? '') !== JSON.stringify(newer?.[f.key] ?? ''))
    .map((f) => ({ key: f.key, label: f.label, was: str(older?.[f.key]), now: str(newer?.[f.key]) }))
}

// ---- Е. История изменений -------------------------------------------------------------

/**
 * One chronological feed, newest first: the creation, the saved versions,
 * the checks and the logged actions. `logSince` is when the action log
 * starts for this document (null — nothing logged yet).
 */
export function timeline({ doc, versions = [], runs = [], events = [] }) {
  const feed = []
  if (!events.some((e) => e.kind === 'created') && doc?.created_at) feed.push({ at: doc.created_at, kind: 'created', source: 'document' })
  for (const v of versions) feed.push({ at: v.created_at, kind: 'version', version: v.version, versionKind: v.kind, note: v.note ?? null, source: 'versions' })
  for (const r of runs.filter((x) => x.outcome !== 'failed')) feed.push({ at: r.at, kind: 'check', run: r, source: 'checks' })
  for (const e of events) feed.push({ at: e.created_at, kind: e.kind, summary: e.summary, details: e.details ?? {}, version: e.version ?? null, source: 'events' })
  feed.sort((a, b) => new Date(b.at) - new Date(a.at))
  const logged = events.map((e) => e.created_at).sort()
  return { feed, logSince: logged[0] ?? null }
}
