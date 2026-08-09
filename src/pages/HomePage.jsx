import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../i18n/translations'
import { SECTION_IDS } from '../constants/navigation.js'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import { PlayButton, AiSpeakButton } from '../components/TermAudio.jsx'
import { toSentenceCase } from '../utils/textCase.js'

const DELETE_PASSWORD = 'termincom2026'
const MAX_SUGGESTIONS = 8

function startsWithQuery(text, query) {
  return text
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

const StepsSection = memo(function StepsSection({ t }) {
  return (
    <section className="steps-section">
      <div className="section-kicker" aria-hidden="true"></div>
      <h2 className="section-title">{t.steps.title}</h2>
      <div className="steps-grid steps-grid-2">
        {t.steps.items.map((step) => (
          <div className="step-card" key={step.n}>
            <span className="step-n">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
})

const AudienceSection = memo(function AudienceSection({ t }) {
  return (
    <section className="audience-section">
      <div className="section-kicker" aria-hidden="true"></div>
      <h2 className="section-title">{t.audience.title}</h2>
      <div className="audience-grid">
        {t.audience.items.map((a) => (
          <div className="audience-card" key={a.title}>
            <h3>{a.title}</h3>
            <p>{a.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
})

const DocsSection = memo(function DocsSection({ t }) {
  return (
    <section id="docs" className="section-static">
      <div className="card">
        <h2>{t.sections.docsTitle}</h2>
        <p className="empty-state-text">{t.sections.comingSoon}</p>
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
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ru: '', kk: '', en: '', category: '' })
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const tableRef = useRef(null)
  const searchWrapRef = useRef(null)

  const fetchTerms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .order('kk', { ascending: true })

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

  const handleCategoryChip = (key) => {
    setCategoryFilter((current) => (current === key ? '' : key))
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleDelete = async (term) => {
    const label = toSentenceCase(term.kk || term.ru || term.en)
    if (!window.confirm(t.confirm.deleteTerm(label))) {
      return
    }
    const password = window.prompt(t.confirm.deletePasswordPrompt)
    if (password === null) return
    if (password !== DELETE_PASSWORD) {
      setError(t.alerts.wrongPassword)
      return
    }

    const { error } = await supabase.from('terms').delete().eq('id', term.id)
    if (error) {
      setError(t.alerts.deleteFailed)
      return
    }
    setError('')
    await fetchTerms()
  }

  const handleEditStart = (term) => {
    setEditingId(term.id)
    setEditForm({ ru: term.ru, kk: term.kk, en: term.en, category: term.category || '' })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditForm({ ru: '', kk: '', en: '', category: '' })
  }

  const handleEditSave = async (id) => {
    const ru = editForm.ru.trim()
    const kk = editForm.kk.trim()
    const en = editForm.en.trim()
    const category = editForm.category
    if (!ru && !kk && !en) return

    const { error } = await supabase
      .from('terms')
      .update({ ru, kk, en, category })
      .eq('id', id)

    if (error) {
      setError(t.alerts.saveFailed)
      return
    }
    setError('')
    setEditingId(null)
    await fetchTerms()
  }

  const deferredSearch = useDeferredValue(search)

  const visibleTerms = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    let filtered = query
      ? terms.filter(
          (term) =>
            startsWithQuery(term.ru, query) ||
            startsWithQuery(term.kk, query) ||
            startsWithQuery(term.en, query),
        )
      : terms

    if (categoryFilter) {
      filtered = filtered.filter((term) => term.category === categoryFilter)
    }

    return [...filtered].sort((a, b) =>
      a.kk.localeCompare(b.kk, 'ru') ||
      a.ru.localeCompare(b.ru, 'ru') ||
      a.en.localeCompare(b.en, 'en'),
    )
  }, [terms, deferredSearch, categoryFilter])

  const searchSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    const matches = terms.filter(
      (term) =>
        startsWithQuery(term.ru, query) ||
        startsWithQuery(term.kk, query) ||
        startsWithQuery(term.en, query),
    )
    matches.sort((a, b) =>
      a.kk.localeCompare(b.kk, 'ru') ||
      a.ru.localeCompare(b.ru, 'ru') ||
      a.en.localeCompare(b.en, 'en'),
    )
    return matches.slice(0, MAX_SUGGESTIONS)
  }, [terms, search])

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const suggestionQuery = search.trim().toLowerCase()
  const showSuggestions = isSearchFocused && suggestionQuery.length > 0

  const handleSuggestionSelect = (term) => {
    setIsSearchFocused(false)
    navigate(`/terms/${term.id}`)
  }

  const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.[lang] || key

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection={activeTab} onSectionClick={handleNavClick} />
        <div className="home-content">
      {error && <div className="alert">{error}</div>}

      <section id="search" className="section-search">
        <div className="hero-glow" aria-hidden="true"></div>
        <div className="hero-search">
          <p className="hero-kicker">{t.hero.kicker}</p>
          <h2 className="hero-headline">{t.hero.headline}</h2>
          <p className="hero-lead">{t.hero.lead}</p>
          <div className="hero-search-box" ref={searchWrapRef}>
            <input
              type="search"
              className="hero-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t.hero.placeholder}
              aria-label={t.hero.searchAria}
              role="combobox"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
              aria-controls="search-suggestions"
            />
            {showSuggestions && (
              <ul className="search-suggestions" id="search-suggestions" role="listbox">
                {searchSuggestions.length === 0 ? (
                  <li className="search-suggestion-empty">{t.table.emptyNoResults}</li>
                ) : (
                  searchSuggestions.map((term) => (
                    <li key={term.id} role="option" aria-selected="false">
                      <button
                        type="button"
                        className="search-suggestion-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSuggestionSelect(term)}
                      >
                        <span className="search-suggestion-accent" aria-hidden="true"></span>
                        <span className="search-suggestion-text">
                          <span className="search-suggestion-primary">
                            <HighlightedText text={toSentenceCase(term.kk)} query={suggestionQuery} />
                          </span>
                          <span className="search-suggestion-secondary">
                            <HighlightedText text={toSentenceCase(term.ru)} query={suggestionQuery} />
                            {' · '}
                            <HighlightedText text={toSentenceCase(term.en)} query={suggestionQuery} />
                          </span>
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div className="hero-meta">
            <span>
              {search.trim() ? t.hero.found(visibleTerms.length) : t.hero.total(terms.length)}
            </span>
            <span className="hero-meta-divider" aria-hidden="true"></span>
            <span className="hero-coords">KZ · 48°N 68°E</span>
          </div>
        </div>

        <div className="category-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`chip${categoryFilter === cat.key ? ' active' : ''}`}
              onClick={() => handleCategoryChip(cat.key)}
            >
              {cat[lang]}
            </button>
          ))}
        </div>

        <div className="card" ref={tableRef}>
          <div className="table-toolbar">
            <h2>{t.table.heading(terms.length)}</h2>
            <select
              className="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label={t.table.filterAria}
            >
              <option value="">{t.table.allCategories}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            <table className="terms-table">
              <thead>
                <tr>
                  <th>{t.langNames.kk}</th>
                  <th>{t.langNames.ru}</th>
                  <th>{t.langNames.en}</th>
                  <th>{t.form.categoryLabel}</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="empty-state" colSpan={5}>
                      {t.table.loading}
                    </td>
                  </tr>
                )}
                {!loading && visibleTerms.length === 0 && (
                  <tr>
                    <td className="empty-state" colSpan={5}>
                      {terms.length === 0 ? t.table.emptyNoTerms : t.table.emptyNoResults}
                    </td>
                  </tr>
                )}
                {!loading &&
                  visibleTerms.map((term) => {
                    const isEditing = editingId === term.id
                    return (
                      <tr key={term.id}>
                        {isEditing ? (
                          <>
                            <td>
                              <input
                                className="row-input"
                                value={editForm.kk}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, kk: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="row-input"
                                value={editForm.ru}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, ru: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="row-input"
                                value={editForm.en}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, en: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <select
                                className="row-input"
                                value={editForm.category}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, category: e.target.value })
                                }
                              >
                                <option value="">{t.form.noCategory}</option>
                                {CATEGORIES.map((cat) => (
                                  <option key={cat.key} value={cat.key}>
                                    {cat[lang]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="col-actions">
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="btn-save"
                                  onClick={() => handleEditSave(term.id)}
                                >
                                  {t.table.save}
                                </button>
                                <button
                                  type="button"
                                  className="btn-cancel"
                                  onClick={handleEditCancel}
                                >
                                  {t.table.cancel}
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <span className="cell-text">{toSentenceCase(term.kk)}</span>
                              <PlayButton src={term.audio_kk} label={toSentenceCase(term.kk)} t={t} />
                              {!term.audio_kk && (
                                <AiSpeakButton text={toSentenceCase(term.kk)} lang="kk-KZ" t={t} />
                              )}
                            </td>
                            <td>
                              <span className="cell-text">{toSentenceCase(term.ru)}</span>
                              <PlayButton src={term.audio_ru} label={toSentenceCase(term.ru)} t={t} />
                              {!term.audio_ru && (
                                <AiSpeakButton text={toSentenceCase(term.ru)} lang="ru-RU" t={t} />
                              )}
                            </td>
                            <td>
                              <span className="cell-text">{toSentenceCase(term.en)}</span>
                              <PlayButton src={term.audio_en} label={toSentenceCase(term.en)} t={t} />
                              {!term.audio_en && (
                                <AiSpeakButton text={toSentenceCase(term.en)} lang="en-US" t={t} />
                              )}
                            </td>
                            <td>
                              {term.category ? (
                                <span className="category-badge">
                                  {categoryLabel(term.category)}
                                </span>
                              ) : (
                                <span className="cell-text">—</span>
                              )}
                            </td>
                            <td className="col-actions">
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="btn-edit"
                                  onClick={() => handleEditStart(term)}
                                  aria-label={t.table.editAria(
                                    toSentenceCase(term.kk || term.ru || term.en),
                                  )}
                                >
                                  {t.table.edit}
                                </button>
                                <button
                                  type="button"
                                  className="btn-delete"
                                  onClick={() => handleDelete(term)}
                                  aria-label={t.table.deleteAria(
                                    toSentenceCase(term.kk || term.ru || term.en),
                                  )}
                                >
                                  {t.table.delete}
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <StepsSection t={t} />
      <AudienceSection t={t} />
      <DocsSection t={t} />
        </div>
      </div>

      <Footer />
    </>
  )
}

export default HomePage
