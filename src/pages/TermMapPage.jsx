import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, LayoutGrid, Link2, Search, Siren, Waypoints, X, Layers } from 'lucide-react'
import SiteSectionLayout from '../components/SiteSectionLayout.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { EMERGENCY_HAZARDS } from '../data/emergencyHazards'
import { CATEGORIES } from '../i18n/translations'
import { useAllTerms } from './shared/useAllTerms.js'
import {
  getHazardTerms,
  getHazardGroups,
  matchHazardTerms,
  getTermHazards,
  withPinned,
} from '../utils/hazardTerms.js'
import { toSentenceCase } from '../utils/textCase.js'
import TermMapPanel from './shared/TermMapPanel.jsx'

const MAX_MAP_TERMS = 10
const MAX_RELATED_TERMS = 6
const MAX_SEARCH_RESULTS = 8
const MAX_EXPLORE_INITIAL = 6
const MAX_EXPLORE_EXPANDED = 12
const HAZARD_IDS = EMERGENCY_HAZARDS.map((hazard) => hazard.id)

// Evenly spaces `count` nodes on a circle around the center (percentage
// coordinates in a 0-100 square), starting at the top and going clockwise.
// Used for every ring on the map — the fixed 8-hazard overview and a
// hazard's (filtered) term ring — so every level reads as one consistent
// visual language regardless of how many nodes it holds.
function getRingPositions(count, radius = 37) {
  if (count <= 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = ((-90 + (360 / count) * i) * Math.PI) / 180
    return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) }
  })
}

const HAZARD_POSITIONS = getRingPositions(EMERGENCY_HAZARDS.length)
const CENTER = { x: 50, y: 50 }

// Buckets a hazard's matched terms into display groups (real thematic
// groups + an "Other" bucket for anything unmatched) — these double as
// the hazard's filter chips. Same rule used for the currently open hazard
// and for jumping straight to a search result in a hazard/group the user
// isn't currently viewing.
function buildDisplayGroups(hazardId, allTerms, t) {
  if (!hazardId) return []
  const { groups, ungrouped } = getHazardGroups(hazardId, allTerms)
  if (groups.length < 2) return []
  const list = [...groups]
  if (ungrouped.length > 0) {
    const otherLabel = { kk: t.termMap.otherGroup, ru: t.termMap.otherGroup, en: t.termMap.otherGroup }
    list.push({ id: 'other', label: otherLabel, items: ungrouped, count: ungrouped.length })
  }
  return list
}

// Matches on word start (not mid-word), same rule the site's other live
// search boxes use (see DashboardTermSearch.jsx / HomePage.jsx) — "пож"
// matches "Пожар" and "Пожарная безопасность" but not "непожарный".
function startsWithQuery(text, query) {
  return (text || '')
    .toLowerCase()
    .split(/[\s,;()/-]+/)
    .some((word) => word.startsWith(query))
}

function HighlightedText({ text, query }) {
  if (!query) return text
  const wordRegex = /[^\s,;()/-]+/g
  const parts = []
  let lastIndex = 0
  let match
  while ((match = wordRegex.exec(text))) {
    const word = match[0]
    if (word.toLowerCase().startsWith(query)) {
      const start = match.index
      const end = start + query.length
      if (start > lastIndex) parts.push(text.slice(lastIndex, start))
      parts.push(<mark key={start}>{text.slice(start, end)}</mark>)
      lastIndex = end
    }
  }
  parts.push(text.slice(lastIndex))
  return parts
}

function TermMapPage() {
  const { lang, t } = useLanguage()
  const { terms, loading: termsLoading, error: termsError } = useAllTerms()
  const [selectedHazardId, setSelectedHazardId] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null) // null = "All" filter
  const [viewDisplay, setViewDisplay] = useState('map') // 'map' | 'list'
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedTermId, setSelectedTermId] = useState(null)
  const [showConnections, setShowConnections] = useState(false)
  const [exploreExpanded, setExploreExpanded] = useState(false)
  const [pinnedTermId, setPinnedTermId] = useState(null)
  const [mapOffset, setMapOffset] = useState(0)
  const viewedIdsRef = useRef(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [pendingResult, setPendingResult] = useState(null) // { kind: 'hazard'|'group', term, hazardId, groupLabel? }
  const searchWrapRef = useRef(null)

  const selectedHazard = useMemo(
    () => EMERGENCY_HAZARDS.find((hazard) => hazard.id === selectedHazardId) || null,
    [selectedHazardId],
  )

  // "All" filter: every term matched to this hazard, capped for the map
  // ring (list mode uses the uncapped `hazardAllTerms` below instead).
  const hazardFlatTerms = useMemo(
    () =>
      selectedHazardId
        ? getHazardTerms(selectedHazardId, terms, MAX_MAP_TERMS, pinnedTermId)
        : { items: [], total: 0 },
    [selectedHazardId, terms, pinnedTermId],
  )

  const hazardAllTerms = useMemo(
    () => (selectedHazardId ? matchHazardTerms(selectedHazardId, terms) : []),
    [selectedHazardId, terms],
  )

  const displayGroups = useMemo(
    () => buildDisplayGroups(selectedHazardId, terms, t),
    [selectedHazardId, terms, t],
  )

  const hasGroups = displayGroups.length > 0

  const selectedGroup = useMemo(
    () => (selectedGroupId ? displayGroups.find((group) => group.id === selectedGroupId) || null : null),
    [selectedGroupId, displayGroups],
  )

  const filterChips = useMemo(() => {
    if (!hasGroups) return []
    return [
      { id: null, label: t.termMap.filterAll, count: hazardFlatTerms.total },
      ...displayGroups.map((group) => ({ id: group.id, label: group.label[lang], count: group.count })),
    ]
  }, [hasGroups, displayGroups, hazardFlatTerms.total, t, lang])

  const openTerm = useMemo(
    () => (selectedTermId ? terms.find((term) => term.id === selectedTermId) || null : null),
    [selectedTermId, terms],
  )

  // Every hazard the currently open term is genuinely linked to (same rule
  // the rings use per hazard, just run once for this one term) — powers
  // the panel's "related hazards" section, the cross-hazard node badge,
  // and the "show connections" view.
  const termHazards = useMemo(() => {
    if (!openTerm) return []
    return getTermHazards(openTerm, HAZARD_IDS)
      .map((id) => EMERGENCY_HAZARDS.find((hazard) => hazard.id === id))
      .filter(Boolean)
  }, [openTerm])

  // The thematic group the open term belongs to within the current hazard
  // (independent of whatever filter chip happens to be active), and its
  // real siblings in that group — the honest "related terms" pool for
  // both the panel and the explore ring, per the same grouping rule used
  // everywhere else on the map.
  const openTermGroup = useMemo(() => {
    if (!openTerm || !selectedHazardId) return null
    const groups = buildDisplayGroups(selectedHazardId, terms, t)
    return groups.find((group) => group.items.some((item) => item.id === openTerm.id)) || null
  }, [openTerm, selectedHazardId, terms, t])

  const openTermSiblings = useMemo(
    () => (openTermGroup ? openTermGroup.items.filter((item) => item.id !== openTerm.id) : []),
    [openTermGroup, openTerm],
  )

  const showConnectionsView = showConnections && Boolean(openTerm) && viewDisplay === 'map'

  const exploreVisibleSiblings = exploreExpanded
    ? openTermSiblings.slice(0, MAX_EXPLORE_EXPANDED)
    : openTermSiblings.slice(0, MAX_EXPLORE_INITIAL)
  const exploreMoreCount = exploreExpanded
    ? 0
    : Math.max(0, Math.min(openTermSiblings.length, MAX_EXPLORE_EXPANDED) - MAX_EXPLORE_INITIAL)

  // The explore ring around the open term: its thematic group (1 node),
  // every hazard it's linked to, and a capped, expandable slice of its
  // group siblings — three real, data-derived kinds of connection, mixed
  // into one ring (see requirement 3's discussion in the PR: literal
  // concentric levels would either invent geometry or get overcrowded, so
  // node *style* carries the "level" instead — circle+icon for group/
  // hazard, pill for term).
  const exploreNodes = useMemo(() => {
    if (!showConnectionsView) return []
    const nodes = []
    if (openTermGroup) nodes.push({ kind: 'group', id: `group:${openTermGroup.id}`, group: openTermGroup })
    for (const hazard of termHazards) nodes.push({ kind: 'hazard', id: `hazard:${hazard.id}`, hazard })
    for (const sibling of exploreVisibleSiblings) nodes.push({ kind: 'term', id: sibling.id, term: sibling })
    if (exploreMoreCount > 0) nodes.push({ kind: 'more', id: '__more__', count: exploreMoreCount })
    return nodes
  }, [showConnectionsView, openTermGroup, termHazards, exploreVisibleSiblings, exploreMoreCount])

  // The map's search index: every term linked to at least one hazard (the
  // same pool the rings draw from), deduped, plus which hazard each one
  // "lives in" first (see EMERGENCY_HAZARDS order) — reused both for
  // showing a result's home hazard and for the cross-hazard jump prompt.
  const { searchableTerms, termHazardMap } = useMemo(() => {
    const map = new Map()
    const list = []
    const seen = new Set()
    for (const hazard of EMERGENCY_HAZARDS) {
      const matches = matchHazardTerms(hazard.id, terms)
      for (const term of matches) {
        if (!map.has(term.id)) map.set(term.id, hazard.id)
        if (!seen.has(term.id)) {
          seen.add(term.id)
          list.push(term)
        }
      }
    }
    return { searchableTerms: list, termHazardMap: map }
  }, [terms])

  const deferredQuery = useDeferredValue(searchQuery)
  const query = deferredQuery.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!query) return []
    const hazardHits = EMERGENCY_HAZARDS.filter(
      (hazard) =>
        startsWithQuery(hazard.name.kk, query) ||
        startsWithQuery(hazard.name.ru, query) ||
        startsWithQuery(hazard.name.en, query),
    ).map((hazard) => ({ kind: 'hazard', key: `hazard:${hazard.id}`, hazard }))

    const termHits = searchableTerms
      .filter(
        (term) =>
          startsWithQuery(term.kk, query) || startsWithQuery(term.ru, query) || startsWithQuery(term.en, query),
      )
      .map((term) => ({ kind: 'term', key: term.id, term }))

    return [...hazardHits, ...termHits].slice(0, MAX_SEARCH_RESULTS)
  }, [query, searchableTerms])

  const showDropdown = searchFocused && query.length > 0

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) setSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      if (openTerm) setSelectedTermId(null)
      else if (pendingResult) setPendingResult(null)
      else if (searchFocused) setSearchFocused(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openTerm, pendingResult, searchFocused])

  function openHazard(hazardId) {
    setSelectedHazardId(hazardId)
    setSelectedGroupId(null)
    setViewDisplay('map')
    setHoveredId(null)
    setSelectedTermId(null)
    setShowConnections(false)
    setPinnedTermId(null)
    setMapOffset(0)
    viewedIdsRef.current = new Set()
  }

  function selectFilter(groupId) {
    setSelectedGroupId(groupId)
    setHoveredId(null)
    setSelectedTermId(null)
    setShowConnections(false)
    setMapOffset(0)
    viewedIdsRef.current = new Set()
  }

  function backToOverview() {
    setSelectedHazardId(null)
    setSelectedGroupId(null)
    setViewDisplay('map')
    setHoveredId(null)
    setSelectedTermId(null)
    setShowConnections(false)
    setPinnedTermId(null)
    setMapOffset(0)
    viewedIdsRef.current = new Set()
  }

  // Cycles the map ring to the next batch of MAX_MAP_TERMS terms from the
  // current (uncapped) list, wrapping back to the start once it runs out —
  // the ring can only show so many nodes at once, so this is how the rest
  // of a hazard's terms become reachable from the map view.
  function showOtherMapTerms() {
    setMapOffset((offset) => offset + MAX_MAP_TERMS)
  }

  // Selects a term without changing hazard/group — used by map/list nodes
  // and the panel's "related terms" chips. Closes any open connections
  // view since it belonged to the previously open term.
  function selectTerm(termId) {
    setSelectedTermId(termId)
    setShowConnections(false)
    setExploreExpanded(false)
  }

  // Jumps a term into a (possibly different) hazard — used by search
  // results and by the panel's cross-hazard chips (see termHazards above).
  function navigateToTerm(term, hazardId) {
    const groups = buildDisplayGroups(hazardId, terms, t)
    const targetGroup = groups.find((group) => group.items.some((item) => item.id === term.id)) || null

    setSelectedHazardId(hazardId)
    setSelectedGroupId(targetGroup?.id ?? null)
    setHoveredId(null)
    setSelectedTermId(term.id)
    setShowConnections(false)
    setExploreExpanded(false)
    setPinnedTermId(term.id)
    setMapOffset(0)
    viewedIdsRef.current = new Set()
    setSearchQuery('')
    setSearchFocused(false)
    setPendingResult(null)
  }

  // Re-centers the explore ring on a different term without leaving
  // explore mode — this is the "click a related term to chain deeper"
  // move (requirement 4/5): the group filter follows the new term (it's
  // drawn from the same hazard's term pool), but hazard and explore mode
  // stay put.
  function exploreTerm(term) {
    const groups = buildDisplayGroups(selectedHazardId, terms, t)
    const targetGroup = groups.find((group) => group.items.some((item) => item.id === term.id)) || null

    setSelectedGroupId(targetGroup?.id ?? null)
    setHoveredId(null)
    setSelectedTermId(term.id)
    setPinnedTermId(term.id)
    setExploreExpanded(false)
    setMapOffset(0)
    viewedIdsRef.current = new Set()
  }

  function toggleConnections() {
    setShowConnections((prev) => {
      const next = !prev
      if (next) setViewDisplay('map')
      return next
    })
    setExploreExpanded(false)
  }

  function handleSelectSearchHazard(hazardId) {
    openHazard(hazardId)
    setSearchQuery('')
    setSearchFocused(false)
    setPendingResult(null)
  }

  function handleSelectSearchTerm(term) {
    const targetHazardId = termHazardMap.get(term.id)
    if (!targetHazardId) return

    if (selectedHazardId && selectedHazardId !== targetHazardId) {
      setPendingResult({ kind: 'hazard', term, hazardId: targetHazardId })
      setSearchFocused(false)
      return
    }

    // Same hazard the user is already in — check whether the result falls
    // outside the active filter (group) before jumping there silently.
    if (selectedHazardId && selectedGroupId) {
      const groups = buildDisplayGroups(selectedHazardId, terms, t)
      const targetGroup = groups.find((group) => group.items.some((item) => item.id === term.id)) || null
      if (targetGroup?.id !== selectedGroupId) {
        setPendingResult({
          kind: 'group',
          term,
          hazardId: targetHazardId,
          groupLabel: targetGroup ? targetGroup.label[lang] : t.termMap.filterAll,
        })
        setSearchFocused(false)
        return
      }
    }

    navigateToTerm(term, targetHazardId)
  }

  function clearSearch() {
    setSearchQuery('')
  }

  const listItems = selectedGroup ? selectedGroup.items : hazardAllTerms
  const activeTermTotal = selectedGroup ? selectedGroup.items.length : hazardFlatTerms.total

  // Windows the ring down to MAX_MAP_TERMS nodes at a time, cycling through
  // the rest via mapOffset (see showOtherMapTerms) instead of always
  // showing the same alphabetical first page.
  const activeTermItems = useMemo(() => {
    if (listItems.length <= MAX_MAP_TERMS) return withPinned(listItems, listItems, pinnedTermId)
    const start = mapOffset % listItems.length
    let windowed = listItems.slice(start, start + MAX_MAP_TERMS)
    if (windowed.length < MAX_MAP_TERMS) {
      windowed = windowed.concat(listItems.slice(0, MAX_MAP_TERMS - windowed.length))
    }
    return withPinned(windowed, listItems, pinnedTermId)
  }, [listItems, mapOffset, pinnedTermId])

  // Running count of distinct terms the "Other terms" button has cycled
  // through for this hazard/group, so the hint can say "studied 20 of 234"
  // instead of resetting to "10" on every batch. Mutating the ref here
  // (rather than an effect) keeps it in sync with the very render that
  // shows the new batch, no one-tick lag.
  activeTermItems.forEach((term) => viewedIdsRef.current.add(term.id))
  const viewedCount = viewedIdsRef.current.size

  let ringNodes
  if (!selectedHazard) ringNodes = EMERGENCY_HAZARDS
  else if (showConnectionsView) ringNodes = exploreNodes
  else ringNodes = activeTermItems
  const ringPositions = selectedHazard ? getRingPositions(ringNodes.length) : HAZARD_POSITIONS
  const hazardTermsReady = Boolean(selectedHazard) && !termsLoading && !termsError

  const networkKey = !selectedHazard
    ? 'overview'
    : showConnectionsView
      ? `connections:${openTerm.id}`
      : `${selectedHazardId}:${selectedGroupId ?? 'all'}`

  const centerContent = showConnectionsView
    ? { icon: <Link2 size={22} strokeWidth={1.75} />, label: toSentenceCase(openTerm[lang] || openTerm.ru) }
    : selectedGroup
      ? { icon: <Layers size={24} strokeWidth={1.75} />, label: selectedGroup.label[lang] }
      : selectedHazard
        ? { icon: <selectedHazard.Icon size={26} strokeWidth={1.75} />, label: selectedHazard.name[lang] }
        : { icon: <Siren size={28} strokeWidth={1.75} />, label: t.termMap.centerLabel }

  return (
    <SiteSectionLayout activeSection="termMap">
      <section id="term-map" className="section-term-map">
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{t.termMap.title}</h1>
        <p className="section-lead">{t.termMap.lead}</p>

        <div className="term-map-canvas">
          <div className="term-map-search" ref={searchWrapRef}>
            <div className="term-map-search-box">
              <Search size={18} className="term-map-search-icon" aria-hidden="true" />
              <input
                type="search"
                className="term-map-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder={t.termMap.searchPlaceholder}
                aria-label={t.termMap.searchPlaceholder}
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                aria-controls="term-map-search-results"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="term-map-search-clear"
                  onClick={clearSearch}
                  aria-label={t.termMap.searchClear}
                  title={t.termMap.searchClear}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>

            {showDropdown && (
              <ul className="search-suggestions" id="term-map-search-results" role="listbox">
                {searchResults.length === 0 ? (
                  <li className="search-suggestion-empty term-map-search-empty">
                    <p className="term-map-search-empty-title">{t.termMap.searchEmptyTitle}</p>
                    <p className="term-map-search-empty-note">{t.termMap.searchEmptyNote}</p>
                  </li>
                ) : (
                  searchResults.map((result) => {
                    if (result.kind === 'hazard') {
                      return (
                        <li key={result.key} role="option" aria-selected="false">
                          <button
                            type="button"
                            className="search-suggestion-item term-map-search-result term-map-search-result--hazard"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSearchHazard(result.hazard.id)}
                          >
                            <span className="search-suggestion-accent" aria-hidden="true"></span>
                            <span className="search-suggestion-text">
                              <span className="search-suggestion-primary">
                                <HighlightedText text={result.hazard.name[lang]} query={query} />
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    }

                    const resultCrossCount = getTermHazards(result.term, HAZARD_IDS).length
                    const homeHazardName =
                      EMERGENCY_HAZARDS.find((h) => h.id === termHazardMap.get(result.term.id))?.name[lang] || ''

                    return (
                      <li key={result.key} role="option" aria-selected="false">
                        <button
                          type="button"
                          className="search-suggestion-item term-map-search-result"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectSearchTerm(result.term)}
                        >
                          <span className="search-suggestion-accent" aria-hidden="true"></span>
                          <span className="search-suggestion-text">
                            <span className="search-suggestion-primary">
                              <HighlightedText
                                text={toSentenceCase(result.term[lang] || result.term.ru)}
                                query={query}
                              />
                            </span>
                            <span className="search-suggestion-secondary">
                              {homeHazardName}
                              {resultCrossCount > 1 && ` · ${t.termMap.searchCrossHazards(resultCrossCount)}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            )}
          </div>

          {pendingResult && (
            <div className="term-map-search-confirm">
              <p className="term-map-search-confirm-text">
                {pendingResult.kind === 'hazard'
                  ? t.termMap.crossHazardFound(
                      toSentenceCase(pendingResult.term[lang] || pendingResult.term.ru),
                      EMERGENCY_HAZARDS.find((h) => h.id === pendingResult.hazardId)?.name[lang] || '',
                    )
                  : t.termMap.crossGroupFound(pendingResult.groupLabel)}
              </p>
              <div className="term-map-search-confirm-actions">
                <button
                  type="button"
                  className="term-map-search-confirm-go"
                  onClick={() => navigateToTerm(pendingResult.term, pendingResult.hazardId)}
                >
                  {t.termMap.crossHazardGo}
                </button>
                <button
                  type="button"
                  className="term-map-search-confirm-cancel"
                  onClick={() => setPendingResult(null)}
                >
                  {t.termMap.crossHazardCancel}
                </button>
              </div>
            </div>
          )}

          {selectedHazard && (
            <div className="term-map-toolbar">
              <button type="button" className="term-map-back-btn" onClick={backToOverview}>
                <ArrowLeft size={16} aria-hidden="true" />
                {t.termMap.backToAll}
              </button>
              <nav className="term-map-breadcrumb" aria-label={t.termMap.title}>
                {[
                  { label: t.termMap.title, onClick: backToOverview },
                  { label: selectedHazard.name[lang], onClick: () => selectFilter(null) },
                  ...(selectedGroup ? [{ label: selectedGroup.label[lang], onClick: () => selectFilter(selectedGroupId) }] : []),
                  ...(openTerm ? [{ label: toSentenceCase(openTerm[lang] || openTerm.ru), onClick: null }] : []),
                ].map((segment, i, all) => (
                  <span className="term-map-breadcrumb-segment" key={i}>
                    {i > 0 && <ChevronRight size={14} className="term-map-breadcrumb-sep" aria-hidden="true" />}
                    {i === all.length - 1 ? (
                      <span className="term-map-breadcrumb-current">{segment.label}</span>
                    ) : (
                      <button type="button" className="term-map-breadcrumb-root" onClick={segment.onClick}>
                        {segment.label}
                      </button>
                    )}
                  </span>
                ))}
              </nav>

              <div className="term-map-mode-switch" role="radiogroup" aria-label={t.termMap.viewMap}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={viewDisplay === 'map'}
                  className={`term-map-mode-btn${viewDisplay === 'map' ? ' active' : ''}`}
                  onClick={() => setViewDisplay('map')}
                >
                  <Waypoints size={14} aria-hidden="true" />
                  {t.termMap.viewMap}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={viewDisplay === 'list'}
                  className={`term-map-mode-btn${viewDisplay === 'list' ? ' active' : ''}`}
                  onClick={() => setViewDisplay('list')}
                >
                  <LayoutGrid size={14} aria-hidden="true" />
                  {t.termMap.viewList}
                </button>
              </div>
            </div>
          )}

          {selectedHazard && hasGroups && !showConnectionsView && (
            <div className="term-map-filters">
              {filterChips.map((chip) => (
                <button
                  key={chip.id ?? 'all'}
                  type="button"
                  className={`term-map-filter-chip${selectedGroupId === chip.id ? ' active' : ''}`}
                  onClick={() => selectFilter(chip.id)}
                  aria-pressed={selectedGroupId === chip.id}
                >
                  {chip.label}
                  <span className="term-map-filter-count">{chip.count}</span>
                </button>
              ))}
            </div>
          )}

          {viewDisplay === 'map' && (
            <div
              key={networkKey}
              className={`term-map-network${selectedHazard ? ' term-map-network-detail' : ''}`}
              onMouseLeave={() => setHoveredId(null)}
            >
              <svg
                className="term-map-network-lines"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {ringNodes.map((node, i) => {
                  const pos = ringPositions[i]
                  const isActive = hoveredId === node.id || selectedTermId === node.id
                  return (
                    <line
                      key={node.id}
                      x1={CENTER.x}
                      y1={CENTER.y}
                      x2={pos.x}
                      y2={pos.y}
                      className={`term-map-edge${isActive ? ' active' : ''}`}
                    />
                  )
                })}
              </svg>

              <div
                className="term-map-node term-map-node-center"
                style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
                title={
                  selectedGroup ? selectedGroup.label[lang] : selectedHazard ? selectedHazard.name[lang] : t.termMap.centerLabelFull
                }
              >
                <span className="term-map-node-icon" aria-hidden="true">
                  {centerContent.icon}
                </span>
                <span className="term-map-node-center-label">{centerContent.label}</span>
              </div>

              {!selectedHazard &&
                EMERGENCY_HAZARDS.map((hazard, i) => {
                  const pos = HAZARD_POSITIONS[i]
                  const label = hazard.name[lang]
                  const isDimmed = hoveredId !== null && hoveredId !== hazard.id

                  return (
                    <button
                      key={hazard.id}
                      type="button"
                      className={`term-map-node term-map-node-satellite term-map-node--hazard${isDimmed ? ' dimmed' : ''}`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, animationDelay: `${i * 35}ms` }}
                      onMouseEnter={() => setHoveredId(hazard.id)}
                      onFocus={() => setHoveredId(hazard.id)}
                      onBlur={() => setHoveredId(null)}
                      onClick={() => openHazard(hazard.id)}
                    >
                      <span className="term-map-node-circle">
                        <span className="term-map-node-icon" aria-hidden="true">
                          <hazard.Icon size={26} strokeWidth={1.75} />
                        </span>
                      </span>
                      <span className="term-map-node-label">{label}</span>
                      <span className="term-map-node-tooltip" role="tooltip">
                        {label}
                      </span>
                    </button>
                  )
                })}

              {showConnectionsView &&
                exploreNodes.map((node, i) => {
                  const pos = ringPositions[i]
                  const isDimmed = hoveredId !== null && hoveredId !== node.id
                  const commonProps = {
                    onMouseEnter: () => setHoveredId(node.id),
                    onFocus: () => setHoveredId(node.id),
                    onBlur: () => setHoveredId(null),
                    style: { left: `${pos.x}%`, top: `${pos.y}%`, animationDelay: `${i * 40}ms` },
                  }

                  if (node.kind === 'group') {
                    const label = node.group.label[lang]
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`term-map-node term-map-node-satellite term-map-node--hazard${isDimmed ? ' dimmed' : ''}`}
                        onClick={() => selectFilter(node.group.id)}
                        {...commonProps}
                      >
                        <span className="term-map-node-circle">
                          <span className="term-map-node-icon" aria-hidden="true">
                            <Layers size={24} strokeWidth={1.75} />
                          </span>
                        </span>
                        <span className="term-map-node-label">{label}</span>
                        <span className="term-map-node-tooltip" role="tooltip">
                          {label}
                        </span>
                      </button>
                    )
                  }

                  if (node.kind === 'hazard') {
                    const label = node.hazard.name[lang]
                    const isCurrent = node.hazard.id === selectedHazardId
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`term-map-node term-map-node-satellite term-map-node--hazard${isDimmed ? ' dimmed' : ''}${isCurrent ? ' selected' : ''}`}
                        onClick={() => !isCurrent && navigateToTerm(openTerm, node.hazard.id)}
                        {...commonProps}
                      >
                        <span className="term-map-node-circle">
                          <span className="term-map-node-icon" aria-hidden="true">
                            <node.hazard.Icon size={26} strokeWidth={1.75} />
                          </span>
                        </span>
                        <span className="term-map-node-label">{label}</span>
                        <span className="term-map-node-tooltip" role="tooltip">
                          {label}
                        </span>
                      </button>
                    )
                  }

                  if (node.kind === 'term') {
                    const label = node.term[lang] || node.term.ru
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`term-map-node term-map-node-satellite term-map-node--term${isDimmed ? ' dimmed' : ''}`}
                        onClick={() => exploreTerm(node.term)}
                        {...commonProps}
                      >
                        <span className="term-map-term-label">{label}</span>
                        <span className="term-map-node-tooltip" role="tooltip">
                          {label}
                        </span>
                      </button>
                    )
                  }

                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`term-map-node term-map-node-satellite term-map-node--term${isDimmed ? ' dimmed' : ''}`}
                      onClick={() => setExploreExpanded(true)}
                      {...commonProps}
                    >
                      <span className="term-map-node-circle term-map-node-circle--more">
                        <span className="term-map-node-more-count">+{node.count}</span>
                      </span>
                      <span className="term-map-node-label">{t.termMap.showMoreConnections(node.count)}</span>
                    </button>
                  )
                })}

              {!showConnectionsView &&
                hazardTermsReady &&
                ringNodes.map((term, i) => {
                  const pos = ringPositions[i]
                  const label = term[lang] || term.ru
                  const isSelected = selectedTermId === term.id
                  const isDimmed = hoveredId !== null ? hoveredId !== term.id : Boolean(openTerm) && !isSelected
                  const crossCount = getTermHazards(term, HAZARD_IDS).length

                  return (
                    <button
                      key={term.id}
                      type="button"
                      className={`term-map-node term-map-node-satellite term-map-node--term${isSelected ? ' selected' : ''}${isDimmed ? ' dimmed' : ''}`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, animationDelay: `${i * 40}ms` }}
                      onMouseEnter={() => setHoveredId(term.id)}
                      onFocus={() => setHoveredId(term.id)}
                      onBlur={() => setHoveredId(null)}
                      onClick={() => selectTerm(term.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="term-map-term-label">{label}</span>
                      {crossCount > 1 && (
                        <span className="term-map-term-cross-badge" title={t.termMap.crossCountTooltip(crossCount)}>
                          {t.termMap.crossCountBadge(crossCount)}
                        </span>
                      )}
                      <span className="term-map-node-tooltip" role="tooltip">
                        {label}
                      </span>
                    </button>
                  )
                })}
            </div>
          )}

          {viewDisplay === 'list' && selectedHazard && (
            <div key={networkKey} className="term-map-list">
              {hazardTermsReady &&
                listItems.map((term) => {
                  const label = toSentenceCase(term[lang] || term.ru)
                  const categoryLabel = term.category
                    ? CATEGORIES.find((c) => c.key === term.category)?.[lang] || term.category
                    : null
                  const isSelected = selectedTermId === term.id
                  const crossCount = getTermHazards(term, HAZARD_IDS).length

                  return (
                    <button
                      key={term.id}
                      type="button"
                      className={`term-map-list-item${isSelected ? ' selected' : ''}`}
                      onClick={() => selectTerm(term.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="term-map-list-item-label">{label}</span>
                      {categoryLabel && <span className="term-map-list-item-sub">{categoryLabel}</span>}
                      {crossCount > 1 && (
                        <span className="term-map-list-item-cross" title={t.termMap.crossCountTooltip(crossCount)}>
                          {t.termMap.crossCountBadge(crossCount)}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          )}

          {!selectedHazard && <p className="term-map-hint">{t.termMap.hint}</p>}

          {selectedHazard && termsLoading && (
            <p className="term-map-hint">{t.termMap.loadingHazard(selectedHazard.name[lang])}</p>
          )}

          {selectedHazard && !termsLoading && termsError && (
            <p className="term-map-hint term-map-hint-error">{t.alerts.loadFailed}</p>
          )}

          {showConnectionsView && (
            <p className="term-map-hint">{t.termMap.connectionsHint(toSentenceCase(openTerm[lang] || openTerm.ru))}</p>
          )}

          {!showConnectionsView && hazardTermsReady && activeTermItems.length === 0 && (
            <p className="term-map-hint">{t.termMap.emptyTerms}</p>
          )}

          {!showConnectionsView && hazardTermsReady && viewDisplay === 'map' && activeTermItems.length > 0 && (
            <div className="term-map-more">
              <p className="term-map-hint">{t.termMap.viewedCount(viewedCount, activeTermTotal)}</p>
              {activeTermTotal > MAX_MAP_TERMS && (
                <button type="button" className="term-map-more-btn" onClick={showOtherMapTerms}>
                  {t.termMap.otherTerms}
                </button>
              )}
            </div>
          )}
        </div>

        {openTerm && (
          <TermMapPanel
            term={openTerm}
            lang={lang}
            t={t}
            hazardLabel={selectedHazard?.name[lang] || null}
            groupLabel={selectedGroup?.label[lang] || null}
            relatedTerms={openTermSiblings.slice(0, MAX_RELATED_TERMS)}
            relatedTotal={openTermSiblings.length}
            onSelectRelated={(id) => {
              if (showConnectionsView) {
                const sibling = openTermSiblings.find((item) => item.id === id)
                if (sibling) exploreTerm(sibling)
              } else {
                selectTerm(id)
              }
            }}
            onClose={() => setSelectedTermId(null)}
            crossHazards={termHazards}
            currentHazardId={selectedHazardId}
            onSelectHazard={(hazardId) => navigateToTerm(openTerm, hazardId)}
            showConnections={showConnections}
            onToggleConnections={toggleConnections}
          />
        )}
      </section>
    </SiteSectionLayout>
  )
}

export default TermMapPage
