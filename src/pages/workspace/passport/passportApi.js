import { supabase } from '../../../supabaseClient'
import { loadDocVersions } from '../../account/documents/useDocuments.js'

// Storage of «Паспорт документа»: the action log (work_document_events,
// migration 0059) and the reading of everything the passport shows. RLS
// limits every query to the user's own rows.

/**
 * Logs one action. Never blocks or breaks the work with the document: a
 * failed write (no connection, table not created yet) is only reported to
 * the console.
 */
export function logEvent(userId, documentId, kind, summary = '', details = {}, version = null) {
  if (!userId || !documentId) return Promise.resolve()
  return supabase
    .from('work_document_events')
    .insert({ user_id: userId, document_id: documentId, kind, summary: String(summary).slice(0, 500), details, version })
    .then(({ error }) => {
      if (error) console.warn('Document event not logged:', kind, error.message)
    })
}

const settle = (p) => p.then((data) => ({ data, error: false })).catch(() => ({ data: [], error: true }))

/** Versions, completed checks and logged actions of one document; each part may fail on its own. */
export async function loadPassportData(documentId) {
  const [versions, history, events] = await Promise.all([
    settle(loadDocVersions(documentId)),
    settle(
      supabase
        .from('inspection_history')
        .select('id, created_at, file_name, issue_count, status, snapshot')
        .eq('snapshot->>documentId', documentId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error
          return data ?? []
        }),
    ),
    settle(
      supabase
        .from('work_document_events')
        .select('id, kind, summary, details, version, created_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(500)
        .then(({ data, error }) => {
          if (error) throw error
          return data ?? []
        }),
    ),
  ])
  return { versions, history, events }
}
