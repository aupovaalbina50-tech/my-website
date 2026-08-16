import { Siren, Shield, Flame, LifeBuoy, Factory, Cross, DoorOpen, Radio, Settings2, Compass } from 'lucide-react'

export const CATEGORY_ICONS = {
  emergencies: '🚨',
  civil_defense: '🛡️',
  fire_safety: '🔥',
  rescue_ops: '⛑️',
  industrial_safety: '🏭',
  disaster_medicine: '⚕️',
  evacuation: '🚪',
  alerting_comms: '📡',
  coordination: '🧭',
}

export const DEFAULT_TERM_ICON = '📘'

export function categoryIcon(key) {
  return CATEGORY_ICONS[key] || DEFAULT_TERM_ICON
}

/* Lucide equivalents of CATEGORY_ICONS, for UI that needs a crisp vector
   icon (e.g. the category card grid) instead of an emoji glyph. */
export const CATEGORY_LUCIDE_ICONS = {
  emergencies: Siren,
  civil_defense: Shield,
  fire_safety: Flame,
  rescue_ops: LifeBuoy,
  industrial_safety: Factory,
  disaster_medicine: Cross,
  evacuation: DoorOpen,
  alerting_comms: Radio,
  coordination: Settings2,
}

export const DEFAULT_CATEGORY_ICON = Compass

export function categoryLucideIcon(key) {
  return CATEGORY_LUCIDE_ICONS[key] || DEFAULT_CATEGORY_ICON
}
