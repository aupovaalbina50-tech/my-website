import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import {
  TermSuggestionList,
  fetchAllTerms,
  useSuggestionKeyboard,
  useTermSuggestions,
} from './TermSuggestions.jsx'

function DashboardTermSearch({ termBasePath = '/account/terms' }) {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchAllTerms('id, kk, ru, en').then(({ data }) => {
      if (!cancelled && data) setTerms(data)
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

  const suggestions = useTermSuggestions(terms, search, lang)
  const showSuggestions = focused && search.trim().length > 0

  const handleSelect = (term) => {
    setFocused(false)
    setSearch('')
    navigate(`${termBasePath}/${term.id}`)
  }

  const { activeIndex, setActiveIndex, onKeyDown } = useSuggestionKeyboard({
    suggestions,
    open: showSuggestions,
    query: search,
    onSelect: handleSelect,
    onClose: () => setFocused(false),
  })

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
        onKeyDown={onKeyDown}
        placeholder={t.hero.placeholder}
        aria-label={t.hero.placeholder}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
        aria-controls="dash-search-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `dash-search-suggestions-option-${activeIndex}` : undefined}
        autoComplete="off"
      />
      {showSuggestions && (
        <TermSuggestionList
          id="dash-search-suggestions"
          suggestions={suggestions}
          query={search}
          lang={lang}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onSelect={handleSelect}
          notFoundText={t.account.home.searchNotFound}
        />
      )}
    </div>
  )
}

export default DashboardTermSearch
