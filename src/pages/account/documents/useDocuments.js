import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { requireAiConsent } from '../../../components/aiConsent.js'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { ReportError } from '../smartReport/reportClient.js'
import { fieldsOf } from './catalog/index.js'

// Storage of «Конструктор профессиональной документации»: work_documents,
// work_document_versions, document_favorites. Row level security limits
// every query to the signed-in user's rows; user_id is still set on insert.
// AI calls go to the smart-report Edge Function (actions doc_*), which the
// «Умный рабочий рапорт» already uses — one function, one rate limit.

// source: values.__source of an uploaded document (see src/pages/workspace/documentModel.js).
const LIST_COLUMNS = 'id, template_id, title, lang, status, issue_count, current_version, created_at, updated_at, checked_at, content_hash, checked_hash, source:values->__source'
const REPORT_COLUMNS = 'id, title, report_type, lang, status, step, current_version, created_at, updated_at'

// 'checked' needs migration 0055; draft and filling are both «Черновик».
export const DOC_STATUSES = ['draft', 'filling', 'review', 'issues', 'checked', 'ready', 'archive']

/** «Мои документы»: documents of the constructor and «Умный рабочий рапорт» drafts, newest first. */
export function useMyDocuments() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [docs, reports] = await Promise.all([
      supabase.from('work_documents').select(LIST_COLUMNS).order('updated_at', { ascending: false }),
      supabase.from('work_reports').select(REPORT_COLUMNS).order('updated_at', { ascending: false }),
    ])
    setError(Boolean(docs.error || reports.error))
    const list = [
      ...(docs.data ?? []).map((d) => ({ ...d, kind: 'document' })),
      // A smart report has two states; «final» is shown as «Готов».
      ...(reports.data ?? []).map((r) => ({
        ...r,
        kind: 'report',
        template_id: 'report',
        status: r.status === 'final' ? 'ready' : 'draft',
        issue_count: null,
      })),
    ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    setItems(list)
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const remove = useCallback(async (item) => {
    const table = item.kind === 'report' ? 'work_reports' : 'work_documents'
    const { error: deleteError } = await supabase.from(table).delete().eq('id', item.id)
    if (!deleteError) setItems((current) => current.filter((i) => i.id !== item.id))
    return !deleteError
  }, [])

  const setStatus = useCallback(async (item, status) => {
    const { error: updateError } = await supabase.from('work_documents').update({ status }).eq('id', item.id)
    if (!updateError) setItems((current) => current.map((i) => (i.id === item.id ? { ...i, status } : i)))
    return !updateError
  }, [])

  return { items, loading, error, refresh, remove, setStatus }
}

/** ⭐ document types of the user. */
export function useFavoriteTemplates() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState(() => new Set())

  useEffect(() => {
    if (!user) return
    supabase
      .from('document_favorites')
      .select('template_id')
      .then(({ data }) => setFavorites(new Set((data ?? []).map((r) => r.template_id))))
  }, [user])

  const toggle = useCallback(
    async (templateId) => {
      if (!user) return
      const on = !favorites.has(templateId)
      setFavorites((current) => {
        const next = new Set(current)
        if (on) next.add(templateId)
        else next.delete(templateId)
        return next
      })
      const { error } = on
        ? await supabase.from('document_favorites').insert({ user_id: user.id, template_id: templateId })
        : await supabase.from('document_favorites').delete().eq('template_id', templateId)
      if (error) {
        // Roll back the optimistic change.
        setFavorites((current) => {
          const next = new Set(current)
          if (on) next.delete(templateId)
          else next.add(templateId)
          return next
        })
      }
    },
    [user, favorites],
  )

  return { favorites, toggle }
}

export async function loadDocument(id) {
  const { data, error } = await supabase.from('work_documents').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

// Columns and the status added by migration 0055. Until it is applied the
// database rejects them; the save is then repeated without them, so a site
// deployed before the migration keeps saving documents.
const NEW_COLUMNS = ['content_hash', 'checked_hash']
let schemaHasNewColumns = true

export async function createDocument(userId, fields) {
  const insert = (row) => supabase.from('work_documents').insert(row).select('*').single()
  let row = { user_id: userId, ...(schemaHasNewColumns ? fields : withoutNewColumns(fields)) }
  let { data, error } = await insert(row)
  // Before migration 0055: without the new columns / with the old status.
  if (error && /content_hash|checked_hash|PGRST204|42703/.test(`${error.code} ${error.message}`)) {
    schemaHasNewColumns = false
    row = withoutNewColumns(row)
    ;({ data, error } = await insert(row))
  }
  if (error && row.status === 'checked' && /23514|status_check/.test(`${error.code} ${error.message}`)) ({ data, error } = await insert({ ...row, status: 'review' }))
  if (error) throw error
  return data
}


/** Saves; resolves only when the database confirmed the row (RLS: own rows only). */
/** The document changed on the server since the version the editor holds (another tab / device). */
export class ConflictError extends Error {
  constructor() {
    super('conflict')
    this.code = 'conflict'
  }
}

/**
 * Updates a document. With `expectedUpdatedAt` the row is written only if it
 * was not changed since then (optimistic lock on updated_at, which the
 * work_documents_touch trigger moves on every update); otherwise
 * ConflictError and nothing is written. Returns { updated_at }.
 */
export async function updateDocument(id, fields, expectedUpdatedAt = null) {
  const run = (payload) => {
    let q = supabase.from('work_documents').update(payload).eq('id', id)
    if (expectedUpdatedAt) q = q.eq('updated_at', expectedUpdatedAt)
    return q.select('updated_at').maybeSingle()
  }
  let payload = schemaHasNewColumns ? fields : withoutNewColumns(fields)
  let { data, error } = await run(payload)
  if (error && schemaHasNewColumns && NEW_COLUMNS.some((c) => c in fields) && /content_hash|checked_hash|PGRST204|42703/.test(`${error.code} ${error.message}`)) {
    schemaHasNewColumns = false
    payload = withoutNewColumns(fields)
    ;({ data, error } = await run(payload))
  }
  if (error && payload.status === 'checked' && /23514|status_check/.test(`${error.code} ${error.message}`)) {
    ;({ data, error } = await run({ ...payload, status: 'review' }))
  }
  if (error) throw error
  // No row: changed since `expectedUpdatedAt` (RLS hides other users' rows the same way, but the editor only opens own documents).
  if (!data) throw expectedUpdatedAt ? new ConflictError() : Object.assign(new Error('not_found'), { code: 'not_found' })
  return data
}

function withoutNewColumns(fields) {
  const out = { ...fields }
  for (const c of NEW_COLUMNS) delete out[c]
  return out
}

/**
 * «Создать копию»: same type and requisites; dates, times, facts and
 * results (fields marked `volatile`) are NOT carried over — they belong to
 * the old event and would silently become wrong.
 */
export async function duplicateDocument(userId, source, template, copySuffix) {
  const values = { ...(source.values ?? {}) }
  for (const field of fieldsOf(template)) if (field.volatile) delete values[field.key]
  // Origins of transferred values belong to the original's links, not to the copy.
  delete values.__provenance
  return createDocument(userId, {
    template_id: source.template_id,
    lang: source.lang,
    title: `${source.title || ''} ${copySuffix}`.trim(),
    status: 'draft',
    values,
    copied_from: source.id,
  })
}

/** Saves the values as the next version of the given kind; returns the new number. */
/**
 * Keeps a version. `update` writes the new version number into the
 * document — the editor passes its own queued writer so the version does
 * not race with the autosave.
 */
export async function saveDocVersion(doc, values, kind, note = null, update = (fields) => updateDocument(doc.id, fields)) {
  const version = (doc.current_version ?? 0) + 1
  const { error } = await supabase.from('work_document_versions').insert({
    document_id: doc.id,
    user_id: doc.user_id,
    version,
    kind,
    note,
    values,
  })
  if (error) throw error
  await update({ current_version: version })
  return version
}

export async function loadDocVersions(documentId) {
  const { data, error } = await supabase
    .from('work_document_versions')
    .select('id, version, kind, note, values, created_at')
    .eq('document_id', documentId)
    .order('version', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Profile values the user entered themselves (for «Заполнить данными профиля»). */
export async function saveProfileData(userId, fields) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId)
  if (error) throw error
}

// ---- AI (smart-report Edge Function) ---------------------------------------------

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-report`

async function call(payload) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ReportError('unauthorized')
  await requireAiConsent().catch(() => {
    throw new ReportError('ai_declined')
  })
  let res
  try {
    res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ReportError('network')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ReportError(body?.error || 'internal_error', { retryAfterSeconds: body?.retryAfterSeconds })
  return body
}

export const suggestDocumentType = (query, catalog, lang) => call({ action: 'doc_suggest', lang, query, catalog })
export const fillFromText = ({ text, fields, documentTitle, lang, today }) => call({ action: 'doc_fill', lang, text, fields, documentTitle, today })
/** Draft of the narrative fields from the confirmed values (+ the user's description). */
export const composeDocumentText = ({ fields, brief, documentTitle, lang }) => call({ action: 'doc_compose', lang, documentTitle, brief, fields })
export const checkDocumentText = ({ blocks, documentTitle, lang }) => call({ action: 'doc_check', lang, blocks, documentTitle })
export const readDocumentPhoto = ({ mediaType, data }) => call({ action: 'doc_photo', mediaType, data })
