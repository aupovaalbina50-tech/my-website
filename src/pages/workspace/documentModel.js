import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { FREE_TEXT_ID, templateById } from '../account/documents/catalog/index.js'
import { documentText, renderDocument } from '../account/documents/render.js'
import { createDocument, saveDocVersion, updateDocument } from '../account/documents/useDocuments.js'
import { useMyDocuments } from '../account/documents/useDocuments.js'
import { summarize } from '../shared/docInspector/expertise.js'

// One document model for «Работа с документами», built on the existing
// tables — no new ones (RLS on both: a user reads and changes own rows only):
//
//   work_documents            the document: id, user_id (owner), title,
//                             template_id (type), lang, status, created_at,
//                             updated_at, values (the CURRENT text / fields),
//                             issues (result of the constructor's own check)
//   work_document_versions    the history of the text: kind 'original' is the
//                             source text (saved before the first change of
//                             a check or right after an upload), then
//                             'checked' / 'user' / 'final' snapshots
//   inspection_history        every terminology expertise with its full
//                             result; snapshot.documentId links it to the
//                             document it was run on
//
// Where a document came from is kept in values.__source (not a template
// field, never rendered): { origin: 'upload', fileName, fileKind, ocrPages }.
// A document without it was created in the constructor.
//
// Status (work_documents.status) is the constructor's own set: draft, filling,
// review («На проверке» — checked, nothing open), issues, ready, archive.
// The expertise runs in the browser while the page is open and is not a
// stored state; a failed run leaves the status as it was.

export const SOURCE_KEY = '__source'

/** 'upload' | 'builder', and the file name of an uploaded document. */
export function documentSource(values) {
  const source = values?.[SOURCE_KEY]
  return source?.origin === 'upload' ? source : { origin: 'builder' }
}

/** Plain text of a document as it is now — what the expertise reads. */
export function documentPlainText(doc) {
  if (doc.template_id === FREE_TEXT_ID) return String(doc.values?.body ?? '').trim()
  const template = templateById(doc.template_id)
  if (!template) return ''
  return documentText(renderDocument(template, doc.values ?? {}, doc.lang ?? 'ru'), doc.lang ?? 'ru')
}

const statusAfterExpertise = (inspection) => (summarize(inspection.results).issues > 0 ? 'issues' : 'review')

/**
 * An uploaded file becomes a document of the user: the extracted text is the
 * current text and, as version 1 «original», the source that can be restored.
 */
export async function createUploadedDocument(userId, inspection, lang) {
  const { doc } = inspection
  const text = doc.pages
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join('\n\n')
  const values = {
    body: text,
    [SOURCE_KEY]: {
      origin: 'upload',
      fileName: inspection.fileName,
      fileKind: doc.sourceKind ?? doc.kind,
      ocrPages: doc.pages.filter((p) => p.source === 'ocr').length,
    },
  }
  const row = await createDocument(userId, {
    template_id: FREE_TEXT_ID,
    lang: lang === 'kk' ? 'kk' : 'ru',
    title: inspection.fileName.replace(/\.[^.]+$/, '') || inspection.fileName,
    status: statusAfterExpertise(inspection),
    values,
  })
  try {
    const version = await saveDocVersion(row, values, 'original')
    row.current_version = version
  } catch (err) {
    // The document exists; only the separate copy of the source is missing.
    console.error('Original version of the uploaded document was not saved:', err)
  }
  return row
}

/** After an expertise of an existing document: its status follows the result. */
export function markDocumentChecked(documentId, inspection) {
  return updateDocument(documentId, { status: statusAfterExpertise(inspection) })
}

const HISTORY_COLUMNS = 'id, created_at, file_name, issue_count, term_count, status, document_id:snapshot->>documentId'

/** Expertises of one document, newest first. */
export async function loadDocumentExpertises(documentId, limit = 5) {
  const { data, error } = await supabase
    .from('inspection_history')
    .select(HISTORY_COLUMNS)
    .eq('snapshot->>documentId', documentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/** Everything the start screen shows: the user's documents and their expertise history. */
export function useWorkspaceActivity() {
  const { user } = useAuth()
  const docs = useMyDocuments()
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)
    const { data, error } = await supabase
      .from('inspection_history')
      .select(HISTORY_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistoryError(Boolean(error))
    setHistory(data ?? [])
    setHistoryLoading(false)
  }, [user])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return {
    signedIn: Boolean(user),
    documents: docs.items,
    documentsLoading: docs.loading,
    documentsError: docs.error,
    history,
    historyLoading,
    historyError,
  }
}

/** Where a document row of «Мои документы» opens. */
export const documentPath = (item) => (item.kind === 'report' ? `/account/smart-report/${item.id}` : `/account/documents/${item.id}`)

/** Where an expertise of the history opens: its document, or the saved result. */
export const expertisePath = (row) => `/account/workspace/check?history=${row.id}`

export const CHECK_DOCUMENT_PATH = (documentId) => `/account/workspace/check?document=${documentId}`
