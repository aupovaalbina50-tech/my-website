import { HAZARD_TERM_LINKS } from '../data/hazardTermLinks'
import { HAZARD_TERM_GROUPS } from '../data/hazardTermGroups'

const MAX_MAP_TERMS = 10

function normalize(value) {
  return (value || '').toLowerCase()
}

// All terms linked to a hazard (see HAZARD_TERM_LINKS), sorted
// alphabetically by kk. Uncapped — callers decide how much to show. Also
// used to build the map's search index (see TermMapPage.jsx).
export function matchHazardTerms(hazardId, terms) {
  const link = HAZARD_TERM_LINKS[hazardId]
  if (!link || !terms?.length) return []

  const matches = terms.filter((term) => {
    if (link.categories.includes(term.category)) return true
    if (!link.keywords.length) return false
    const ru = normalize(term.ru)
    const kk = normalize(term.kk)
    return link.keywords.some((keyword) => ru.includes(keyword) || kk.includes(keyword))
  })

  matches.sort((a, b) => (a.kk || '').localeCompare(b.kk || '', 'kk'))
  return matches
}

// Flat, capped term list for a hazard ("all terms" view). Returns the real
// total alongside the capped slice so the UI can say "showing 10 of 149".
// `pinnedId` (e.g. a term the user just jumped to via search) is force-
// included even if it would normally fall outside the cap, so a search
// result is always a real, visible node on the ring.
export function getHazardTerms(hazardId, terms, limit = MAX_MAP_TERMS, pinnedId = null) {
  const matches = matchHazardTerms(hazardId, terms)
  return { items: withPinned(matches.slice(0, limit), matches, pinnedId), total: matches.length }
}

// Splices a pinned id into an already-capped slice if it's missing,
// pulling the full value from `matches`. Exported so callers capping a
// specific group's items (see TermMapPage.jsx) can apply the same rule.
export function withPinned(items, matches, pinnedId) {
  if (!pinnedId || items.some((item) => item.id === pinnedId)) return items
  const pinned = matches.find((item) => item.id === pinnedId)
  return pinned ? [...items, pinned] : items
}

// Every hazard id a single term matches (see HAZARD_TERM_LINKS), in
// EMERGENCY_HAZARDS order. A term with a category/keyword combination that
// legitimately fits more than one hazard (e.g. an industrial_safety term
// that's also about radiation) comes back with every real match — nothing
// invented, just the same rule matchHazardTerms() already applies per
// hazard, run once per term instead. Used for the term panel's "related
// hazards" section and the map's cross-hazard node badge.
export function getTermHazards(term, hazardIds) {
  if (!term) return []
  const ru = normalize(term.ru)
  const kk = normalize(term.kk)
  return hazardIds.filter((hazardId) => {
    const link = HAZARD_TERM_LINKS[hazardId]
    if (!link) return false
    if (link.categories.includes(term.category)) return true
    return link.keywords.some((keyword) => ru.includes(keyword) || kk.includes(keyword))
  })
}

// Buckets a hazard's matched terms into its thematic groups (see
// HAZARD_TERM_GROUPS), in priority order — a term lands in the first
// group whose keywords match. Terms matching no group come back as
// `ungrouped` rather than being forced into one, so the caller can decide
// how to label them (or skip them for hazards with too few terms to
// group meaningfully).
export function getHazardGroups(hazardId, terms) {
  const matches = matchHazardTerms(hazardId, terms)
  const groupDefs = HAZARD_TERM_GROUPS[hazardId] || []

  const buckets = groupDefs.map((group) => ({ ...group, items: [] }))
  const ungrouped = []

  for (const term of matches) {
    const ru = normalize(term.ru)
    const kk = normalize(term.kk)
    const bucket = buckets.find((group) => group.keywords.some((kw) => ru.includes(kw) || kk.includes(kw)))
    if (bucket) bucket.items.push(term)
    else ungrouped.push(term)
  }

  const groups = buckets
    .filter((group) => group.items.length > 0)
    .map(({ id, label, items }) => ({ id, label, items, count: items.length }))

  return { groups, ungrouped, total: matches.length }
}
