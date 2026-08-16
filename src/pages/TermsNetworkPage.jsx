import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, ALargeSmall, RotateCcw, Search as SearchIcon, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../i18n/translations'
import { categoryLucideIcon } from '../constants/categoryIcons.js'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import { toSentenceCase } from '../utils/textCase.js'

function TermsNetworkPage() {
  const navigate = useNavigate()
  const { lang, t } = useLanguage()
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('categories')
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('terms')
      .select('id, kk, ru, en, category')
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setTerms(data)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const termsByCategory = useMemo(() => {
    const map = {}
    CATEGORIES.forEach((cat) => {
      map[cat.key] = []
    })
    terms.forEach((term) => {
      if (map[term.category]) map[term.category].push(term)
    })
    Object.values(map).forEach((list) => list.sort((a, b) => a.kk.localeCompare(b.kk, 'ru')))
    return map
  }, [terms])

  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0

  const matchedTermIds = useMemo(() => {
    if (!isSearching) return null
    const set = new Set()
    terms.forEach((term) => {
      if (
        term.kk?.toLowerCase().includes(query) ||
        term.ru?.toLowerCase().includes(query) ||
        term.en?.toLowerCase().includes(query)
      ) {
        set.add(term.id)
      }
    })
    return set
  }, [terms, query, isSearching])

  const matchedCategoryKeys = useMemo(() => {
    if (!isSearching) return null
    const set = new Set()
    CATEGORIES.forEach((cat) => {
      const nameMatches = cat[lang].toLowerCase().includes(query)
      const hasMatchedTerm = (termsByCategory[cat.key] || []).some((term) => matchedTermIds.has(term.id))
      if (nameMatches || hasMatchedTerm) set.add(cat.key)
    })
    return set
  }, [isSearching, query, lang, termsByCategory, matchedTermIds])

  const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.[lang] || key

  const resetView = () => {
    setExpandedCategory(null)
    setSearch('')
  }

  const alphabetGroups = useMemo(() => {
    const list = isSearching ? terms.filter((term) => matchedTermIds.has(term.id)) : terms
    const groups = {}
    list.forEach((term) => {
      const label = toSentenceCase(term.kk || term.ru || term.en)
      const letter = label.charAt(0).toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(term)
    })
    Object.values(groups).forEach((arr) => arr.sort((a, b) => a.kk.localeCompare(b.kk, 'ru')))
    return groups
  }, [terms, isSearching, matchedTermIds])

  const alphabetLetters = Object.keys(alphabetGroups).sort((a, b) => a.localeCompare(b, 'ru'))

  const scrollToLetter = (letter) => {
    document.getElementById(`tnm-letter-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openTerm = (id) => navigate(`/terms/${id}`)

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="terms" onSectionClick={() => {}} />
        <div className="home-content">
          <section className="tnm-page">
            <div className="tnm-toolbar">
              <div className="tnm-search-box">
                <SearchIcon className="tnm-search-icon" size={17} aria-hidden="true" />
                <input
                  type="search"
                  className="tnm-search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.termsMap.searchPlaceholder}
                  aria-label={t.termsMap.searchPlaceholder}
                />
                {search && (
                  <button
                    type="button"
                    className="tnm-search-clear"
                    onClick={() => setSearch('')}
                    aria-label="×"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="tnm-view-switch" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'categories'}
                  className={`tnm-view-btn${view === 'categories' ? ' active' : ''}`}
                  onClick={() => setView('categories')}
                >
                  <LayoutGrid size={16} aria-hidden="true" />
                  {t.termsMap.viewCategories}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'alphabet'}
                  className={`tnm-view-btn${view === 'alphabet' ? ' active' : ''}`}
                  onClick={() => setView('alphabet')}
                >
                  <ALargeSmall size={16} aria-hidden="true" />
                  {t.termsMap.viewAlphabet}
                </button>
              </div>

              <button type="button" className="tnm-reset-btn" onClick={resetView}>
                <RotateCcw size={15} aria-hidden="true" />
                {t.termsMap.reset}
              </button>
            </div>

            {loading ? (
              <div className="card">
                <p className="empty-state-text">{t.termsMap.loading}</p>
              </div>
            ) : (
              <>
                {view === 'categories' && (
                  <div className="tnm-categories-view">
                    <div className="category-grid">
                      {CATEGORIES.map((cat, index) => {
                        const Icon = categoryLucideIcon(cat.key)
                        const isOpen = expandedCategory === cat.key
                        const isWide = index === CATEGORIES.length - 1
                        const dim = isSearching && !matchedCategoryKeys.has(cat.key)
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            className={`category-card${isWide ? ' category-card-wide' : ''}${isOpen ? ' active' : ''}${
                              dim ? ' tnm-card-dim' : ''
                            }`}
                            onClick={() => setExpandedCategory((cur) => (cur === cat.key ? null : cat.key))}
                          >
                            <span className="category-card-top">
                              <Icon className="category-card-icon" strokeWidth={1.75} aria-hidden="true" />
                              <span className="category-card-number">{String(index + 1).padStart(2, '0')}</span>
                            </span>
                            <span className="category-card-name">{cat[lang]}</span>
                          </button>
                        )
                      })}
                    </div>

                    {expandedCategory && (
                      <div className="tnm-term-list">
                        <h3>{categoryLabel(expandedCategory)}</h3>
                        <div className="tnm-term-chips">
                          {(termsByCategory[expandedCategory] || [])
                            .filter((term) => !isSearching || matchedTermIds.has(term.id))
                            .map((term) => (
                              <button
                                type="button"
                                key={term.id}
                                className="tnm-term-chip"
                                onClick={() => openTerm(term.id)}
                              >
                                {toSentenceCase(term.kk)}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {view === 'alphabet' && (
                  <div className="tnm-alphabet-view">
                    <div className="tnm-alphabet-strip">
                      {alphabetLetters.map((letter) => (
                        <button
                          type="button"
                          key={letter}
                          className="tnm-alphabet-letter"
                          onClick={() => scrollToLetter(letter)}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>

                    {alphabetLetters.length === 0 && <p className="tnm-hint">{t.termsMap.noResults}</p>}

                    {alphabetLetters.map((letter) => (
                      <div className="tnm-alphabet-group" id={`tnm-letter-${letter}`} key={letter}>
                        <h3>{letter}</h3>
                        <div className="tnm-term-chips">
                          {alphabetGroups[letter].map((term) => (
                            <button
                              type="button"
                              key={term.id}
                              className="tnm-term-chip"
                              onClick={() => openTerm(term.id)}
                            >
                              {toSentenceCase(term.kk)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsNetworkPage
