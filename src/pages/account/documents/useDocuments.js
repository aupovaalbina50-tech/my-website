import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { ReportError } from '../smartReport/reportClient.js'
import { fieldsOf } from './catalog/index.js'

// Storage of «Конструктор профессиональной документации»: work_documents,
// work_document_versions, document_favorites. Row level security limits
// every query to the signed-in user's rows; user_id is still set on insert.
// AI calls go to the smart-report Edge Function (actions doc_*), which the
// «Умный рабочий рапорт» already uses — one function, one rate limit.

const LIST_COLUMNS = 'id, template_id, title, lang, status, issue_count, current_version, created_at, updated_at, checked_at'
const REPORT_COLUMNS = 'id, title, report_type, lang, status, step, current_version, created_at, updated_at'

export const DOC_STATUSES = ['draft', 'filling', 'review', 'issues', 'ready', 'archive']

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

export async function createDocument(userId, fields) {
  const { data, error } = await supabase
    .from('work_documents')
    .insert({ user_id: userId, ...fields })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateDocument(id, fields) {
  const { data, error } = await supabase.from('work_documents').update(fields).eq('id', id).select('updated_at').single()
  if (error) throw error
  return data
}

/**
 * «Создать копию»: same type and requisites; dates, times, facts and
 * results (fields marked `volatile`) are NOT carried over — they belong to
 * the old event and would silently become wrong.
 */
export async function duplicateDocument(userId, source, template, copySuffix) {
  const values = { ...(source.values ?? {}) }
  for (const field of fieldsOf(template)) if (field.volatile) delete values[field.key]
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
export async function saveDocVersion(doc, values, kind, note = null) {
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
  await updateDocument(doc.id, { current_version: version })
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
export const checkDocumentText = ({ blocks, documentTitle, lang }) => call({ action: 'doc_check', lang, blocks, documentTitle })
export const readDocumentPhoto = ({ mediaType, data }) => call({ action: 'doc_photo', mediaType, data })
