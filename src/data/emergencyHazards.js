import { Flame, Waves, Mountain, Activity, Wind, FlaskConical, Radiation, Factory } from 'lucide-react'

// Basic emergency-type nodes for the "Terminological map" — this is a
// closed, hand-picked list of high-level hazard categories (not sourced
// from the 241-term dictionary), used only as entry points into the map.
export const EMERGENCY_HAZARDS = [
  {
    id: 'fire',
    Icon: Flame,
    name: { kk: 'Өрт', ru: 'Пожар', en: 'Fire' },
  },
  {
    id: 'flood',
    Icon: Waves,
    name: { kk: 'Су тасқыны', ru: 'Наводнение', en: 'Flood' },
  },
  {
    id: 'landslide',
    Icon: Mountain,
    name: { kk: 'Жер көшкіні', ru: 'Оползень', en: 'Landslide' },
  },
  {
    id: 'earthquake',
    Icon: Activity,
    name: { kk: 'Жер сілкінісі', ru: 'Землетрясение', en: 'Earthquake' },
  },
  {
    id: 'wind',
    Icon: Wind,
    name: { kk: 'Қатты жел', ru: 'Сильный ветер', en: 'Strong wind' },
  },
  {
    id: 'chemical',
    Icon: FlaskConical,
    name: { kk: 'Химиялық авария', ru: 'Химическая авария', en: 'Chemical accident' },
  },
  {
    id: 'radiation',
    Icon: Radiation,
    name: { kk: 'Радиациялық авария', ru: 'Радиационная авария', en: 'Radiation accident' },
  },
  {
    id: 'industrial',
    Icon: Factory,
    name: { kk: 'Техногендік авария', ru: 'Техногенная авария', en: 'Industrial accident' },
  },
]
