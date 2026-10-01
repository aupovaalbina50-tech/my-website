import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, BookOpen, Bookmark, Flame, GraduationCap, Languages, Presentation, HandHeart, Globe } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { SECTION_IDS } from '../constants/navigation.js'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import DocsContent from './shared/DocsContent.jsx'
import {
  TermSuggestionList,
  fetchAllTerms,
  startsWithQuery,
  useSuggestionKeyboard,
  useTermSuggestions,
} from './shared/TermSuggestions.jsx'

const STEP_ICONS = [Search, BookOpen, Bookmark]

const StepsSection = memo(function StepsSection({ t }) {
  const [activeStep, setActiveStep] = useState(0)
  return (
    <section className="steps-section">
      <div className="section-kicker" aria-hidden="true"></div>
      <h2 className="section-title">{t.steps.title}</h2>
      <div className="steps-grid">
        {t.steps.items.map((step, index) => {
          const Icon = STEP_ICONS[index] || Search
          const isActive = activeStep === index
          return (
            <button
              type="button"
              className={`step-card${isActive ? ' active' : ''}`}
              key={step.n}
              onClick={() => setActiveStep(index)}
              aria-pressed={isActive}
            >
              <span className="step-card-top">
                <Icon className="step-card-icon" strokeWidth={1.75} aria-hidden="true" />
                <span className="step-n">{step.n}</span>
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
})

const AUDIENCE_ICONS = [Flame, GraduationCap, Languages, Presentation, HandHeart, Globe]

const AudienceSection = memo(function AudienceSection({ t }) {
  return (
    <section className="audience-section">
      <div className="section-kicker" aria-hidden="true"></div>
      <h2 className="section-title">{t.audience.title}</h2>
      <p className="section-lead">{t.audience.lead}</p>
      <div className="audience-grid">
        {t.audience.items.map((a, index) => {
          const Icon = AUDIENCE_ICONS[index] || Globe
          return (
            <div className="audience-card" key={a.title}>
              <Icon className="audience-card-icon" strokeWidth={1.75} aria-hidden="true" />
              <h3>{a.title}</h3>
              <p>{a.text}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
})

function HomePage() {
  const { lang, t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('search')
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchWrapRef = useRef(null)
  const searchInputRef = useRef(null)

  const fetchTerms = async () => {
    setLoading(true)
    const { data, error } = await fetchAllTerms('id, ru, kk, en, category')

    if (error) {
      setError(t.alerts.loadFailed)
    } else {
      setError('')
      setTerms(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTerms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean)
    if (sections.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveTab(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveTab(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash])

  useEffect(() => {
    const current = searchParams.get('q') || ''
    if (current === search) return
    const next = new URLSearchParams(searchParams)
    if (search) next.set('q', search)
    else next.delete('q')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleNavClick = useCallback((id) => {
    setActiveTab(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleHeroSearchAction = () => {
    searchInputRef.current?.focus()
  }

  const handleHeroCompareAction = () => {
    navigate('/terms')
  }

  const deferredSearch = useDeferredValue(search)

  const visibleTerms = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const filtered = query
      ? terms.filter(
          (term) =>
            startsWithQuery(term.ru, query) ||
            startsWithQuery(term.kk, query) ||
            startsWithQuery(term.en, query),
        )
      : terms

    return [...filtered].sort((a, b) =>
      (a[lang] || a.ru || a.kk).localeCompare(b[lang] || b.ru || b.kk, lang) ||
      a.en.localeCompare(b.en, 'en'),
    )
  }, [terms, deferredSearch, lang])

  const searchSuggestions = useTermSuggestions(terms, search, lang)

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showSuggestions = isSearchFocused && search.trim().length > 0

  const handleSuggestionSelect = (term) => {
    setIsSearchFocused(false)
    navigate(`/terms/${term.id}`)
  }

  const suggestionKeys = useSuggestionKeyboard({
    suggestions: searchSuggestions,
    open: showSuggestions,
    query: search,
    onSelect: handleSuggestionSelect,
    onClose: () => setIsSearchFocused(false),
  })

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection={activeTab} onSectionClick={handleNavClick} />
        <div className="home-content">
      {error && <div className="alert">{error}</div>}

      <section id="search" className="section-search">
        <div className="hero-glow-clip" aria-hidden="true">
          <div className="hero-glow"></div>
        </div>
        <div className="hero-search">
          <p className="hero-kicker">{t.hero.kicker}</p>
          <h2 className="hero-headline">{t.hero.headline}</h2>
          <p className="hero-lead">{t.hero.lead}</p>
          <div className="hero-search-box" ref={searchWrapRef}>
            <input
              ref={searchInputRef}
              type="search"
              className="hero-search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setIsSearchFocused(true)
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={suggestionKeys.onKeyDown}
              autoComplete="off"
              placeholder={t.hero.placeholder}
              aria-label={t.hero.searchAria}
              role="combobox"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-activedescendant={
                suggestionKeys.activeIndex >= 0 ? `search-suggestions-option-${suggestionKeys.activeIndex}` : undefined
              }
            />
            {showSuggestions && (
              <TermSuggestionList
                id="search-suggestions"
                suggestions={searchSuggestions}
                query={search}
                lang={lang}
                activeIndex={suggestionKeys.activeIndex}
                setActiveIndex={suggestionKeys.setActiveIndex}
                onSelect={handleSuggestionSelect}
                notFoundText={t.account.home.searchNotFound}
              />
            )}
          </div>
          <div className="hero-actions">
            <button type="button" className="hero-action" onClick={handleHeroSearchAction}>
              {t.hero.actions.search}
            </button>
            <span className="hero-action-sep" aria-hidden="true">·</span>
            <button type="button" className="hero-action" onClick={handleHeroCompareAction}>
              {t.hero.actions.compare}
            </button>
            <span className="hero-action-sep" aria-hidden="true">·</span>
            <button type="button" className="hero-action" onClick={handleHeroSearchAction}>
              {t.hero.actions.translate}
            </button>
          </div>
          <div className="hero-meta">
            <span>
              {search.trim() ? t.hero.found(visibleTerms.length) : t.hero.total(terms.length)}
            </span>
            <span className="hero-meta-divider" aria-hidden="true"></span>
            <span className="hero-coords">KZ · 48°N 68°E</span>
          </div>
        </div>
      </section>

      <StepsSection t={t} />
      <AudienceSection t={t} />
      <DocsContent />
        </div>
      </div>

      <Footer />
    </>
  )
}

export default HomePage
