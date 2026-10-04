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
        issues.push({ from: prev.key, to: point.key, fromTime: prev.value, toTime: value, gapMin })
      }
    }
    prev = { key: point.key, minutes, value }
  }
  return issues
}

export const PLACEHOLDERS = ['[не указано]', '[көрсетілмеген]']

export function hasPlaceholder(text) {
  return PLACEHOLDERS.some((p) => text?.includes(p))
}
