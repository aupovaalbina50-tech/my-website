// The inspection pipeline. Every step is real work, and progress is reported
// only as steps actually complete:
//   1. read      — extract text from the file in the browser
//   2. ocr       — scanned pages / photos -> server OCR, page by page
//   3. analyze   — the whole text, chunk by chunk, against the 930-term base
//                  (exact + semantic matching, see the Edge Function)
//   4. lookup    — phrases with no match in the base -> search in official
//                  sources only (never applied automatically)
//   5. assemble  — merge chunk results, spread confirmed spelling fixes to
//                  identical fragments elsewhere, build the decision records

import { extractDocument, pdfPageImage } from './extract.js'
import { analyzeChunk, InspectorError, lookupPhrases, ocrPage } from './inspectorClient.js'

// Characters per analyze request. Long enough for whole pages, short enough
// for a careful model pass and the Edge Function time limit.
const CHUNK_CHARS = 12000

// AI error types that are a property of the fragment itself, not of its
// context — the same fragment is wrong everywhere it appears. Semantic
// matches are NOT here: their meaning depends on each sentence.
const CONTEXT_FREE_TYPES = new Set(['spelling', 'hyphenation'])

// Phrases per official-source lookup request.
const LOOKUP_BATCH = 10

/** Splits page text into ≤ CHUNK_CHARS segments at line breaks. */
function pageSegments(page) {
  const segments = []
  let offset = 0
  const { text } = page
  while (offset < text.length) {
    let end = Math.min(text.length, offset + CHUNK_CHARS)
    if (end < text.length) {
      const lineBreak = text.lastIndexOf('\n', end)
      const space = text.lastIndexOf(' ', end)
      if (lineBreak > offset + CHUNK_CHARS / 2) end = lineBreak + 1
      else if (space > offset) end = space + 1
    }
    const slice = text.slice(offset, end)
    if (slice.trim()) segments.push({ page: page.number, offset, text: slice })
    offset = end
  }
  return segments
}

function chunk(pages) {
  const chunks = []
  let current = []
  let size = 0
  for (const segment of pages.flatMap(pageSegments)) {
    if (size + segment.text.length > CHUNK_CHARS && current.length) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(segment)
    size += segment.text.length
  }
  if (current.length) chunks.push(current)
  return chunks
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Adds copies of confirmed context-free fixes for identical fragments the AI didn't list. */
function propagateFixes(results, pages) {
  const added = []
  const occupied = (page, start, end) =>
    [...results, ...added].some((r) => r.page === page && start < r.end && r.start < end)
  for (const r of results) {
    if (r.source !== 'ai' || r.status !== 'fix' || !CONTEXT_FREE_TYPES.has(r.errorType)) continue
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(r.text)}(?![\\p{L}\\p{N}])`, 'gu')
    for (const page of pages) {
      for (const m of page.text.matchAll(re)) {
        const start = m.index
        const end = start + m[0].length
        if (occupied(page.number, start, end)) continue
        added.push({ ...r, page: page.number, start, end })
      }
    }
  }
  return [...results, ...added]
}

/**
 * @param {File} file
 * @param {'kk'|'ru'} lang
 * @param {(progress: { stage: string, current?: number, total?: number }) => void} onProgress
 */
export async function runInspection(file, lang, onProgress) {
  onProgress({ stage: 'read' })
  const doc = await extractDocument(file)

  // ---- OCR for pages without a text layer ----------------------------------
  const ocrPages = doc.pages.filter((p) => p.source === 'ocr')
  let unreadablePages = 0
  for (let i = 0; i < ocrPages.length; i++) {
    onProgress({ stage: 'ocr', current: i + 1, total: ocrPages.length })
    const page = ocrPages[i]
    const blob = doc.kind === 'image' ? doc.imageBlob : await pdfPageImage(doc.pdf, page.number)
    const { readable, text } = await ocrPage(blob)
    page.text = readable ? text.replace(/\r\n?/g, '\n').trim() : ''
    if (!page.text) unreadablePages++
  }

  const textPages = doc.pages.filter((p) => p.text.trim())
  if (textPages.length === 0) throw new InspectorError('no_text')

  // ---- Terminology analysis, chunk by chunk ---------------------------------
  const chunks = chunk(textPages)
  let results = []
  let aiFailedChunks = 0
  let aiError = null
  let glossarySize = null
  for (let i = 0; i < chunks.length; i++) {
    onProgress({ stage: 'analyze', current: i + 1, total: chunks.length })
    const report = await analyzeChunk(chunks[i], lang)
    results.push(...report.results)
    glossarySize = report.glossarySize ?? glossarySize
    if (report.ai?.status !== 'ok') {
      aiFailedChunks++
      aiError = report.ai?.error ?? 'ai_unavailable'
    }
  }

  // ---- Assemble ----------------------------------------------------------------
  // ---- Official sources for phrases with no match in the base --------------
  const unmatched = new Map() // phrase (lower case) -> { phrase, context }
  for (const r of results) {
    if (r.source === 'ai' && r.candidates.length === 0 && !unmatched.has(r.text.toLowerCase())) {
      unmatched.set(r.text.toLowerCase(), { phrase: r.text, context: r.context })
    }
  }
  const external = new Map()
  let lookupFailed = 0
  const batches = []
  const phrases = [...unmatched.values()]
  for (let i = 0; i < phrases.length; i += LOOKUP_BATCH) batches.push(phrases.slice(i, i + LOOKUP_BATCH))
  for (let i = 0; i < batches.length; i++) {
    onProgress({ stage: 'lookup', current: i + 1, total: batches.length })
    try {
      for (const found of await lookupPhrases(batches[i], lang)) {
        if (found.found) external.set(found.phrase.toLowerCase(), found)
      }
    } catch (err) {
      // Not fatal: those phrases stay «официальное соответствие не определено».
      console.error('Official-source lookup failed:', err)
      lookupFailed += batches[i].length
    }
  }

  // ---- Assemble ----------------------------------------------------------------
  results = propagateFixes(results, textPages)
    .sort((a, b) => a.page - b.page || a.start - b.start)
    .map((r) => ({
      ...r,
      external: r.candidates.length === 0 ? (external.get(r.text.toLowerCase()) ?? null) : null,
      id: `${r.page}:${r.start}:${r.end}`,
    }))

  return {
    fileName: file.name,
    doc,
    results,
    glossarySize,
    unreadablePages,
    ai: { failedChunks: aiFailedChunks, totalChunks: chunks.length, error: aiError },
    lookup: { searched: phrases.length, found: external.size, failed: lookupFailed },
  }
}

/**
 * The replacement to write for a result, given the user's decisions, or null.
 *   'fix'    -> the verified candidate, unless the user rejected it
 *   'review' -> only a candidate the user explicitly confirmed / chose
 * External (non-base) terms are never applicable.
 */
export function chosenFix(result, decision, choice) {
  if (decision === 'rejected') return null
  if (result.status === 'fix') return result.candidates[0]?.applicable ? result.candidates[0] : null
  if (result.status === 'review' && choice !== undefined && choice !== null) {
    const candidate = result.candidates[choice]
    return candidate?.applicable ? candidate : null
  }
  return null
}

/**
 * The basis of the decision for one result, in the agreed record format:
 * { originalPhrase, officialTerm, matchType, confidence, context, reason,
 *   source, sourceUrl, status }. `chosen` is the candidate the user ended up
 * with (chosenFix), which makes a confirmed / chosen match 'confirmed'.
 */
export function decisionRecord(result, labels, chosen = null) {
  const fromExternal = !result.candidates.length && result.external
  return {
    originalPhrase: result.text,
    officialTerm: fromExternal ? result.external.officialTerm : (chosen?.official ?? result.official ?? null),
    matchType: result.matchType,
    confidence: Number(result.confidence.toFixed(2)),
    context: result.context,
    reason: fromExternal ? result.external.reason || result.explanation : result.explanation,
    source: fromExternal ? result.external.sourceTitle : result.candidates.length ? labels.sourceBase : null,
    sourceUrl: fromExternal ? result.external.sourceUrl : null,
    status: result.status === 'ok' || chosen ? 'confirmed' : 'needs_review',
    ...(result.candidates.length > 1
      ? { alternatives: result.candidates.map((c) => ({ officialTerm: c.official, difference: c.difference })) }
      : {}),
  }
}

/** Paragraph number (1-based) of a DOCX result, for documents without page info. */
export function paragraphNumber(doc, result) {
  if (doc.kind !== 'docx') return null
  const para = doc.paragraphs.find(
    (p) => p.page === result.page && result.start >= p.offset && result.start <= p.offset + p.length,
  )
  return para ? para.index + 1 : null
}
