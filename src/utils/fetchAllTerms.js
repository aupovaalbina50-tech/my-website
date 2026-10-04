import { supabase } from '../supabaseClient'

const PAGE_SIZE = 1000 // PostgREST returns at most 1000 rows per request

// Loads every row of `terms`, page by page, so the glossary isn't silently
// cut off at 1000 rows. `filter` can narrow the query (e.g. by category).
// Resolves to { data, error } like a regular supabase query.
export async function fetchAllTerms(columns, filter = (query) => query) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await filter(supabase.from('terms').select(columns))
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return { data: rows, error: null }
}
