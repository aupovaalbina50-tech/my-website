export const CATEGORY_ICONS = {
  emergencies: '🚨',
  civil_defense: '🛡️',
  fire_safety: '🔥',
  rescue_ops: '⛑️',
  industrial_safety: '🏭',
  disaster_medicine: '⚕️',
  evacuation: '🚪',
  alerting_comms: '📡',
  state_reserve: '🏛️',
  coordination: '🧭',
}

export const DEFAULT_TERM_ICON = '📘'

export function categoryIcon(key) {
  return CATEGORY_ICONS[key] || DEFAULT_TERM_ICON
}
