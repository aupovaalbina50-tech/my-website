// Terminology analysis of one chunk of document text.
//
//   1. Deterministic pass (matcher.ts): every glossary term in the text,
//      'ok' or 'fix' (wrong hyphen/space). No AI, no guessing.
//   2. AI pass (ANALYZER prompt): what exact matching can't see — semantic
//      matches (different words, same official meaning), misspellings,
//      confused terms, wrong context, wrong functioning of a term.
//   3. Validation: each AI finding must
//        - point at text that really exists on that page (else dropped),
//        - offer candidates that resolve to glossary rows; a candidate may
//          replace the phrase only if its text is word for word that glossary
//          term in the official spelling.
//      'fix' (auto-applicable) needs exactly one such candidate, confidence
//      ≥ 0.85 and the model's assurance that the meaning is kept. Everything
//      else is 'review': medium confidence or several candidates -> the user
//      confirms / chooses; no candidate -> «официальное соответствие не
//      определено». The glossary wins over the model when they disagree.
//
// If the AI call fails, the deterministic results are still returned, with
// ai.status = 'failed', so the user gets an honest partial check.

import type { GlossaryTerm } from './glossary.ts'
import { termByRef, termRef } from './glossary.ts'
import { findTerms, foldYo, formsFor, officialFormOf, primaryText, type TermMatch } from './matcher.ts'
import { ANALYZER_SCHEMA, buildAnalyzerPrompt, type ErrorType } from './systemPrompt.ts'
import { callModel, InspectionError } from './llm.ts'

export interface Segment {
  page: number
  /** Offset of `text` inside the page text (pages may be split into segments). */
  offset: number
  text: string
}

export interface Candidate {
  /** Replacement for the document phrase, or null if the model gave no usable form. */
  suggestion: string | null
  /** The glossary entry text it resolves to. */
  official: string
  term: GlossaryTerm
  /** How this candidate differs in meaning from the other candidates. */
  difference: string
  /** suggestion is verified word for word as this glossary term -> may replace the phrase. */
  applicable: boolean
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Result {
  page: number
  start: number // offsets inside the page text
  end: number
  text: string
  status: 'ok' | 'review' | 'fix'
  matchType: 'exact' | 'semantic'
  confidence: number
  level: ConfidenceLevel
  /** Verified glossary candidates, best first. */
  candidates: Candidate[]
  // Primary candidate, flattened for convenience (null when there is none).
  suggestion: string | null
  official: string | null
  term: GlossaryTerm | null
  errorType: ErrorType | null
  /** Why: meaning, context, reason for the match. */
  explanation: string
  /** The sentence the fragment is in (basis of the decision). */
  context: string
  meaningPreserved: boolean
  source: 'glossary' | 'ai'
}

export interface AnalyzeResponse {
  results: Result[]
  ai: { status: 'ok' | 'failed'; model?: string; error?: string }
}

const LANGUAGE_NAME = { kk: 'казахский', ru: 'русский' } as const

// Confidence levels for semantic matching.
const HIGH_CONFIDENCE = 0.85
const MEDIUM_CONFIDENCE = 0.6
const MAX_CANDIDATES = 3

// Letters only Kazakh Cyrillic has: a sentence with any of them is Kazakh.
const KK_LETTERS = /[әғқңөұүһі]/i

function levelOf(confidence: number): ConfidenceLevel {
  if (confidence >= HIGH_CONFIDENCE) return 'high'
  if (confidence >= MEDIUM_CONFIDENCE) return 'medium'
  return 'low'
}

/** The sentence containing [start, end) — the context the decision rests on. */
function sentenceAround(text: string, start: number, end: number): string {
  let from = start
  while (from > 0 && start - from < 220 && !/[.!?\n]/.test(text[from - 1])) from--
  let to = end
  while (to < text.length && to - end < 220 && !/[.!?\n]/.test(text[to])) to++
  return text.slice(from, Math.min(text.length, to + 1)).trim()
}

// Types where a correctly spelled glossary term can still be wrong (meaning,
// form, how it functions in the sentence).
const CAN_OVERRIDE_OK = new Set<ErrorType>(['context', 'confusion', 'word_form', 'abbreviation', 'usage'])

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Regex for a model-quoted fragment: whitespace-tolerant, ё == е. */
function looseRe(needle: string, flags: string): RegExp | null {
  const cleaned = foldYo(needle.trim())
  if (!cleaned) return null
  return new RegExp(cleaned.split(/\s+/).map(escapeRe).join('[\\s\\u00A0]+'), flags)
}

function occurrences(haystack: string, needle: string): Array<{ start: number; end: number }> {
  const folded = foldYo(haystack)
  for (const flags of ['gu', 'giu']) {
    const re = looseRe(needle, flags)
    if (!re) return []
    const found = [...folded.matchAll(re)].map((m) => ({ start: m.index!, end: m.index! + m[0].length }))
    if (found.length) return found
  }
  return []
}

/** Where in `segment` the model's fragment is: via its context quote, else by itself. */
function locate(segment: string, foundText: string, context: string): Array<{ start: number; end: number }> {
  for (const ctx of occurrences(segment, context)) {
    const inside = occurrences(segment.slice(ctx.start, ctx.end), foundText)
    if (inside.length) return [{ start: ctx.start + inside[0].start, end: ctx.start + inside[0].end }]
  }
  return occurrences(segment, foundText)
}

function same(a: string, b: string): boolean {
  return foldYo(a).toLowerCase().replace(/\s+/g, ' ').trim() === foldYo(b).toLowerCase().replace(/\s+/g, ' ').trim()
}

function deterministicExplanation(match: TermMatch, lang: 'kk' | 'ru'): string {
  return lang === 'kk'
    ? `Құжатта терминнің базадағы ресми жазылуына сәйкес келмейтін нысаны қолданылған: дефис/бос орын дұрыс қойылмаған. Ресми термин — «${match.form.text}».`
    : `В документе использована форма, не соответствующая официальному написанию термина в базе: неверно поставлены дефис или пробел. Официальный термин — «${match.form.text}».`
}

function variantExplanation(text: string, official: string, lang: 'kk' | 'ru'): string {
  return lang === 'kk'
    ? `«${text}» — ресми емес тіркес. Платформа базасындағы ресми термин — «${official}».`
    : `«${text}» — неофициальная формулировка. Официальный термин в базе платформы — «${official}».`
}

/** `official` with the first letter capitalised like `like`. */
function matchCase(official: string, like: string): string {
  return like[0] && like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase()
    ? official[0].toUpperCase() + official.slice(1)
    : official
}

function userMessage(segments: Segment[], matches: Array<TermMatch & { page: number }>, lang: 'kk' | 'ru'): string {
  const seen = new Set<string>()
  const known: string[] = []
  for (const m of matches) {
    const key = `${m.form.termIndex}:${m.status}:${m.text.toLowerCase()}`
    if (seen.has(key) || known.length >= 200) continue
    seen.add(key)
    known.push(
      m.status === 'ok'
        ? `- «${m.text}» (${termRef(m.form.termIndex)}) — соответствует базе`
        : m.status === 'variant'
          ? `- «${m.text}» — неофициальный вариант термина ${termRef(m.form.termIndex)} «${primaryText(m.form.term, m.form.lang)}» (подтверждено базой): верни находку unofficial_variant с этим термином в suggested_text в той грамматической форме, которая нужна в предложении`
          : `- «${m.text}» → «${m.replacement}» (${termRef(m.form.termIndex)}) — ошибка дефиса, уже учтена`,
    )
  }
  const body = segments.map((s) => `=== Страница ${s.page} ===\n${s.text}`).join('\n\n')
  return `Язык пояснений (reason): ${LANGUAGE_NAME[lang]}.

Уже найдено автоматической сверкой с базой:
${known.length ? known.join('\n') : '- ничего'}

Проверь терминологию в тексте документа ниже.

${body}`
}

export async function analyzeSegments(segments: Segment[], glossary: GlossaryTerm[], lang: 'kk' | 'ru'): Promise<AnalyzeResponse> {
  const forms = formsFor(glossary)

  // ---- 1. Deterministic glossary matching -------------------------------
  const matches = segments.flatMap((segment) =>
    findTerms(segment.text, forms).map((m) => ({
      ...m,
      page: segment.page,
      start: m.start + segment.offset,
      end: m.end + segment.offset,
    })),
  )
  const results: Result[] = matches.map((m) => {
    const segment = segments.find((s) => s.page === m.page && m.start >= s.offset && m.end <= s.offset + s.text.length)!
    const context = sentenceAround(segment.text, m.start - segment.offset, m.end - segment.offset)
    if (m.status === 'variant') {
      // Confirmed by the base, so always reported. The official term can be
      // pasted as is only when the variant stands in its dictionary form;
      // otherwise the AI pass supplies the inflected form (and replaces this).
      const official = primaryText(m.form.term, m.form.lang)
      const suggestion = same(m.text, m.form.text) ? matchCase(official, m.text) : null
      const candidate: Candidate = { suggestion, official, term: m.form.term, difference: '', applicable: suggestion !== null }
      return {
        page: m.page,
        start: m.start,
        end: m.end,
        text: m.text,
        status: 'review',
        matchType: 'exact',
        confidence: 1,
        level: 'high',
        candidates: [candidate],
        suggestion,
        official,
        term: m.form.term,
        errorType: 'unofficial_variant',
        explanation: variantExplanation(m.text, official, lang),
        context,
        meaningPreserved: true,
        source: 'glossary',
      }
    }
    const candidate: Candidate = {
      suggestion: m.status === 'fix' ? m.replacement! : null,
      official: m.form.text,
      term: m.form.term,
      difference: '',
      applicable: m.status === 'fix',
    }
    return {
      page: m.page,
      start: m.start,
      end: m.end,
      text: m.text,
      status: m.status,
      matchType: 'exact',
      confidence: 1,
      level: 'high',
      candidates: [candidate],
      suggestion: candidate.suggestion,
      official: candidate.official,
      term: candidate.term,
      errorType: m.status === 'fix' ? 'hyphenation' : null,
      explanation: m.status === 'fix' ? deterministicExplanation(m, lang) : '',
      context,
      meaningPreserved: true,
      source: 'glossary',
    }
  })

  // ---- 2. AI pass --------------------------------------------------------
  let raw: any[]
  let model: string
  try {
    const out = await callModel({
      system: buildAnalyzerPrompt(glossary),
      parts: [{ type: 'text', text: userMessage(segments, matches, lang) }],
      schema: ANALYZER_SCHEMA,
      maxTokens: 16000,
    })
    raw = Array.isArray(out.json?.findings) ? out.json.findings : []
    model = out.model
  } catch (error) {
    const code = error instanceof InspectionError ? error.code : 'internal_error'
    console.error('doc-inspector analyze AI error:', error)
    return { results, ai: { status: 'failed', error: code } }
  }

  // ---- 3. Validate every AI finding against the text and the glossary ----
  for (const f of raw) {
    const foundText = String(f.found_text ?? '').trim()
    if (!foundText) continue

    const pageSegments = segments.filter((s) => s.page === f.page)
    let located: { segment: Segment; start: number; end: number } | null = null
    for (const segment of pageSegments.length ? pageSegments : segments) {
      const hit = locate(segment.text, foundText, String(f.context ?? ''))[0]
      if (hit) {
        located = { segment, ...hit }
        break
      }
    }
    if (!located) {
      console.warn('doc-inspector: dropped AI finding not present in text:', foundText)
      continue
    }
    const start = located.start + located.segment.offset
    const end = located.end + located.segment.offset
    const page = located.segment.page
    const text = located.segment.text.slice(located.start, located.end)
    const errorType: ErrorType = f.error_type
    // The replacement must be in the document's language, not the UI's: a
    // Russian sentence never gets a Kazakh term pasted into it, or vice versa.
    const textLang: 'kk' | 'ru' = KK_LETTERS.test(sentenceAround(located.segment.text, located.start, located.end)) ? 'kk' : 'ru'

    // Glossary is the source of truth: every candidate must resolve to a
    // glossary row, and its replacement text must be that term in the
    // official spelling (only the grammatical ending may differ).
    const candidates: Candidate[] = []
    for (const c of Array.isArray(f.candidates) ? f.candidates : []) {
      const suggestion = String(c?.suggested_text ?? '').trim()
      let term = termByRef(glossary, String(c?.term_ref ?? ''))
      let form = suggestion ? officialFormOf(suggestion, forms, term ?? undefined) : null
      if (!form && suggestion) {
        // The model gave the right words with a wrong reference.
        form = officialFormOf(suggestion, forms)
        if (form) term = form.term
      }
      if (!term || candidates.some((x) => x.term.id === term!.id)) continue
      if (form && form.lang !== textLang) form = null
      const applicable = Boolean(form) && !same(suggestion, text) && !/\d/.test(text) && !/\d/.test(suggestion)
      candidates.push({
        // Keep a capital letter at the start of a sentence.
        suggestion: applicable ? matchCase(suggestion, text) : null,
        official: form?.text ?? (term[textLang] || term.ru || term.kk || ''),
        term,
        difference: String(c?.difference ?? ''),
        applicable,
      })
      if (candidates.length === MAX_CANDIDATES) break
    }
    // A «finding» whose only candidate is the very same text is no error.
    if (candidates.length === 1 && !candidates[0].applicable && same(candidates[0].official, text)) continue

    const confidence = Math.max(0, Math.min(1, Number(f.confidence) || 0))
    const level: ConfidenceLevel = candidates.length ? levelOf(confidence) : 'low'
    const meaningPreserved = f.meaning_preserved === true
    // Applied automatically only when unambiguous: one verified candidate,
    // high confidence, meaning kept. Several candidates -> the user chooses.
    const autoFix = candidates.length === 1 && candidates[0].applicable && level === 'high' && meaningPreserved

    // Overlap with a deterministic match: the deterministic result wins,
    // except for errors a correctly spelled term can still have (meaning),
    // or when the AI flags a longer phrase around the term («огнетушитель
    // ручной» around «огнетушитель»).
    const overlapIndex = results.findIndex((r) => r.page === page && start < r.end && r.start < end)
    if (overlapIndex !== -1) {
      const other = results[overlapIndex]
      const widerPhrase = start <= other.start && end >= other.end && end - start > other.end - other.start
      // A base-confirmed unofficial variant gives way only to an AI finding
      // that offers the same term in a verified, inflected form.
      const inflectsVariant =
        other.errorType === 'unofficial_variant' && candidates.some((c) => c.applicable && c.term.id === other.term?.id)
      if (other.errorType === 'unofficial_variant' && !inflectsVariant) continue
      if (!inflectsVariant && (other.source === 'ai' || other.status === 'fix' || !(CAN_OVERRIDE_OK.has(errorType) || widerPhrase))) continue
      results.splice(overlapIndex, 1)
    }

    const primary = candidates[0] ?? null
    results.push({
      page,
      start,
      end,
      text,
      status: autoFix ? 'fix' : 'review',
      matchType: f.match_type === 'exact' ? 'exact' : 'semantic',
      confidence,
      level,
      candidates,
      suggestion: primary?.suggestion ?? null,
      official: primary?.official ?? null,
      term: primary?.term ?? null,
      errorType,
      // The prompt's internal term references («T778») mean nothing to the reader.
      explanation: String(f.reason ?? '')
        .replace(/\s*\(?\bT\d+\b\)?/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim(),
      context: String(f.context ?? '').trim() || sentenceAround(located.segment.text, located.start, located.end),
      meaningPreserved,
      source: 'ai',
    })
  }

  results.sort((a, b) => a.page - b.page || a.start - b.start)
  return { results, ai: { status: 'ok', model } }
}
