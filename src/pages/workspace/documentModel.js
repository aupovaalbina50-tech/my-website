import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { FREE_TEXT_ID, templateById } from '../account/documents/catalog/index.js'
import { documentText, renderDocument } from '../account/documents/render.js'
import { createDocument, saveDocVersion, updateDocument } from '../account/documents/useDocuments.js'
import { useMyDocuments } from '../account/documents/useDocuments.js'
import { summarize } from '../shared/docInspector/expertise.js'
import { CHECK_VERSION, counts, expertiseState } from './expertise/model.js'
import { termItemFromResult } from './expertise/runExpertise.js'
import { compactItems, sourceSummary } from './passport/passportModel.js'

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

import { contentHash } from './documentHash.js'

export { contentHash }

/** The last expertise checked another text than the current one (needs migration 0055). */
export const checkOutdated = (item) => Boolean(item.checked_at && item.checked_hash && item.content_hash && item.checked_hash !== item.content_hash)

/** Plain text of a document as it is now — what the expertise reads. */
export function documentPlainText(doc) {
  if (doc.template_id === FREE_TEXT_ID) return String(doc.values?.body ?? '').trim()
  const template = templateById(doc.template_id)
  if (!template) return ''
  return documentText(renderDocument(template, doc.values ?? {}, doc.lang ?? 'ru'), doc.lang ?? 'ru')
}

/**
 * The inspector's result in the editor's format: the pages become one text
 * (body) and every finding keeps its exact range in it — or none, when the
 * text there is not exactly the finding.
 */
export function inspectionAsCheck(inspection) {
  const pageStart = new Map()
  const parts = []
  let length = 0
  for (const p of inspection.doc.pages) {
    const trimmed = p.text.trim()
    if (!trimmed) continue
    if (parts.length) length += 2
    const leading = p.text.length - p.text.trimStart().length
    pageStart.set(p.number, { at: length - leading, from: leading, to: leading + trimmed.length })
    parts.push(trimmed)
    length += trimmed.length
  }
  const text = parts.join('\n\n')
  const block = { key: 'body', label: '', factual: false }
  let termsFound = 0
  const items = []
  for (const r of inspection.results) {
    if (r.status === 'ok') {
      termsFound++
      continue
    }
    const page = pageStart.get(r.page)
    const inside = page && r.start >= page.from && r.end <= page.to
    const start = inside ? page.at + r.start : null
    const exact = start != null && text.slice(start, start + r.text.length) === r.text
    items.push(termItemFromResult({ ...r, external: r.external ? { ...r.external, retrievedAt: inspection.checkedAt } : null }, block, exact ? start : null))
  }
  const ai = inspection.ai ?? {}
  const lookup = inspection.lookup ?? {}
  return {
    text,
    check: {
      v: CHECK_VERSION,
      at: inspection.checkedAt,
      docLang: null,
      parts: {
        structure: 'skipped',
        terminology: ai.failedChunks ? 'partial' : 'ok',
        language: 'skipped',
        lookup: !lookup.searched ? 'skipped' : lookup.failed ? (lookup.failed >= lookup.searched ? 'failed' : 'partial') : 'ok',
      },
      errors: { terminology: ai.failedChunks ? ai.error ?? 'ai_unavailable' : null, language: null, lookup: lookup.failed ? 'lookup_failed' : null },
      snapshots: { body: text },
      items,
      changes: [],
      termsFound,
      glossarySize: inspection.glossarySize ?? null,
      source: 'inspector',
    },
  }
}

// «Требует исправлений» / «Проверен» (not an approval); «На проверке» is only the running check.
const statusAfterExpertise = (inspection) => (summarize(inspection.results).issues > 0 ? 'issues' : 'checked')

/**
 * An uploaded file becomes a document of the user: the extracted text is the
 * current text and, as version 1 «original», the source that can be restored.
 */
export async function createUploadedDocument(userId, inspection, lang) {
  const { doc } = inspection
  const { text, check } = inspectionAsCheck(inspection)
  const values = {
    body: text,
    [SOURCE_KEY]: {
      origin: 'upload',
      fileName: inspection.fileName,
      fileKind: doc.sourceKind ?? doc.kind,
      ocrPages: doc.pages.filter((p) => p.source === 'ocr').length,
      // Quality of the recognition, for the route of the document.
      unreadablePages: inspection.unreadablePages ?? 0,
      illegiblePages: inspection.illegiblePages ?? 0,
    },
  }
  const row = await createDocument(userId, {
    template_id: FREE_TEXT_ID,
    lang: lang === 'kk' ? 'kk' : 'ru',
    title: inspection.fileName.replace(/\.[^.]+$/, '') || inspection.fileName,
    status: statusAfterExpertise(inspection),
    values,
    // The text just checked is the text stored: the check is current.
    checked_at: inspection.checkedAt,
    checked_hash: contentHash(values),
    content_hash: contentHash(values),
    // The remarks open in the editor with the document; offsets point into `body`.
    issues: check,
    issue_count: check.items.length,
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
export function markDocumentChecked(documentId, inspection, values) {
  const hash = contentHash(values)
  return updateDocument(documentId, { status: statusAfterExpertise(inspection), checked_at: inspection.checkedAt, checked_hash: hash, content_hash: hash })
}

// kind: 'editor' for an expertise run inside the document editor (its remarks live
// with the document), otherwise a check of the inspector with a full snapshot.
const HISTORY_COLUMNS = 'id, created_at, file_name, issue_count, term_count, status, document_id:snapshot->>documentId, kind:snapshot->>kind'

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
export function useWorkspaceActivity({ historyLimit = 10 } = {}) {
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
      .limit(historyLimit)
    setHistoryError(Boolean(error))
    setHistory(data ?? [])
    setHistoryLoading(false)
  }, [user, historyLimit])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const { refresh } = docs
  const retry = useCallback(() => {
    refresh()
    loadHistory()
  }, [refresh, loadHistory])

  return {
    signedIn: Boolean(user),
    documents: docs.items,
    documentsLoading: docs.loading,
    documentsError: docs.error,
    history,
    historyLoading,
    historyError,
    retry,
  }
}

/** Where a document row of «Мои документы» opens. */
export const documentPath = (item) => (item.kind === 'report' ? `/account/smart-report/${item.id}` : `/account/documents/${item.id}`)

/** Where an expertise of the history opens: its document (editor runs), or the saved result. */
export const expertisePath = (row) =>
  row.kind === 'editor' && row.document_id ? `/account/documents/${row.document_id}` : `/account/workspace/check?history=${row.id}`

/**
 * An expertise run in the editor goes to the history as a summary: the
 * remarks themselves are stored with the document (work_documents.issues).
 */
export async function saveEditorExpertise(userId, doc, title, check, values) {
  const c = counts(check, values)
  const { data, error } = await supabase
    .from('inspection_history')
    .insert({
      user_id: userId,
      file_name: title,
      term_count: check.termsFound ?? 0,
      issue_count: c.all,
      compliance: null,
      // For the passport: which version / text was checked, what failed, which sources were used, the remarks in short.
      snapshot: {
        kind: 'editor',
        // full / changed (only the changed fields re-read) / final (the final check of the route)
        mode: check.mode ?? 'full',
        documentId: doc.id,
        at: check.at,
        state: expertiseState(check, values),
        counts: c,
        parts: check.parts,
        errors: check.errors ?? {},
        version: check.version ?? null,
        hash: contentHash(values),
        sources: sourceSummary(check, templateById(doc.template_id)),
        items: compactItems(check),
      },
    })
    .select(HISTORY_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export const CHECK_DOCUMENT_PATH = (documentId) => `/account/workspace/check?document=${documentId}`

/** Full text of every document of the user, for the search (RLS: own rows only). */
export async function loadContents() {
  const [docs, reports] = await Promise.all([
    supabase.from('work_documents').select('id, template_id, lang, values'),
    supabase.from('work_reports').select('id, source_text, content'),
  ])
  const map = new Map()
  for (const d of docs.data ?? []) map.set(`document-${d.id}`, documentPlainText(d).toLowerCase())
  for (const r of reports.data ?? []) map.set(`report-${r.id}`, `${r.source_text ?? ''} ${Object.values(r.content ?? {}).join(' ')}`.toLowerCase())
  return { map, failed: Boolean(docs.error || reports.error) }
}
