import { supabase } from '../../../supabaseClient'

// Storage of «Рапортты құрастыру» (tables work_reports and
// work_report_versions). Row level security limits every query to the
// signed-in user's own rows; user_id is still set explicitly on insert.
// The list of reports is part of «Мои документы» (documents/useDocuments.js).

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
