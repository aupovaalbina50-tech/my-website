import { supabase } from '../supabaseClient'
import { MINISTRY_NAME, MINISTRY_MISSION, MINISTRY_LEADERSHIP, MINISTRY_CONTACTS } from '../data/ministry'
import {
  MINISTRY_TERRITORIAL_BODIES,
  MINISTRY_SUBORDINATE_INSTITUTIONS,
  MINISTRY_SUBORDINATE_ORGANIZATIONS,
} from '../data/ministryStructure'
import { COMMITTEES } from '../data/committees'

// Lightweight keyword retrieval over the site's own content — no embeddings,
// no external calls. Good enough for short factual questions, cheap enough
// to run on every message before we ever touch the LLM.

const STOPWORDS = new Set([
  // ru
  'что', 'как', 'кто', 'где', 'когда', 'почему', 'зачем', 'это', 'какой', 'какая',
  'какие', 'такое', 'зачем', 'ли', 'мне', 'меня', 'мой', 'моя', 'про', 'для', 'или',
  // kk
  'не', 'қалай', 'кім', 'қайда', 'қашан', 'неге', 'қандай', 'бұл', 'үшін', 'туралы',
  // en
  'what', 'how', 'who', 'where', 'when', 'why', 'which', 'the', 'is', 'are', 'a',
  'an', 'about', 'for', 'of', 'to', 'me', 'please', 'tell',
])

function tokenize(query) {
  return (query.toLowerCase().match(/[a-zа-яәғқңөұүһі0-9]+/gi) || [])
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

function scoreText(text, tokens) {
  if (!text) return 0
  const lower = text.toLowerCase()
  return tokens.reduce((score, token) => (lower.includes(token) ? score + 1 : score), 0)
}

async function searchTerms(tokens, limit = 6) {
  if (tokens.length === 0) return []
  const orFilter = tokens
    .flatMap((token) => [`ru.ilike.%${token}%`, `kk.ilike.%${token}%`, `en.ilike.%${token}%`])
    .join(',')

  const { data, error } = await supabase
    .from('terms')
    .select('ru, kk, en, category')
    .or(orFilter)
    .limit(limit)

  if (error || !data) return []
  return data.map((row) => ({
    type: 'term',
    text: `Термин / термин / term: RU="${row.ru}" · KK="${row.kk}" · EN="${row.en || '—'}" (категория: ${row.category || '—'})`,
  }))
}

async function searchQuotes(tokens, limit = 3) {
  if (tokens.length === 0) return []
  const orFilter = tokens.map((token) => `quote_text.ilike.%${token}%`).join(',')

  const { data, error } = await supabase
    .from('quotes')
    .select('quote_number, quote_text, author')
    .or(orFilter)
    .limit(limit)

  if (error || !data) return []
  return data.map((row) => ({
    type: 'quote',
    text: `Цитата №${row.quote_number} — «${row.quote_text}» (${row.author})`,
  }))
}

function searchMinistryStatic(tokens) {
  const results = []
  for (const lang of ['ru', 'kk']) {
    const missionScore = scoreText(MINISTRY_MISSION[lang], tokens)
    if (missionScore > 0) {
      results.push({
        type: 'ministry',
        score: missionScore,
        text: `Министерство (${lang}): ${MINISTRY_NAME[lang]} — ${MINISTRY_MISSION[lang]}`,
      })
    }
  }

  for (const leader of MINISTRY_LEADERSHIP) {
    const blob = `${leader.name.ru} ${leader.name.kk} ${leader.role.ru} ${leader.role.kk}`
    const score = scoreText(blob, tokens)
    if (score > 0) {
      results.push({
        type: 'leadership',
        score,
        text: `Руководство: ${leader.name.ru} — ${leader.role.ru} (${leader.name.kk} — ${leader.role.kk})`,
      })
    }
  }

  const contactsBlob = `${MINISTRY_CONTACTS.address.ru} ${MINISTRY_CONTACTS.address.kk} контакты телефон email`
  if (scoreText(contactsBlob, tokens) > 0 || tokens.includes('контакт') || tokens.includes('телефон')) {
    results.push({
      type: 'contacts',
      score: 1,
      text: `Контакты министерства: адрес — ${MINISTRY_CONTACTS.address.ru}; email — ${MINISTRY_CONTACTS.email}; телефон доверия — ${MINISTRY_CONTACTS.trustLine}; канцелярия — ${MINISTRY_CONTACTS.office}`,
    })
  }

  const structureGroups = [
    ['территориальные органы (регионы)', MINISTRY_TERRITORIAL_BODIES.ru.regional],
    ['территориальные органы (города)', MINISTRY_TERRITORIAL_BODIES.ru.cities],
    ['службы пожаротушения и аварийно-спасательных работ', MINISTRY_TERRITORIAL_BODIES.ru.fireRescue],
    ['управления промышленной безопасности', MINISTRY_TERRITORIAL_BODIES.ru.industrialSafety],
    ['подведомственные государственные учреждения', MINISTRY_SUBORDINATE_INSTITUTIONS.ru],
    ['подведомственные организации', MINISTRY_SUBORDINATE_ORGANIZATIONS.ru],
  ]
  for (const [label, list] of structureGroups) {
    const matches = list.filter((item) => scoreText(item, tokens) > 0)
    if (matches.length > 0) {
      results.push({
        type: 'structure',
        score: matches.length,
        text: `${label}: ${matches.slice(0, 5).join('; ')}`,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 4)
}

function searchCommittees(tokens) {
  const results = []
  for (const committee of COMMITTEES) {
    const blob = `${committee.name.ru} ${committee.name.kk} ${committee.description.ru} ${committee.chair.ru}`
    const score = scoreText(blob, tokens)
    if (score > 0) {
      results.push({
        type: 'committee',
        score,
        text: `Комитет: ${committee.name.ru} — ${committee.description.ru} Председатель: ${committee.chair.ru}${committee.phone ? `, телефон: ${committee.phone.ru}` : ''}`,
      })
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 3)
}

/**
 * Builds a grounding context for the assistant from the site's own data.
 * Returns { contextText, found } — found=false means nothing matched and
 * the caller can short-circuit without spending an LLM call.
 */
export async function buildContext(query) {
  const tokens = tokenize(query)

  // Too short / all stopwords (e.g. "hi", "thanks", "рахмет") — likely small
  // talk, not a factual question. Let the LLM handle it naturally instead
  // of forcing a "not found in the database" reply to a greeting.
  if (tokens.length === 0) {
    return { contextText: '', found: true }
  }

  const [terms, quotes] = await Promise.all([searchTerms(tokens), searchQuotes(tokens)])
  const ministry = searchMinistryStatic(tokens)
  const committees = searchCommittees(tokens)

  const snippets = [...terms, ...ministry, ...committees, ...quotes]

  // No local keyword match doesn't mean "refuse" — it just means the LLM
  // gets no site-specific grounding for this question. The system prompt
  // decides from there: use general civil-defense/MChS knowledge if the
  // question is in-domain, or decline if it's genuinely off-topic. We still
  // send it to the model instead of short-circuiting locally.
  if (snippets.length === 0) {
    return { contextText: '', found: true }
  }

  const contextText = snippets.map((s, i) => `${i + 1}. ${s.text}`).join('\n')
  return { contextText, found: true }
}
