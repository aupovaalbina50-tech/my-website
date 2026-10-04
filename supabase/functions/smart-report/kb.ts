// Knowledge base retrieval (RAG) for «Рапортты құрастыру».
//
// The AI never gets the whole base in its prompt. Before each step the
// relevant entries are looked up in public.kb_entries:
//   1. semantic search — Gemini embeddings + pgvector (kb_match)
//   2. lexical fallback — trigram similarity (kb_search_text), used when the
//      embedding API is unavailable
// Each retrieved entry carries its source, clause and status, so every
// suggestion can say where it comes from. Entries added or changed later get
// their embedding here, lazily, at the next analysis (embedPending).

import { createClient } from 'npm:@supabase/supabase-js@2'

const EMBED_MODEL = Deno.env.get('SMART_REPORT_EMBED_MODEL') || 'gemini-embedding-001'
const DIMENSIONS = 768
const BATCH = 100
// Pending rows embedded per analysis. The free Gemini tier allows ~100
// embeddings a minute, so one small batch is taken per analysis and the
// rest of the quota stays for the analysis itself; a large import catches
// up over the next analyses.
const PENDING_PER_CALL = 40

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

export interface KbEntry {
  id: string
  kind: string
  category: string
  title: string
  kk: string | null
  ru: string | null
  en: string | null
  definition_ru: string | null
  definition_kk: string | null
  clause: string | null
  status: 'official' | 'needs_review' | 'outdated'
  term_id: string | null
  source_title: string | null
  source_number: string | null
  source_date: string | null
  source_url: string | null
  source_priority: number | null
  similarity: number
}

type TaskType = 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'

/** Embeddings for up to BATCH texts; null if the API is unavailable. */
async function embed(texts: string[], taskType: TaskType): Promise<number[][] | null> {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key || !texts.length) return null
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text: text.slice(0, 2000) }] },
          taskType,
          outputDimensionality: DIMENSIONS,
        })),
      }),
    })
    if (!res.ok) {
      console.warn(`smart-report: embeddings unavailable (${res.status}): ${(await res.text()).slice(0, 300)}`)
      return null
    }
    const data = await res.json()
    const vectors = (data?.embeddings ?? []).map((e: { values?: number[] }) => e.values ?? [])
    return vectors.length === texts.length && vectors.every((v: number[]) => v.length === DIMENSIONS) ? vectors : null
  } catch (error) {
    console.warn('smart-report: embeddings request failed:', error)
    return null
  }
}

const entryText = (e: { title: string; ru: string | null; kk: string | null; en: string | null; definition_ru: string | null; definition_kk: string | null }) =>
  [e.title, e.ru, e.kk, e.en, e.definition_ru, e.definition_kk].filter(Boolean).join(' | ')

/** Computes embeddings for new / changed entries. Returns how many were written. */
export async function embedPending(limit = PENDING_PER_CALL): Promise<number> {
  const { data: rows, error } = await supabase
    .from('kb_entries')
    .select('id, title, ru, kk, en, definition_ru, definition_kk')
    .is('embedding', null)
    .eq('is_active', true)
    .limit(limit)
  if (error || !rows?.length) return 0
  let written = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const vectors = await embed(chunk.map(entryText), 'RETRIEVAL_DOCUMENT')
    if (!vectors) break
    const payload = chunk.map((row, j) => ({ id: row.id, embedding: `[${vectors[j].join(',')}]` }))
    const { data: count } = await supabase.rpc('kb_set_embeddings', { payload })
    written += Number(count) || 0
  }
  return written
}

/** Short pieces of a text to search with: sentences, long ones cut. */
export function queriesFrom(texts: string[], max = 24): string[] {
  const out: string[] = []
  for (const text of texts) {
    for (const sentence of text.split(/(?<=[.!?;])\s+|\n+/)) {
      const s = sentence.trim()
      if (s.length >= 6) out.push(s.slice(0, 300))
    }
  }
  return [...new Set(out)].slice(0, max)
}

/**
 * Entries relevant to the given pieces of text, best first. `mode` says how
 * they were found: 'semantic' (embeddings) or 'lexical' (fallback).
 */
export async function retrieve(queries: string[], perQuery = 6): Promise<{ entries: KbEntry[]; mode: 'semantic' | 'lexical' }> {
  // New or edited entries become searchable before this analysis.
  await embedPending().catch(() => 0)

  const best = new Map<string, KbEntry>()
  const keep = (rows: KbEntry[] | null) => {
    for (const row of rows ?? []) {
      const prev = best.get(row.id)
      if (!prev || row.similarity > prev.similarity) best.set(row.id, row)
    }
  }

  let mode: 'semantic' | 'lexical' = 'semantic'
  const vectors = await embed(queries, 'RETRIEVAL_QUERY')
  if (vectors) {
    const results = await Promise.all(
      vectors.map((v) => supabase.rpc('kb_match', { query_embedding: `[${v.join(',')}]`, match_count: perQuery, min_similarity: 0.6 })),
    )
    results.forEach((r) => keep(r.data as KbEntry[]))
  } else {
    mode = 'lexical'
    const results = await Promise.all(queries.map((q) => supabase.rpc('kb_search_text', { query: q, match_count: perQuery })))
    results.forEach((r) => keep(r.data as KbEntry[]))
  }

  const entries = [...best.values()].sort(
    (a, b) => (a.source_priority ?? 9) - (b.source_priority ?? 9) || b.similarity - a.similarity,
  )
  return { entries, mode }
}

/** Wording rules for service documents (few; always given to the model). */
export async function documentRules(): Promise<KbEntry[]> {
  const { data } = await supabase
    .from('kb_entries')
    .select('id, kind, category, title, kk, ru, en, definition_ru, definition_kk, clause, status, term_id')
    .eq('kind', 'rule')
    .eq('is_active', true)
    .neq('status', 'outdated')
    .limit(30)
  return ((data ?? []) as KbEntry[]).map((e) => ({
    ...e,
    source_title: null,
    source_number: null,
    source_date: null,
    source_url: null,
    source_priority: null,
    similarity: 1,
  }))
}

/** «[K3] автоцистерна пожарная — өрт сөндіру автоцистернасы (термин; официально; источник: …)» */
export function contextLines(entries: KbEntry[], lang: 'kk' | 'ru', prefix = 'K'): string {
  return entries
    .map((e, i) => {
      const name = [e.ru, e.kk].filter(Boolean).join(' — ') || e.title
      const def = (lang === 'kk' ? e.definition_kk || e.definition_ru : e.definition_ru || e.definition_kk) ?? ''
      const status = e.status === 'official' ? 'официально' : 'требует проверки'
      const source = e.source_title ? `; источник: ${e.source_title}${e.clause ? `, ${e.clause}` : ''}` : ''
      return `[${prefix}${i + 1}] ${name} (${e.kind}; ${status}${source})${def ? `\n     Определение: ${def.slice(0, 600)}` : ''}`
    })
    .join('\n')
}

/** What the page shows as «Основание / Источник» for an entry. */
export function basisOf(e: KbEntry) {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    ru: e.ru,
    kk: e.kk,
    en: e.en,
    definition_ru: e.definition_ru,
    definition_kk: e.definition_kk,
    status: e.status,
    clause: e.clause,
    source_title: e.source_title,
    source_number: e.source_number,
    source_date: e.source_date,
    source_url: e.source_url,
    source_priority: e.source_priority,
  }
}
