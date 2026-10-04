import { incidentReport } from './incidentReport.js'

// Document types of «Рапортты құрастыру». A new type or departmental
// template is registered here; work_reports.report_type stores the key.
export const TEMPLATES = {
  [incidentReport.type]: incidentReport,
}

export const DEFAULT_TEMPLATE = incidentReport.type

export function templateFor(type) {
  return TEMPLATES[type] ?? TEMPLATES[DEFAULT_TEMPLATE]
}

/** Required fields of step 2 that are still empty. */
export function missingFacts(template, facts) {
  return template.facts.filter((f) => f.required && !facts?.[f.key]?.value?.trim()).map((f) => f.key)
}

/** Minutes since midnight from «22:00», «в 9.05», «22-40»; null if no time. */
function toMinutes(value) {
  const m = String(value ?? '').match(/(\d{1,2})\s*[:.-]\s*(\d{2})/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

/**
 * Chronology check: each filled time must follow the previous filled one
 * within the template's `maxGapMin` (passing midnight is allowed). Returns
 * [{ from, to, fromTime, toTime, gapMin }] for every suspicious pair.
 */
export function timelineIssues(template, facts) {
  const issues = []
  let prev = null
  for (const point of template.timeline ?? []) {
    const value = facts?.[point.key]?.value
    const minutes = toMinutes(value)
    if (minutes === null) continue
    if (prev) {
      const gapMin = (minutes - prev.minutes + 24 * 60) % (24 * 60)
      if (point.maxGapMin && gapMin > point.maxGapMin) {
        // More than half a day «later» almost always means «earlier the same day».
        const order = gapMin > 12 * 60 && minutes < prev.minutes
        issues.push({ from: prev.key, to: point.key, fromTime: prev.value, toTime: value, gapMin, order })
      }
    }
    prev = { key: point.key, minutes, value }
  }
  return issues
}

function toDate(value) {
  const m = String(value ?? '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** The incident cannot happen after the report is written. */
export function dateIssue(incidentDate, reportDate) {
  const incident = toDate(incidentDate)
  const report = toDate(reportDate)
  if (!incident || !report || incident <= report) return null
  return { incidentDate, reportDate }
}

/** Fields the model filled from context (not stated outright) and the user has not confirmed. */
export function inferredFacts(template, facts) {
  return template.facts.filter((f) => facts?.[f.key]?.inferred && facts[f.key].value?.trim()).map((f) => f.key)
}

export const PLACEHOLDERS = ['[не указано]', '[көрсетілмеген]']

export function hasPlaceholder(text) {
  return PLACEHOLDERS.some((p) => text?.includes(p))
}
