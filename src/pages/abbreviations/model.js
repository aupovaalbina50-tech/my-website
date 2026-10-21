// «Аббревиатуры и сокращения»: data, alphabets, search.
//
// Rows come from the Supabase table `abbreviations` (migration 0062). Until
// that table exists (or if it can't be read), the page shows the starter set
// bundled with the site (src/data/abbreviations.json — the same file the
// SQL seed is generated from), so the catalog is never empty.

import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import bundled from '../../data/abbreviations.json'

export const ALPHABETS = {
  kk: 'А Ә Б В Г Ғ Д Е Ё Ж З И Й К Қ Л М Н Ң О Ө П Р С Т У Ұ Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы І Ь Э Ю Я'.split(' '),
  ru: 'А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я'.split(' '),
}

export const CATEGORIES = ['emergencies', 'civil_defense', 'fire_safety', 'rescue_ops', 'industrial_safety', 'disaster_medicine', 'evacuation', 'alerting_comms', 'coordination']
export const STATUSES = ['confirmed', 'base', 'needs_review']

const COLUMNS =
  'id, lang, abbr, full_form, equivalent_full, equivalent_en, category, explanation, example, ambiguity_note, concept, status, source_title, source_url, official_title, official_url, checked_at'

const withIds = (rows) => rows.map((r, i) => ({ id: r.id ?? `b${i}`, ...r }))

/** All published rows; `origin` says where they came from. */
export function useAbbreviations() {
  const [state, setState] = useState({ loading: true, rows: [], origin: null })
  useEffect(() => {
    let alive = true
    supabase
      .from('abbreviations')
      .select(COLUMNS)
      .then(({ data, error }) => {
        if (!alive) return
        if (error || !data?.length) setState({ loading: false, rows: withIds(bundled), origin: 'bundled' })
        else setState({ loading: false, rows: data, origin: 'database' })
      })
    return () => {
      alive = false
    }
  }, [])
  return state
}

/** Sort key by the language's own alphabet (Ә after А, Қ after К, …). */
function sortKey(text, lang) {
  const order = ALPHABETS[lang]
  return [...text.toUpperCase()].map((c) => {
    const i = order.indexOf(c)
    return i === -1 ? `~${c}` : String(i).padStart(2, '0')
  }).join('')
}

export function compareAbbr(a, b) {
  const ka = sortKey(a.abbr, a.lang)
  const kb = sortKey(b.abbr, b.lang)
  return ka < kb ? -1 : ka > kb ? 1 : a.full_form.localeCompare(b.full_form, a.lang)
}

/** The letter an abbreviation is listed under. */
export function firstLetter(abbr) {
  return (abbr.match(/\p{L}/u)?.[0] ?? '').toUpperCase()
}

const squeeze = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[\s.·/()-]+/g, '')
const initials = (full) =>
  full
    .toLowerCase()
    .replace(/[«»"]/g, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')

/**
 * Does the row match the query? By the abbreviation (any part, spaces and
 * dots ignored), by the full form, or by the first letters of the full
 * form's words («тж» finds «Төтенше жағдай»).
 */
export function matches(row, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const sq = squeeze(q)
  return squeeze(row.abbr).includes(sq) || row.full_form.toLowerCase().includes(q) || (sq.length >= 2 && initials(row.full_form).startsWith(sq))
}
