// One expertise of the document as it is now, in the order of trust:
//
//   1. structure   — local rules of the chosen template (required fields,
//                    requisites, dates). No AI, no network.
//   2. terminology — the doc-inspector Edge Function: the site's term base
//                    (table `terms` + `term_variants`, exact and word-form
//                    matching), then the AI for meaning-level matches; every
//                    AI finding is validated against the base on the server.
//   3. language    — the smart-report Edge Function (`doc_check`): spelling,
//                    grammar, punctuation, agreement, repetitions, ambiguity,
//                    official style, structure and logic; its fragments are
//                    checked to exist verbatim in the text.
//   4. lookup      — official sources, only for terminology findings the base
//                    has no entry for (allow-listed official domains; a URL is
//                    kept only if the search really returned it).
//
// Every part reports its own outcome; a failed part never turns into
// «no remarks». Nothing here writes to the database — the editor saves.

import { analyzeChunk, lookupPhrases } from '../../shared/docInspector/inspectorClient.js'
import { pairsInText, pairsPayload } from '../../shared/docInspector/confusables.js'
import { checkDocumentText } from '../../account/documents/useDocuments.js'
import { checkBlocks, missingRequired } from '../../account/documents/render.js'
import { fieldsOf } from '../../account/documents/catalog/index.js'
import { requisiteIssues } from '../../account/smartReport/templates/index.js'
import { CHECK_VERSION, occurrences, touchesFacts } from './model.js'

const CHUNK_CHARS = 12000
const LOOKUP_BATCH = 10
const CALL_TIMEOUT_MS = 120_000
// Field types whose text is a fact, not wording: never re-worded.
const FACT_TYPES = new Set(['date', 'time', 'datetime', 'number', 'person', 'signature', 'file', 'checkbox'])

let seq = 0
const nextId = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

function withTimeout(promise) {
  let timer
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), CALL_TIMEOUT_MS)
    }),
  ])
}
const codeOf = (err) => err?.code || err?.message || 'internal_error'

const parseIso = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 1. Rules of the template — recommendations of the platform's template, not normative requirements. */
function structureItems(template, values, docLang, c, uiLang) {
  const fields = fieldsOf(template)
  const label = (key) => fields.find((f) => f.key === key)?.label[uiLang] ?? key
  const base = { category: 'structure', start: null, end: null, fragment: null, suggestion: null, alternatives: [], confidence: null, factual: false, status: 'open' }
  const items = missingRequired(template, values).map((key) => ({
    ...base,
    id: nextId('s'),
    severity: 'error',
    target: key,
    label: label(key),
    title: c.missingRequired(label(key)),
    explanation: c.missingRequiredReason,
    basis: { kind: 'rule', rule: 'missing' },
    confirmation: 'rule',
  }))
  for (const r of requisiteIssues({ to: values.to, from: values.from }, docLang)) {
    items.push({
      ...base,
      id: nextId('s'),
      category: 'language',
      severity: 'remark',
      target: r.field,
      label: label(r.field),
      title: c.requisiteCase[r.field],
      explanation: c.requisiteCaseReason(r.word),
      basis: { kind: 'rule', rule: 'case' },
      confirmation: 'rule',
    })
  }
  const docDate = parseIso(values.date)
  if (docDate && docDate > today())
    items.push({ ...base, id: nextId('s'), severity: 'error', target: 'date', label: label('date'), title: c.futureDate, explanation: c.futureDateReason, basis: { kind: 'rule', rule: 'date' }, confirmation: 'rule' })
  for (const key of ['incidentDate', 'eventDate']) {
    const event = parseIso(values[key])
    if (event && docDate && event > docDate)
      items.push({ ...base, id: nextId('s'), severity: 'error', target: key, label: label(key), title: c.eventAfterDoc, explanation: c.eventAfterDocReason, basis: { kind: 'rule', rule: 'date' }, confirmation: 'rule' })
  }
  return items
}

/** Blocks → chunks of «pages» for the doc-inspector (one block = one page). */
function chunksOf(blocks) {
  const chunks = []
  let current = []
  let size = 0
  blocks.forEach((b, i) => {
    if (size + b.text.length > CHUNK_CHARS && current.length) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push({ page: i + 1, offset: 0, text: b.text.slice(0, CHUNK_CHARS) })
    size += b.text.length
  })
  if (current.length) chunks.push(current)
  return chunks
}

const termOf = (t) => (t ? { id: t.id, kk: t.kk, ru: t.ru, en: t.en, category: t.category } : null)

/**
 * A terminology finding of the doc-inspector as a remark. `start` is the
 * offset of r.text in the field, or null when the range could not be
 * confirmed (then the fix is manual only).
 */
export function termItemFromResult(r, block, start) {
  const candidates = Array.isArray(r.candidates) ? r.candidates : []
  const primary = candidates.find((cand) => cand.suggestion) ?? null
  const inBase = candidates.length > 0
  const item = {
    id: nextId('t'),
    category: 'terminology',
    // 'fix' = one verified base term, high confidence; 'review' = the user decides.
    severity: r.status === 'fix' ? 'error' : 'remark',
    target: block.key,
    label: block.label,
    start,
    end: start == null ? null : start + r.text.length,
    fragment: r.text,
    suggestion: primary?.suggestion ?? null,
    alternatives: candidates.filter((cand) => cand !== primary && cand.suggestion).map((cand) => cand.suggestion),
    title: null,
    errorType: r.errorType ?? null,
    explanation: r.explanation ?? '',
    context: r.context ?? '',
    basis: inBase
      ? { kind: 'base', term: termOf(primary?.term ?? candidates[0].term), others: candidates.slice(1).map((cand) => termOf(cand.term)), difference: candidates.map((cand) => cand.difference).filter(Boolean) }
      : { kind: 'ai' },
    confirmation: inBase ? 'base' : 'unconfirmed',
    confidence: typeof r.confidence === 'number' ? r.confidence : null,
    factual: touchesFacts(r.text, primary?.suggestion ?? null) || Boolean(block.factual),
    status: 'open',
  }
  // An official source found by the inspector's own lookup.
  if (!inBase && r.external?.found && r.external.sourceUrl) {
    item.basis = { kind: 'official', source: { title: r.external.sourceTitle, url: r.external.sourceUrl, officialTerm: r.external.officialTerm, reason: r.external.reason, retrievedAt: r.external.retrievedAt ?? null } }
    item.confirmation = 'source'
    if (!item.suggestion && r.external.officialTerm) {
      item.suggestion = r.external.officialTerm
      item.factual = item.factual || touchesFacts(item.fragment, r.external.officialTerm)
    }
  }
  return item
}

/** 2. Terminology against the site's base. */
async function terminologyItems(blocks, uiLang) {
  const items = []
  let termsFound = 0
  let glossarySize = null
  let failedChunks = 0
  let aiFailed = false
  let lastError = null
  for (const chunk of chunksOf(blocks)) {
    let report
    try {
      const pairs = pairsPayload(pairsInText(chunk.map((s) => s.text).join('\n')))
      report = await withTimeout(analyzeChunk(chunk, uiLang, pairs))
    } catch (err) {
      failedChunks++
      lastError = codeOf(err)
      continue
    }
    glossarySize = report.glossarySize ?? glossarySize
    if (report.ai?.status !== 'ok') aiFailed = true
    for (const r of report.results ?? []) {
      const block = blocks[r.page - 1]
      if (!block) continue
      if (r.status === 'ok') {
        termsFound++
        continue
      }
      items.push(termItemFromResult(r, block, block.text.slice(r.start, r.end) === r.text ? r.start : null))
    }
  }
  const total = chunksOf(blocks).length
  const part = !total ? 'skipped' : failedChunks === total ? 'failed' : failedChunks || aiFailed ? 'partial' : 'ok'
  return { items, termsFound, glossarySize, part, error: failedChunks ? lastError : aiFailed ? 'ai_unavailable' : null }
}

const LANGUAGE_CATEGORY = { language: 'language', term: 'terminology' }
const SEVERITY = { critical: 'error', important: 'error', logic: 'error', language: 'remark', term: 'remark', structure: 'recommendation', advice: 'recommendation' }

/** 3. Language, style, structure and logic (AI), fragments located in the text. */
async function languageItems(blocks, documentTitle, docLang) {
  let out
  try {
    out = await withTimeout(checkDocumentText({ blocks: blocks.map(({ key, label, text }) => ({ key, label, text })), documentTitle, lang: docLang }))
  } catch (err) {
    return { items: [], part: 'failed', error: codeOf(err) }
  }
  const byKey = new Map(blocks.map((b) => [b.key, b]))
  const items = (out.issues ?? []).map((i) => {
    const block = byKey.get(i.target)
    const where = block && i.was ? occurrences(block.text, i.was) : []
    // Only an unambiguous fragment gets a range; otherwise the user fixes it by hand.
    const located = where.length === 1
    const entry = i.basis
    return {
      id: nextId('l'),
      category: LANGUAGE_CATEGORY[i.category] ?? 'structure',
      severity: SEVERITY[i.category] ?? 'recommendation',
      target: block ? block.key : '',
      label: block?.label ?? '',
      start: located ? where[0] : null,
      end: located ? where[0] + i.was.length : null,
      fragment: i.was || null,
      suggestion: i.was ? i.now || null : null,
      alternatives: [],
      title: i.title,
      explanation: i.reason,
      basis: entry ? { kind: 'kb', entry } : { kind: 'ai' },
      // A knowledge-base entry with status «official» confirms; the rest is the AI's recommendation.
      confirmation: entry?.status === 'official' ? 'base' : i.category === 'term' ? 'unconfirmed' : 'ai',
      confidence: null,
      factual: Boolean(block?.factual) || touchesFacts(i.was, i.now),
      status: 'open',
    }
  })
  return { items, part: 'ok', error: null, knowledge: out.knowledge ?? null }
}

/** 4. Official sources for terminology findings without a base entry. */
async function lookupSources(items, docLang) {
  const pending = items.filter((i) => i.category === 'terminology' && i.confirmation === 'unconfirmed' && i.fragment)
  if (!pending.length) return { part: 'skipped', error: null }
  const phrases = [...new Map(pending.map((i) => [i.fragment.toLowerCase(), { phrase: i.fragment, context: i.context || i.fragment }])).values()]
  let failed = 0
  let lastError = null
  const found = new Map()
  for (let i = 0; i < phrases.length; i += LOOKUP_BATCH) {
    try {
      for (const r of await withTimeout(lookupPhrases(phrases.slice(i, i + LOOKUP_BATCH), docLang))) {
        if (r.found && r.sourceUrl) found.set(r.phrase.toLowerCase(), { ...r, retrievedAt: new Date().toISOString() })
      }
    } catch (err) {
      failed++
      lastError = codeOf(err)
    }
  }
  for (const item of pending) {
    const r = found.get(item.fragment.toLowerCase())
    if (r) {
      item.basis = { kind: 'official', source: { title: r.sourceTitle, url: r.sourceUrl, officialTerm: r.officialTerm, reason: r.reason, retrievedAt: r.retrievedAt } }
      item.confirmation = 'source'
      if (!item.suggestion && r.officialTerm) {
        item.suggestion = r.officialTerm
        item.factual = item.factual || touchesFacts(item.fragment, r.officialTerm)
      }
    } else {
      item.lookupNote = failed ? 'failed' : 'not_found'
    }
  }
  const batches = Math.ceil(phrases.length / LOOKUP_BATCH)
  return { part: failed === batches ? 'failed' : failed ? 'partial' : 'ok', error: lastError }
}

/** Drops an AI language «term» remark that repeats a base-backed terminology remark on the same text. */
function dedupe(items) {
  const terms = items.filter((i) => i.category === 'terminology' && i.basis.kind === 'base' && i.start != null)
  return items.filter((i) => {
    if (!(i.id.startsWith('l') && i.category === 'terminology')) return true
    if (i.start == null) return true
    return !terms.some((t) => t.target === i.target && i.start < t.end && t.start < i.end)
  })
}

/**
 * Runs the expertise on the document as it is now.
 * @returns the check object (see model.js)
 */
export async function runExpertise({ template, values, docLang, uiLang, documentTitle, strings }) {
  const fields = new Map(fieldsOf(template).map((f) => [f.key, f]))
  const blocks = checkBlocks(template, values, docLang)
    .map((b) => ({ ...b, factual: FACT_TYPES.has(fields.get(String(b.key).split('.')[0])?.type) }))
    // The check reads what is stored: a block whose text differs from the value (formatted dates…) keeps no range.
    .map((b) => ({ ...b, raw: rawText(values, b.key) }))

  const structure = structureItems(template, values, docLang, strings, uiLang)
  // Ranges are taken in the stored text, so the analysis reads exactly that.
  const textBlocks = blocks.filter((b) => !b.factual && b.raw !== null).map((b) => ({ ...b, text: b.raw }))

  const [terminology, language] = await Promise.all([
    textBlocks.length ? terminologyItems(textBlocks, uiLang) : { items: [], part: 'skipped', termsFound: 0, glossarySize: null, error: null },
    blocks.length ? languageItems(textBlocks.length ? textBlocks : blocks, documentTitle, docLang) : { items: [], part: 'skipped', error: null },
  ])
  const items = dedupe([...structure, ...terminology.items, ...language.items])
  const lookup = await lookupSources(items, docLang)

  return {
    v: CHECK_VERSION,
    at: new Date().toISOString(),
    docLang,
    parts: { structure: 'ok', terminology: terminology.part, language: language.part, lookup: lookup.part },
    errors: { terminology: terminology.error, language: language.error, lookup: lookup.error },
    snapshots: Object.fromEntries(textBlocks.map((b) => [b.key, b.text])),
    items,
    changes: [],
    termsFound: terminology.termsFound,
    glossarySize: terminology.glossarySize,
    knowledge: language.knowledge ?? null,
  }
}

/** The stored string of a value path, or null when it is not plain text (tables of objects, lists…). */
function rawText(values, path) {
  const [key, row, col] = String(path).split('.')
  const v = values?.[key]
  if (row === undefined) return typeof v === 'string' ? v : null
  const cell = v?.[Number(row)]?.[col]
  return typeof cell === 'string' ? cell : null
}
