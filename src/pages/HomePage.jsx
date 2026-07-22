import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../i18n/translations'
import { COMMITTEES, COMMITTEES_SOURCE_URL } from '../data/committees'
import {
  MINISTRY_MISSION,
  MINISTRY_HISTORY,
  MINISTRY_LEADERSHIP,
  MINISTRY_CONTACTS,
  MINISTRY_SOURCES,
} from '../data/ministry'
import { SECTION_IDS } from '../constants/navigation.js'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'

const DELETE_PASSWORD = 'termincom2026'

function PlayButton({ src, label, t }) {
  if (!src) return null
  return (
    <button
      type="button"
      className="btn-play"
      onClick={() => new Audio(src).play()}
      aria-label={t.table.playAria(label)}
      title={t.table.playTitle}
    >
      🔊
    </button>
  )
}

function speakText(text, lang) {
  if (!text || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  const voices = window.speechSynthesis.getVoices()
  const voice =
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)))
  if (voice) utterance.voice = voice
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function AiSpeakButton({ text, lang, t }) {
  if (!text) return null
  return (
    <button
      type="button"
      className="btn-ai-play"
      onClick={() => speakText(text, lang)}
      aria-label={t.table.aiAria(text)}
      title={t.table.aiTitle}
    >
      🤖
    </button>
  )
}

function CommitteeModal({ committee, lang, t, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!committee) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={committee.name[lang]}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label={t.committees.closeButton}
        >
          ✕
        </button>
        <h3>{committee.name[lang]}</h3>
        <p className="modal-description">{committee.description[lang]}</p>

        <div className="modal-meta">
          <div className="modal-meta-row">
            <span className="modal-meta-label">{t.committees.chairLabel}</span>
            <span>{committee.chair[lang]}</span>
          </div>
          {committee.phone && (
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.committees.phoneLabel}</span>
              <span>{committee.phone[lang]}</span>
            </div>
          )}
          {committee.email && (
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.committees.emailLabel}</span>
              <span>{committee.email}</span>
            </div>
          )}
          {!committee.phone && !committee.email && (
            <p className="modal-meta-empty">{t.committees.noContact}</p>
          )}
        </div>

        <a
          className="modal-source-link"
          href={COMMITTEES_SOURCE_URL[lang]}
          target="_blank"
          rel="noreferrer"
        >
          {t.committees.sourceLabel}: {t.committees.sourceLinkText} ↗
        </a>
      </div>
    </div>
  )
}

function HomePage() {
  const { lang, t } = useLanguage()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('search')
  const [activeCommittee, setActiveCommittee] = useState(null)
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ru: '', kk: '', en: '', category: '' })
  const tableRef = useRef(null)

  const fetchTerms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .order('ru', { ascending: true })

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

  const handleNavClick = (id) => {
    setActiveTab(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCategoryChip = (key) => {
    setCategoryFilter((current) => (current === key ? '' : key))
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleDelete = async (term) => {
    const label = term.ru || term.kk || term.en
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

  const visibleTerms = useMemo(() => {
    const query = search.trim().toLowerCase()
    let filtered = query
      ? terms.filter(
          (term) =>
            term.ru.toLowerCase().includes(query) ||
            term.kk.toLowerCase().includes(query) ||
            term.en.toLowerCase().includes(query),
        )
      : terms

    if (categoryFilter) {
      filtered = filtered.filter((term) => term.category === categoryFilter)
    }

    return [...filtered].sort((a, b) =>
      a.ru.localeCompare(b.ru, 'ru') ||
      a.kk.localeCompare(b.kk, 'ru') ||
      a.en.localeCompare(b.en, 'en'),
    )
  }, [terms, search, categoryFilter])

  const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.[lang] || key

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection={activeTab} onSectionClick={handleNavClick} />
        <div className="home-content">
      {error && <div className="alert">{error}</div>}

      <section id="search" className="section-search">
        <div className="hero-topo" aria-hidden="true"></div>
        <div className="hero-search">
          <p className="hero-kicker">{t.hero.kicker}</p>
          <h2 className="hero-headline">{t.hero.headline}</h2>
          <p className="hero-lead">{t.hero.lead}</p>
          <input
            type="search"
            className="hero-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.hero.placeholder}
            aria-label={t.hero.searchAria}
          />
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
                  <th>{t.langNames.ru}</th>
                  <th>{t.langNames.kk}</th>
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
                                value={editForm.ru}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, ru: e.target.value })
                                }
                              />
                            </td>
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
                              <span className="cell-text">{term.ru}</span>
                              <PlayButton src={term.audio_ru} label={term.ru} t={t} />
                              {!term.audio_ru && (
                                <AiSpeakButton text={term.ru} lang="ru-RU" t={t} />
                              )}
                            </td>
                            <td>
                              <span className="cell-text">{term.kk}</span>
                              <PlayButton src={term.audio_kk} label={term.kk} t={t} />
                            </td>
                            <td>
                              <span className="cell-text">{term.en}</span>
                              <PlayButton src={term.audio_en} label={term.en} t={t} />
                              {!term.audio_en && (
                                <AiSpeakButton text={term.en} lang="en-US" t={t} />
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
                                  aria-label={t.table.editAria(term.ru || term.kk || term.en)}
                                >
                                  {t.table.edit}
                                </button>
                                <button
                                  type="button"
                                  className="btn-delete"
                                  onClick={() => handleDelete(term)}
                                  aria-label={t.table.deleteAria(term.ru || term.kk || term.en)}
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

      <section id="quotes" className="section-static">
        <div className="card">
          <h2>{t.sections.quotesTitle}</h2>
          <p className="empty-state-text">{t.sections.comingSoon}</p>
        </div>
      </section>

      <section id="ministry" className="section-ministry">
        <div className="section-kicker" aria-hidden="true"></div>
        <h2 className="section-title">{t.sections.ministryTitle}</h2>

        <div className="card">
          <h3 className="ministry-subtitle">{t.ministry.missionTitle}</h3>
          <p className="ministry-mission">{MINISTRY_MISSION[lang]}</p>
          <a
            className="modal-source-link"
            href={MINISTRY_SOURCES.gov[lang]}
            target="_blank"
            rel="noreferrer"
          >
            {t.ministry.sourceGovText}
          </a>
        </div>

        <div className="ministry-block">
          <h3 className="ministry-subtitle">{t.ministry.historyTitle}</h3>
          <div className="steps-grid">
            {MINISTRY_HISTORY.map((item) => (
              <div className="step-card" key={item.year}>
                <span className="step-n">{item.year}</span>
                <p>{item[lang]}</p>
              </div>
            ))}
          </div>
          <a
            className="modal-source-link"
            href={MINISTRY_SOURCES.wikipedia}
            target="_blank"
            rel="noreferrer"
          >
            {t.ministry.sourceWikiText}
          </a>
        </div>

        <div className="ministry-block">
          <h3 className="ministry-subtitle">{t.ministry.leadershipTitle}</h3>
          <div className="committees-grid">
            {MINISTRY_LEADERSHIP.map((person) => (
              <div className="committee-card leader-card" key={person.id}>
                <h3>{person.name[lang]}</h3>
                <p className="leader-role">{person.role[lang]}</p>
                {person.areas && (
                  <p className="leader-areas">
                    {t.ministry.areasLabel}: {person.areas[lang]}
                  </p>
                )}
                <span className="committee-chair">
                  {t.committees.phoneLabel}: {person.phone}
                </span>
                <span className="committee-chair">
                  {t.committees.emailLabel}: {person.email}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card ministry-contacts">
          <h3 className="ministry-subtitle">{t.ministry.contactsTitle}</h3>
          <div className="modal-meta">
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.ministry.addressLabel}</span>
              <span>{MINISTRY_CONTACTS.address[lang]}</span>
            </div>
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.committees.emailLabel}</span>
              <span>{MINISTRY_CONTACTS.email}</span>
            </div>
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.ministry.officeLabel}</span>
              <span>{MINISTRY_CONTACTS.office}</span>
            </div>
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.ministry.trustLineLabel}</span>
              <span>{MINISTRY_CONTACTS.trustLine}</span>
            </div>
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.ministry.pressLabel}</span>
              <span>{MINISTRY_CONTACTS.press}</span>
            </div>
            <div className="modal-meta-row">
              <span className="modal-meta-label">{t.ministry.emergencyLabel}</span>
              <span>{MINISTRY_CONTACTS.emergency}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="committees" className="section-committees">
        <div className="section-kicker" aria-hidden="true"></div>
        <h2 className="section-title">{t.committees.title}</h2>
        <p className="section-lead">{t.committees.lead}</p>
        <div className="committees-grid">
          {COMMITTEES.map((committee) => (
            <button
              type="button"
              className="committee-card"
              key={committee.id}
              onClick={() => setActiveCommittee(committee)}
            >
              <h3>{committee.name[lang]}</h3>
              <p>{committee.description[lang]}</p>
              <span className="committee-chair">
                {t.committees.chairLabel}: {committee.chair[lang]}
              </span>
              <span className="committee-more">{t.committees.detailsButton} →</span>
            </button>
          ))}
        </div>
      </section>

      <section id="docs" className="section-static">
        <div className="card">
          <h2>{t.sections.docsTitle}</h2>
          <p className="empty-state-text">{t.sections.comingSoon}</p>
        </div>
      </section>
        </div>
      </div>

      <Footer />

      <CommitteeModal
        committee={activeCommittee}
        lang={lang}
        t={t}
        onClose={() => setActiveCommittee(null)}
      />
    </>
  )
}

export default HomePage
