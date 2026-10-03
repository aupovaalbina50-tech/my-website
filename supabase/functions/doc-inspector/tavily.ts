// Tavily web search (free plan: ~1000 basic searches a month), used for the
// official-source lookup when no ANTHROPIC_API_KEY is set: the free Gemini
// key has no Google Search grounding quota, so Tavily finds the pages and
// Gemini only reads them. Secret: TAVILY_API_KEY (https://app.tavily.com).

import { InspectionError } from './llm.ts'

export interface SearchPage {
  url: string
  title: string
  content: string
}

export function tavilyConfigured(): boolean {
  return Boolean(Deno.env.get('TAVILY_API_KEY'))
}

/** One basic search (1 credit) limited to `domains` (subdomains included). */
export async function searchTavily(query: string, domains: string[], maxResults = 5): Promise<SearchPage[]> {
  let res: Response
  try {
    res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('TAVILY_API_KEY')}` },
      body: JSON.stringify({ query, search_depth: 'basic', max_results: maxResults, include_domains: domains }),
    })
  } catch {
    throw new InspectionError(503, 'ai_unavailable', 'Tavily API is unreachable')
  }
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 401 || res.status === 403) throw new InspectionError(500, 'config_error', 'TAVILY_API_KEY is missing or invalid')
    // 429 = rate limit; 432/433 = the plan's monthly credits are used up.
    if (res.status === 429 || res.status === 432 || res.status === 433) {
      throw new InspectionError(503, 'ai_busy', `Tavily quota reached: ${body}`)
    }
    throw new InspectionError(502, 'ai_unavailable', `Tavily API error ${res.status}: ${body}`)
  }
  const data = await res.json()
  return (Array.isArray(data?.results) ? data.results : [])
    .filter((r: { url?: string }) => typeof r?.url === 'string')
    .map((r: { url: string; title?: string; content?: string }) => ({
      url: r.url,
      title: String(r.title ?? ''),
      content: String(r.content ?? ''),
    }))
}
