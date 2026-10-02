// External official lookup — step 2 of the source order, used ONLY for
// phrases the semantic search found no match for in the 930-term base:
//   1. base of the platform (analyze.ts)  2. official state sources
//   3. legal acts  4. official terminology resources.
// The web search is restricted to OFFICIAL_DOMAINS, and every returned
// source URL must be (a) on one of those domains and (b) a page the search
// really returned — a URL the model merely wrote is discarded. External
// findings are always «needs review»: they never replace text automatically.

import { searchWithModel } from './llm.ts'
import { LOOKUP_PROMPT } from './systemPrompt.ts'

export const OFFICIAL_DOMAINS = [
  'adilet.zan.kz', // ИПС «Әділет» — законодательство РК
  'zan.kz',
  'gov.kz', // включая www.gov.kz/memleket/entities/emer — МЧС РК
  'egov.kz',
  'akorda.kz',
  'parlam.kz',
  'termincom.kz', // Республиканская терминологическая комиссия
]

export interface LookupPhrase {
  phrase: string
  context: string
}

export interface LookupResult {
  phrase: string
  found: boolean
  officialTerm: string | null
  sourceTitle: string | null
  sourceUrl: string | null
  reason: string
}

const LANGUAGE_NAME = { kk: 'казахский', ru: 'русский' } as const

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isOfficial(host: string): boolean {
  return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
}

function normalizeUrl(url: string): string {
  return url.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase()
}

/** The JSON object in the model's text (it may wrap it in prose or fences). */
function parseJson(text: string): any {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function lookupOfficial(phrases: LookupPhrase[], lang: 'kk' | 'ru'): Promise<LookupResult[]> {
  const list = phrases.map((p, i) => `${i + 1}. «${p.phrase}» — контекст: «${p.context}»`).join('\n')
  const { text, seen } = await searchWithModel({
    system: LOOKUP_PROMPT,
    text: `Язык пояснений (reason): ${LANGUAGE_NAME[lang]}.\n\nФормулировки:\n${list}`,
    allowedDomains: OFFICIAL_DOMAINS,
  })

  const seenUrls = new Set(seen.map((s) => normalizeUrl(s.url)))
  // Gemini grounding returns Google redirect URLs with the real domain as the
  // title, so there only the domain can be checked; Claude returns the real
  // page URLs, so there the exact page must have been returned.
  const redirects = seen.some((s) => hostOf(s.url)?.includes('vertexaisearch'))
  const seenHosts = new Set(seen.map((s) => s.title.toLowerCase().trim()))
  const raw: any[] = Array.isArray(parseJson(text)?.results) ? parseJson(text).results : []

  return phrases.map((p) => {
    const r = raw.find((x) => String(x?.phrase ?? '').trim().toLowerCase() === p.phrase.trim().toLowerCase())
    const notFound: LookupResult = { phrase: p.phrase, found: false, officialTerm: null, sourceTitle: null, sourceUrl: null, reason: '' }
    if (!r || r.found !== true || !r.official_term || !r.source_url) return { ...notFound, reason: String(r?.reason ?? '') }
    const url = String(r.source_url)
    const host = hostOf(url)
    const verified =
      host !== null && isOfficial(host) && (redirects ? seenHosts.has(host) || seenHosts.has(host.replace(/^www\./, '')) : seenUrls.has(normalizeUrl(url)))
    if (!verified) {
      console.warn('doc-inspector lookup: discarded unverified source', url)
      return notFound
    }
    return {
      phrase: p.phrase,
      found: true,
      officialTerm: String(r.official_term),
      sourceTitle: String(r.source_title ?? host),
      sourceUrl: url,
      reason: String(r.reason ?? ''),
    }
  })
}
