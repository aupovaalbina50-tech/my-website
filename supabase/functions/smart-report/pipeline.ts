// The report pipeline of «Рапортты құрастыру», without HTTP:
//   extractFacts   description → grounded facts (+ «предположение» flags)
//   composeReport  facts → professional wording + draft sections
//   reviewReport   draft → corrections (было / стало / причина) + contradictions
//   termsIn        base terms that really occur in a text (no AI)
// Before composing and reviewing, the relevant knowledge-base entries are
// retrieved (kb.ts) — the model never sees the whole base.
// Every AI answer is checked here before it reaches the user: facts must be
// quoted from the description, corrections must quote the text they change.

import { loadGlossary, type GlossaryTerm } from '../doc-inspector/glossary.ts'
import { InspectionError } from '../doc-inspector/llm.ts'
import { callReportModel } from './model.ts'
import { basisOf, contextLines, documentRules, type KbEntry, queriesFrom, retrieve } from './kb.ts'
import { findTerms, formsFor, primaryText } from '../doc-inspector/matcher.ts'
import {
  COMPOSE_SCHEMA,
  composePrompt,
  EXTRACT_SCHEMA,
  extractPrompt,
  FACT_KEYS,
  REVIEW_SCHEMA,
  reviewPrompt,
  type SectionSpec,
} from './prompts.ts'

export type Lang = 'kk' | 'ru'

export const MAX_SOURCE_CHARS = 8000
const MAX_FACT_CHARS = 1000
const MAX_SECTIONS = 12
const MAX_TERMS_CHARS = 30000
// Knowledge-base entries given to the model per step (best first).
const MAX_CONTEXT = 50

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const bad = (message: string) => new InspectionError(400, 'bad_request', message)

export async function glossaryOrFail(): Promise<GlossaryTerm[]> {
  try {
    return await loadGlossary()
  } catch (error) {
    console.error('smart-report glossary error:', error)
    throw new InspectionError(500, 'glossary_unavailable', 'The term glossary could not be loaded')
  }
}

function sourceText(value: unknown): string {
  const text = str(value, MAX_SOURCE_CHARS + 1)
  if (!text) throw bad('text is required')
  if (text.length > MAX_SOURCE_CHARS) throw new InspectionError(413, 'payload_too_large', `At most ${MAX_SOURCE_CHARS} characters`)
  return text
}

/**
 * Base terms and unofficial wordings found, deterministically, in the text.
 * `matches` are the fragments as written in the text, so the page can
 * highlight exactly where each term stands.
 */
export function termsIn(text: string, glossary: GlossaryTerm[], lang: Lang) {
  const terms = new Map<string, { id: string; kk: string | null; ru: string | null; en: string | null; category: string; matches: string[] }>()
  const variants = new Map<string, { text: string; official: string }>()
  for (const m of findTerms(text, formsFor(glossary))) {
    const t = m.form.term
    if (m.status === 'variant') {
      variants.set(m.text.toLowerCase(), { text: m.text, official: primaryText(t, lang) })
    } else if (m.status === 'ok' || m.status === 'fix') {
      const entry = terms.get(t.id) ?? { id: t.id, kk: t.kk, ru: t.ru, en: t.en, category: t.category, matches: [] }
      if (!entry.matches.includes(m.text)) entry.matches.push(m.text)
      terms.set(t.id, entry)
    }
  }
  return { terms: [...terms.values()], variants: [...variants.values()] }
}

export async function termsForTexts(texts: unknown, lang: Lang) {
  const list = Array.isArray(texts) ? texts.filter((t: unknown) => typeof t === 'string') : []
  const text = list.join('\n')
  if (text.length > MAX_TERMS_CHARS) throw new InspectionError(413, 'payload_too_large', `At most ${MAX_TERMS_CHARS} characters`)
  return termsIn(text, await glossaryOrFail(), lang)
}

// ---- extract ------------------------------------------------------------------

export async function extractFacts(rawText: unknown, lang: Lang, rawToday: unknown) {
  const text = sourceText(rawText)
  const today = str(rawToday, 20) || new Date().toISOString().slice(0, 10)

  const { json: out, model } = await callReportModel({
    system: extractPrompt(lang, today),
    parts: [{ type: 'text', text: `Описание ситуации:\n"""\n${text}\n"""` }],
    schema: EXTRACT_SCHEMA,
    maxTokens: 8000,
  })

  // Keep a fact only if its quote really is in the description (or it has no
  // quote at all, e.g. a normalised time): no invented facts get through.
  const lower = text.toLowerCase()
  const facts: Record<string, { value: string; quote: string; inferred: boolean }> = {}
  for (const key of FACT_KEYS) {
    const value = str(out?.facts?.[key]?.value, MAX_FACT_CHARS)
    const quote = str(out?.facts?.[key]?.quote, MAX_FACT_CHARS)
    const grounded = !quote || lower.includes(quote.toLowerCase())
    facts[key] = grounded && value ? { value, quote, inferred: Boolean(out?.facts?.[key]?.inferred) } : { value: '', quote: '', inferred: false }
  }
  const events = Array.isArray(out?.events)
    ? out.events.slice(0, 30).map((e: any) => ({ time: str(e?.time, 10), text: str(e?.text, 400) })).filter((e: any) => e.text)
    : []
  return { title: str(out?.title, 120), facts, events, model }
}

// ---- compose ------------------------------------------------------------------

// «Спасённых нет» is a statement of fact. If the user never said it (the
// field is empty), such a sentence is removed whatever the model wrote.
// A sentence is dropped when ALL the facts it speaks about are empty.
const NONE = '(нет|жоқ|не (имеется|зафиксировано|выявлено|зарегистрировано))'
const NONE_SENTENCES: Array<{ keys: string[]; re: RegExp }> = [
  { keys: ['rescued'], re: new RegExp(`^(спас[её]нн?ых|құтқарылған\\S*)\\s+${NONE}\\.?$`, 'iu') },
  { keys: ['evacuated'], re: new RegExp(`^(эвакуированн?ых|эвакуацияланған\\S*)\\s+${NONE}\\.?$`, 'iu') },
  { keys: ['injured'], re: new RegExp(`^(пострадавших|зардап шеккен\\S*)\\s+${NONE}\\.?$`, 'iu') },
  { keys: ['dead'], re: new RegExp(`^(погибших|қаза тапқан\\S*)\\s+${NONE}\\.?$`, 'iu') },
  { keys: ['staffInjuries'], re: new RegExp(`^травм\\S* (у )?личного состава\\s+${NONE}\\.?$`, 'iu') },
  { keys: ['equipmentFaults'], re: new RegExp(`^неисправност\\S* (пожарной )?техники( и оборудования)?\\s+${NONE}\\.?$`, 'iu') },
  { keys: ['staffInjuries', 'equipmentFaults'], re: new RegExp(`^травм\\S* личного состава и неисправност\\S* (пожарной )?техники\\s+${NONE}\\.?$`, 'iu') },
  { keys: ['staffInjuries'], re: /^жеке құрам\S* (арасында )?жарақат\S* (жоқ|тіркелмеді)\.?$/iu },
  { keys: ['equipmentFaults'], re: /^техника\S* ақау\S* (жоқ|анықталмады)\.?$/iu },
]

function dropInventedNone(text: string, facts: Record<string, string>): string {
  const rules = NONE_SENTENCES.filter((r) => r.keys.every((k) => !facts[k]))
  if (!rules.length) return text
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !rules.some((r) => r.re.test(sentence.trim())))
    .join(' ')
    .trim()
}

function parseSections(raw: unknown): SectionSpec[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SECTIONS) throw bad('sections must be a non-empty array')
  const sections = raw.map((s: any) => ({ key: str(s?.key, 40), title: str(s?.title, 120), guidance: str(s?.guidance, 600) }))
  if (!sections.every((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s.key) && s.title)) throw bad('bad section spec')
  return sections
}

export async function composeReport(body: any, lang: Lang) {
  const text = sourceText(body.text)
  const sections = parseSections(body.sections)
  const facts = Object.fromEntries(FACT_KEYS.map((k) => [k, str(body.facts?.[k], MAX_FACT_CHARS)]))
  const inferred = (Array.isArray(body.inferred) ? body.inferred : []).filter((k: unknown) => typeof k === 'string' && FACT_KEYS.includes(k))

  // RAG: only the knowledge relevant to THIS description goes to the model.
  const [glossary, found, rules] = await Promise.all([
    glossaryOrFail(),
    retrieve(queriesFrom([text, ...Object.values(facts).filter(Boolean)])),
    documentRules(),
  ])
  const kb = found.entries.slice(0, MAX_CONTEXT)

  const { json: out, model } = await callReportModel({
    system: composePrompt(lang, contextLines(kb, lang), contextLines(rules, lang, 'R')),
    parts: [
      {
        type: 'text',
        text: [
          `Описание ситуации:\n"""\n${text}\n"""`,
          `Подтверждённые сведения (пустая строка = нет сведения):\n${JSON.stringify(facts, null, 2)}`,
          inferred.length ? `Предположения, не подтверждённые пользователем (писать с оговоркой «примерно»): ${inferred.join(', ')}` : '',
          `Разделы рапорта (по порядку):\n${sections.map((s) => `- ${s.key}: ${s.title}. ${s.guidance}`).join('\n')}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
    schema: COMPOSE_SCHEMA,
    maxTokens: 10000,
  })

  const byKey = new Map<string, string>()
  for (const s of Array.isArray(out?.sections) ? out.sections : []) {
    const key = str(s?.key, 40)
    if (sections.some((spec) => spec.key === key)) byKey.set(key, str(s?.text, 6000))
  }
  const placeholder = lang === 'kk' ? '[көрсетілмеген]' : '[не указано]'
  const composed = sections.map((s) => ({ key: s.key, text: dropInventedNone(byKey.get(s.key) || placeholder, facts) || placeholder }))
  const phrasing = (Array.isArray(out?.phrasing) ? out.phrasing : [])
    .slice(0, 12)
    .map((p: any) => ({ original: str(p?.original, 600), professional: str(p?.professional, 1200) }))
    .filter((p: any) => p.original && p.professional)

  const terms = termsIn(composed.map((s) => s.text).join('\n'), glossary, lang)
  return { phrasing, sections: composed, ...terms, knowledge: { mode: found.mode, retrieved: kb.length }, model }
}

// ---- review -------------------------------------------------------------------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The fragment of `text` a correction quotes, as it is actually written there.
 * The model often joins a multi-line requisite into one line, so line breaks
 * and repeated spaces are matched loosely. '' if the quote is not in the text.
 */
function locate(text: string, quote: string): string {
  if (!text || !quote) return ''
  if (text.includes(quote)) return quote
  const words = quote.split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const m = text.match(new RegExp(words.map(escapeRe).join('\\s+')))
  return m ? m[0] : ''
}

const CORRECTION_KINDS = new Set(['grammar', 'spelling', 'term', 'style', 'requisites', 'assumption'])
const ISSUE_KINDS = new Set(['people', 'staff', 'equipment', 'cause', 'assumption', 'duplicate', 'logic', 'requisites', 'term_check'])

export async function reviewReport(body: any, lang: Lang) {
  const targets = new Map<string, string>()
  for (const s of Array.isArray(body.sections) ? body.sections.slice(0, MAX_SECTIONS) : []) {
    const key = str(s?.key, 40)
    if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) targets.set(key, str(s?.text, 6000))
  }
  targets.set('header.to', str(body.header?.to, 600))
  targets.set('header.from', str(body.header?.from, 600))
  if (![...targets.values()].some(Boolean)) throw bad('nothing to review')
  const facts = Object.fromEntries(FACT_KEYS.map((k) => [k, str(body.facts?.[k], MAX_FACT_CHARS)]).filter(([, v]) => v))

  const [found, rules] = await Promise.all([retrieve(queriesFrom([...targets.values()])), documentRules()])
  const kb = found.entries.slice(0, MAX_CONTEXT)
  const { json: out, model } = await callReportModel({
    system: reviewPrompt(lang, contextLines(kb, lang), contextLines(rules, lang, 'R')),
    parts: [
      {
        type: 'text',
        text: [
          `Реквизиты:\nheader.to: ${targets.get('header.to') || '—'}\nheader.from: ${targets.get('header.from') || '—'}`,
          `Разделы рапорта:\n${[...targets].filter(([k]) => !k.startsWith('header.')).map(([k, v]) => `[${k}]\n${v}`).join('\n\n')}`,
          `Подтверждённые сведения:\n${JSON.stringify(facts, null, 2)}`,
        ].join('\n\n'),
      },
    ],
    schema: REVIEW_SCHEMA,
    maxTokens: 8000,
  })

  // «K3» / «R1» → the entry it names; anything else (or an invented number) → null.
  const entryOf = (ref: unknown): KbEntry | null => {
    const m = /^\s*\[?([KR])(\d+)\]?\s*$/i.exec(str(ref, 12))
    if (!m) return null
    const list = m[1].toUpperCase() === 'K' ? kb : rules
    return list[Number(m[2]) - 1] ?? null
  }

  // A correction survives only if it quotes the text it changes and actually
  // changes something; duplicates are dropped. A terminology change is
  // «подтверждено базой» only when it rests on an official entry; otherwise
  // it is shown as «требует проверки» — never as an official term.
  const seen = new Set<string>()
  const corrections = (Array.isArray(out?.corrections) ? out.corrections : [])
    .map((c: any) => {
      const kind = CORRECTION_KINDS.has(str(c?.kind, 20)) ? str(c?.kind, 20) : 'grammar'
      const entry = entryOf(c?.basis)
      const confirmed = entry && entry.status === 'official' ? 'base' : kind === 'term' ? 'needs_review' : null
      return {
        target: str(c?.target, 40),
        was: str(c?.was, 700),
        now: str(c?.now, 700),
        reason: str(c?.reason, 300),
        kind,
        confirmed,
        basis: entry ? basisOf(entry) : null,
      }
    })
    .map((c: any) => ({ ...c, was: locate(targets.get(c.target) ?? '', c.was) }))
    .filter((c: any) => {
      const key = `${c.target}|${c.was}`
      if (!c.was || c.was === c.now || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 40)
  const issues = (Array.isArray(out?.issues) ? out.issues : [])
    .map((i: any) => {
      const entry = entryOf(i?.basis)
      return {
        kind: ISSUE_KINDS.has(str(i?.kind, 20)) ? str(i?.kind, 20) : 'logic',
        title: str(i?.title, 200),
        details: str(i?.details, 800),
        basis: entry ? basisOf(entry) : null,
      }
    })
    .filter((i: any) => i.title)
    .slice(0, 20)
  return { corrections, issues, knowledge: { mode: found.mode, retrieved: kb.length }, model }
}
