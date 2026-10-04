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

export const PLACEHOLDERS = ['[не указано]', '[көрсетілмеген]']

export function hasPlaceholder(text) {
  return PLACEHOLDERS.some((p) => text?.includes(p))
}
