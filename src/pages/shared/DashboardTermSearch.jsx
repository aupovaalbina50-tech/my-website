import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { toSentenceCase } from '../../utils/textCase.js'

const MAX_SUGGESTIONS = 8
// PostgREST returns at most 1000 rows per request, so the full dictionary is
// fetched in pages — the search must cover every term on the site.
const PAGE_SIZE = 1000

function startsWithQuery(text, query) {
  return (text || '')
    .toLowerCase()
    .split(/[\s,;()/-]+/)
    .some((word) => word.startsWith(query))
}

// Lower is better: the whole term starts with the query (in the UI language,
// then in any language), then some word of it does.
function matchRank(term, query, langOrder) {
  for (let i = 0; i < langOrder.length; i++) {
    if ((term[langOrder[i]] || '').toLowerCase().startsWith(query)) return i
  }
  for (let i = 0; i < langOrder.length; i++) {
    if (startsWithQuery(term[langOrder[i]], query)) return langOrder.length + i
  }
  return -1
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

function DashboardTermSearch({ termBasePath = '/account/terms' }) {
  const { t, lang } = useLanguage()
  const otherLang = lang === 'kk' ? 'ru' : 'kk'
  const navigate = useNavigate()
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      const all = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('terms')
          .select('id, kk, ru, en')
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
        if (error || !data) break
        all.push(...data)
        if (data.length < PAGE_SIZE) break
      }
      if (!cancelled) setTerms(all)
    }
    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Not deferred: the list must follow every typed character immediately
  // (filtering ~1000 short strings is far below a frame).
  const query = search.trim().toLowerCase()

  const suggestions = useMemo(() => {
    if (!query) return []
    const langOrder = [lang, otherLang, 'en']
    const label = (term) => term[lang] || term[otherLang] || term.en || ''
    // The dictionary has a few duplicate rows (same kk/ru/en); show each once.
    const seen = new Set()
    return terms
      .map((term) => ({ term, rank: matchRank(term, query, langOrder) }))
      .filter((item) => item.rank >= 0)
      .sort((a, b) => a.rank - b.rank || label(a.term).localeCompare(label(b.term), lang))
      .filter(({ term }) => {
        const key = [term.kk, term.ru, term.en].map((s) => (s || '').trim().toLowerCase()).join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, MAX_SUGGESTIONS)
      .map((item) => item.term)
  }, [terms, query, lang, otherLang])

  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  const showSuggestions = focused && query.length > 0

  const handleSelect = (term) => {
    setFocused(false)
    setSearch('')
    navigate(`${termBasePath}/${term.id}`)
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(suggestions[activeIndex >= 0 ? activeIndex : 0])
    } else if (e.key === 'Escape') {
      setFocused(false)
    }
  }

  return (
    <div className="dash-search-box" ref={wrapRef}>
      <Search className="dash-search-icon" size={18} aria-hidden="true" />
      <input
        type="search"
        className="dash-search-input"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setFocused(true)
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={t.hero.placeholder}
        aria-label={t.hero.placeholder}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
        aria-controls="dash-search-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `dash-search-option-${activeIndex}` : undefined}
        autoComplete="off"
      />
      {showSuggestions && (
        <ul className="search-suggestions search-suggestions--full" id="dash-search-suggestions" role="listbox">
          {suggestions.length === 0 ? (
            <li className="search-suggestion-empty">{t.account.home.searchNotFound}</li>
          ) : (
            suggestions.map((term, i) => (
              <li key={term.id} id={`dash-search-option-${i}`} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  className={`search-suggestion-item${i === activeIndex ? ' search-suggestion-item--active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleSelect(term)}
                >
                  <span className="search-suggestion-accent" aria-hidden="true"></span>
                  <span className="search-suggestion-text">
                    <span className="search-suggestion-primary">
                      <HighlightedText
                        text={toSentenceCase(term[lang] || term[otherLang] || term.en)}
                        query={query}
                      />
                    </span>
                    <span className="search-suggestion-secondary">
                      <HighlightedText text={toSentenceCase(term[otherLang])} query={query} />
                      {term.en && (
                        <>
                          {' · '}
                          <HighlightedText text={toSentenceCase(term.en)} query={query} />
                        </>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default DashboardTermSearch
