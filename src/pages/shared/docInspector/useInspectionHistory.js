import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { summarize } from './expertise.js'

// «История экспертиз»: the signed-in user's past checks (table
// inspection_history, own rows only). A snapshot of the document text, the
// findings and the user's decisions lets a check be reopened as it was; the
// original file is not stored, so a reopened check exports text only.

const SNAPSHOT_VERSION = 1
// Keep rows reasonably small; a bigger document is still checked, just not saved.
const MAX_SNAPSHOT_CHARS = 1_500_000

/** What a reopened check needs, without the binary parts (PDF, images, DOCX XML). */
export function toSnapshot(inspection, decisions, choices, locate) {
  const { doc } = inspection
  return {
    v: SNAPSHOT_VERSION,
    fileName: inspection.fileName,
    documentType: inspection.documentType ?? null,
    checkedAt: inspection.checkedAt,
    doc: {
      kind: 'saved',
      sourceKind: doc.sourceKind ?? doc.kind,
      pages: doc.pages.map((p) => ({ number: p.number, text: p.text, source: p.source })),
      pagesKnown: doc.pagesKnown,
      totalPages: doc.totalPages ?? null,
    },
    locations: Object.fromEntries(inspection.results.map((r) => [r.id, locate(r)])),
    results: inspection.results,
    glossarySize: inspection.glossarySize,
    ai: inspection.ai,
    lookup: inspection.lookup,
    unreadablePages: inspection.unreadablePages,
    illegiblePages: inspection.illegiblePages ?? 0,
    decisions,
    choices,
  }
}

/** A reopened check in the same shape runInspection() returns. */
export function fromSnapshot(snapshot) {
  return {
    fileName: snapshot.fileName,
    documentType: snapshot.documentType,
    checkedAt: snapshot.checkedAt,
    doc: snapshot.doc,
    locations: snapshot.locations,
    results: snapshot.results,
    glossarySize: snapshot.glossarySize,
    ai: snapshot.ai,
    lookup: snapshot.lookup,
    unreadablePages: snapshot.unreadablePages,
    illegiblePages: snapshot.illegiblePages,
    fromHistory: true,
  }
}

export function useInspectionHistory() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('inspection_history')
      .select('id, created_at, file_name, document_type, term_count, issue_count, compliance, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) console.error('Inspection history could not be loaded:', error)
    setItems(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** Saves a finished check; returns the row id, or null (signed out / too big / error). */
  const save = useCallback(
    async (inspection, decisions, choices, locate) => {
      if (!user) return null
      const snapshot = toSnapshot(inspection, decisions, choices, locate)
      if (JSON.stringify(snapshot).length > MAX_SNAPSHOT_CHARS) return null
      const summary = summarize(inspection.results)
      const { data, error } = await supabase
        .from('inspection_history')
        .insert({
          user_id: user.id,
          file_name: inspection.fileName,
          document_type: inspection.documentType ?? null,
          term_count: summary.total,
          issue_count: summary.issues,
          compliance: summary.compliance,
          snapshot,
        })
        .select('id')
        .single()
      if (error) {
        console.error('Inspection could not be saved to history:', error)
        return null
      }
      refresh()
      return data.id
    },
    [user, refresh],
  )

  /** Records the user's decisions and that the corrected document was made. */
  const markFixed = useCallback(
    async (id, inspection, decisions, choices, locate) => {
      if (!user || !id) return
      const { error } = await supabase
        .from('inspection_history')
        .update({ status: 'fixed', snapshot: toSnapshot(inspection, decisions, choices, locate) })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) console.error('Inspection history could not be updated:', error)
      refresh()
    },
    [user, refresh],
  )

  const load = useCallback(
    async (id) => {
      if (!user) return null
      const { data, error } = await supabase.from('inspection_history').select('snapshot').eq('id', id).eq('user_id', user.id).single()
      if (error) {
        console.error('Inspection could not be opened:', error)
        return null
      }
      return data.snapshot
    },
    [user],
  )

  const remove = useCallback(
    async (id) => {
      if (!user) return
      const { error } = await supabase.from('inspection_history').delete().eq('id', id).eq('user_id', user.id)
      if (error) console.error('Inspection could not be deleted:', error)
      refresh()
    },
    [user, refresh],
  )

  return { signedIn: Boolean(user), items, loading, save, markFixed, load, remove, refresh }
}
