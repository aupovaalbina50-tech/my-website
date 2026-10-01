// Official glossary for the inspector: every row of the site's `terms`
// table (930 terms at the time of writing). Loaded with the service-role
// client and kept in module memory for a few minutes, so a warm function
// instance doesn't re-read the table on every request.

import { createClient } from 'npm:@supabase/supabase-js@2'

export interface GlossaryTerm {
  id: string
  kk: string | null
  ru: string | null
  en: string | null
  category: string
}

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
// Edge Function by the platform.
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const CACHE_TTL_MS = 10 * 60 * 1000
const PAGE_SIZE = 1000 // PostgREST returns at most 1000 rows per request

let cached: { terms: GlossaryTerm[]; loadedAt: number } | null = null

export async function loadGlossary(): Promise<GlossaryTerm[]> {
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.terms

  const terms: GlossaryTerm[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('terms')
      .select('id, kk, ru, en, category')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to load glossary: ${error.message}`)
    terms.push(...(data as GlossaryTerm[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  cached = { terms, loadedAt: Date.now() }
  return terms
}

// Lower-case, trimmed, single spaces, no surrounding quotes — so «Эвакуация»
// from the model matches "эвакуация" in the table.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[«»"'“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Index every language form and every comma/semicolon-separated variant of a
// term ("aerial ladder, turntable ladder") to the term itself.
function buildIndex(terms: GlossaryTerm[]): Map<string, GlossaryTerm> {
  const index = new Map<string, GlossaryTerm>()
  for (const term of terms) {
    for (const value of [term.kk, term.ru, term.en]) {
      if (!value) continue
      const forms = [value, ...value.split(/[;,]/)]
      for (const form of forms) {
        const key = normalize(form)
        if (key && !index.has(key)) index.set(key, term)
      }
    }
  }
  return index
}

let indexed: { source: GlossaryTerm[]; index: Map<string, GlossaryTerm> } | null = null

/**
 * Finds the glossary entry for the model's recommended term, if there is one.
 * Returns null for replacements that aren't glossary terms (e.g. an
 * abbreviation's expansion) — the UI then can't offer "Add to my dictionary".
 */
export function findGlossaryTerm(terms: GlossaryTerm[], correctTerm: string): GlossaryTerm | null {
  if (!indexed || indexed.source !== terms) indexed = { source: terms, index: buildIndex(terms) }
  return indexed.index.get(normalize(correctTerm)) ?? null
}
