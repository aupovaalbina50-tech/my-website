import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../../auth/AuthContext.jsx'

// Storage of «Рапортты құрастыру» (tables work_reports and
// work_report_versions). Row level security limits every query to the
// signed-in user's own rows; user_id is still set explicitly on insert.

const LIST_COLUMNS = 'id, title, report_type, lang, status, step, current_version, created_at, updated_at'

/** «Мои рапорты»: the user's reports, most recently changed first. */
export function useWorkReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('work_reports')
      .select(LIST_COLUMNS)
      .order('updated_at', { ascending: false })
    setError(Boolean(fetchError))
    setReports(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const remove = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('work_reports').delete().eq('id', id)
    if (!deleteError) setReports((current) => current.filter((r) => r.id !== id))
    return !deleteError
  }, [])

  return { reports, loading, error, refresh, remove }
}

export async function loadReport(id) {
  const { data, error } = await supabase.from('work_reports').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createReport(userId, fields) {
  const { data, error } = await supabase
    .from('work_reports')
    .insert({ user_id: userId, ...fields })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateReport(id, fields) {
  const { data, error } = await supabase.from('work_reports').update(fields).eq('id', id).select('updated_at').single()
  if (error) throw error
  return data
}

/** Saves the current state as the next version; returns the new number. */
export async function saveVersion(report, note = null) {
  const version = (report.current_version ?? 0) + 1
  const { error } = await supabase.from('work_report_versions').insert({
    report_id: report.id,
    user_id: report.user_id,
    version,
    note,
    facts: report.facts,
    content: report.content,
  })
  if (error) throw error
  await updateReport(report.id, { current_version: version })
  return version
}

export async function loadVersions(reportId) {
  const { data, error } = await supabase
    .from('work_report_versions')
    .select('id, version, note, created_at, facts, content')
    .eq('report_id', reportId)
    .order('version', { ascending: false })
  if (error) throw error
  return data ?? []
}
