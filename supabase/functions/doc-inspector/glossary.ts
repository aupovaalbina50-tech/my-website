// Official glossary for the inspector: every row of the site's `terms`
// table (930 terms at the time of writing). This table is the single source
// of truth — no correction is ever applied automatically unless it resolves
// to one of these rows. Loaded with the service-role client and kept in
// module memory for a few minutes, so a warm function instance doesn't
// re-read the table on every request.

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

/** Short reference used in the prompt ("T17") <-> glossary row. */
export function termRef(index: number): string {
  return `T${index + 1}`
}

export function termByRef(terms: GlossaryTerm[], ref: string): GlossaryTerm | null {
  const match = /^T(\d+)$/.exec(ref.trim())
  if (!match) return null
  return terms[Number(match[1]) - 1] ?? null
}
