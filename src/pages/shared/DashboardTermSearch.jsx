import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { toSentenceCase } from '../../utils/textCase.js'

const MAX_SUGGESTIONS = 8

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

function DashboardTermSearch({ termBasePath = '/account/terms' }) {
  const { t, lang } = useLanguage()
  const otherLang = lang === 'kk' ? 'ru' : 'kk'
  const navigate = useNavigate()
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('terms')
      .select('id, kk, ru, en')
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setTerms(data)
      })
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

  const deferredSearch = useDeferredValue(search)
  const query = deferredSearch.trim().toLowerCase()

  const suggestions = useMemo(() => {
    if (!query) return []
    const matches = terms.filter(
      (term) =>
        startsWithQuery(term.kk, query) ||
        startsWithQuery(term.ru, query) ||
        startsWithQuery(term.en, query),
    )
    matches.sort((a, b) =>
      (a[lang] || a[otherLang] || a.en).localeCompare(b[lang] || b[otherLang] || b.en, lang),
    )
    return matches.slice(0, MAX_SUGGESTIONS)
  }, [terms, query, lang, otherLang])

  const showSuggestions = focused && query.length > 0

  const handleSelect = (term) => {
    setFocused(false)
    setSearch('')
    navigate(`${termBasePath}/${term.id}`)
  }

  return (
    <div className="dash-search-box" ref={wrapRef}>
      <Search className="dash-search-icon" size={18} aria-hidden="true" />
      <input
        type="search"
        className="dash-search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder={t.hero.placeholder}
        aria-label={t.hero.placeholder}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
        aria-controls="dash-search-suggestions"
      />
      {showSuggestions && (
        <ul className="search-suggestions" id="dash-search-suggestions" role="listbox">
          {suggestions.length === 0 ? (
            <li className="search-suggestion-empty">{t.table.emptyNoResults}</li>
          ) : (
            suggestions.map((term) => (
              <li key={term.id} role="option" aria-selected="false">
                <button
                  type="button"
                  className="search-suggestion-item"
                  onMouseDown={(e) => e.preventDefault()}
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
                      {' · '}
                      <HighlightedText text={toSentenceCase(term.en)} query={query} />
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
