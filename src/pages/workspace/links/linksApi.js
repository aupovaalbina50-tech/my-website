import { supabase } from '../../../supabaseClient'
import { orderedPair } from './consistency.js'

// Storage of «Связанные документы» (table work_document_links, migration
// 0058). RLS limits every query to the user's own links between their own
// documents; user_id is still set on insert.

// What the card of a linked document and the comparison need.
const DOC_COLUMNS = 'id, template_id, title, lang, status, values, updated_at, checked_at, issue_count, content_hash, checked_hash'

/** The links of a document with the document on the other side: [{ link, other }]. */
export async function loadLinks(documentId) {
  const { data, error } = await supabase
    .from('work_document_links')
    .select('*')
    .or(`document_a.eq.${documentId},document_b.eq.${documentId}`)
    .order('created_at', { ascending: true })
  if (error) throw error
  const otherOf = (link) => (link.document_a === documentId ? link.document_b : link.document_a)
  const ids = (data ?? []).map(otherOf)
  let docs = []
  if (ids.length) {
    const res = await supabase.from('work_documents').select(DOC_COLUMNS).in('id', ids)
    if (res.error) throw res.error
    docs = res.data ?? []
  }
  const byId = new Map(docs.map((d) => [d.id, d]))
  return (data ?? []).map((link) => ({ link, other: byId.get(otherOf(link)) ?? null }))
}

/** The user's other documents that can be linked (newest first). */
export async function linkCandidates(documentId) {
  const { data, error } = await supabase.from('work_documents').select('id, template_id, title, status, updated_at').neq('id', documentId).order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createLink({ userId, documentId, otherId, kind, topic }) {
  const [a, b] = orderedPair(documentId, otherId)
  const { data, error } = await supabase
    .from('work_document_links')
    .insert({ user_id: userId, document_a: a, document_b: b, kind, topic: topic.slice(0, 200), reviewed: { [documentId]: new Date().toISOString() } })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateLink(id, fields) {
  const { data, error } = await supabase.from('work_document_links').update(fields).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteLink(id) {
  const { error } = await supabase.from('work_document_links').delete().eq('id', id)
  if (error) throw error
}
