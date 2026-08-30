import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap, List, Search as SearchIcon, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations'
import { categoryLucideIcon } from '../../constants/categoryIcons.js'
import { CopyButton } from '../../components/CopyButton.jsx'
import { toSentenceCase } from '../../utils/textCase.js'
import { useFavoriteTerms } from '../account/useFavoriteTerms.js'

function AllTermsContent({
  categoryKey = null,
  showBack = true,
  showSearch = true,
  termBasePath = '/terms',
}) {
  const navigate = useNavigate()
  const { lang, t } = useLanguage()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ru: '', kk: '', en: '', category: '' })
  const { favoriteIds, toggleFavorite } = useFavoriteTerms()

  const category = useMemo(
    () => (categoryKey ? CATEGORIES.find((c) => c.key === categoryKey) : null),
    [categoryKey],
  )
  const Icon = categoryKey ? categoryLucideIcon(categoryKey) : List
  const categoryNotFound = Boolean(categoryKey) && !category

  const fetchTerms = async () => {
    if (categoryNotFound) {
      setTerms([])
      setLoading(false)
      return
    }
    setLoading(true)
    let query = supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .order('kk', { ascending: true })
    if (categoryKey) query = query.eq('category', categoryKey)

    const { data, error: fetchError } = await query
    if (fetchError) {
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
  }, [categoryKey, categoryNotFound])

  useEffect(() => {
    setSearch('')
  }, [categoryKey])

  const query = search.trim().toLowerCase()
  const visibleTerms = useMemo(() => {
    if (!query) return terms
    return terms.filter(
      (term) =>
        term.kk?.toLowerCase().includes(query) ||
        term.ru?.toLowerCase().includes(query) ||
        term.en?.toLowerCase().includes(query),
    )
  }, [terms, query])

  const displayedTerms = visibleTerms

  const headerCount = displayedTerms.length

  const categoryLabel = (catKey) => CATEGORIES.find((c) => c.key === catKey)?.[lang] || catKey

  const handleDelete = async (term) => {
    const label = toSentenceCase(term[lang] || term.ru || term.kk || term.en)
    if (!window.confirm(t.confirm.deleteTerm(label))) return

    const { error: deleteError } = await supabase.from('terms').delete().eq('id', term.id)
    if (deleteError) {
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
    const editCategory = editForm.category
    if (!ru && !kk && !en) return

    const { error: saveError } = await supabase
      .from('terms')
      .update({ ru, kk, en, category: editCategory })
      .eq('id', id)

    if (saveError) {
      setError(t.alerts.saveFailed)
      return
    }
    setError('')
    setEditingId(null)
    await fetchTerms()
  }

  return (
    <section className="terms-list-section">
      {error && <div className="alert">{error}</div>}

      {showBack && (
        <button type="button" className="quote-back-link" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} aria-hidden="true" />
          {t.termsList.back}
        </button>
      )}

      {categoryNotFound ? (
        <div className="card">
          <p className="empty-state-text">{t.termsList.notFoundCategory}</p>
        </div>
      ) : (
        <>
          <div className="terms-list-header">
            <span className="terms-list-icon" aria-hidden="true">
              <Icon strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="terms-list-title">
                {category ? category[lang] : t.termsList.allTitle}
              </h1>
              <p className="terms-list-count">
                {loading ? t.table.loading : t.categorySection.count(headerCount)}
              </p>
            </div>
          </div>

          {showSearch && (
            <div className="tnm-search-box terms-list-search">
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
          )}

          <div className="term-entries-card">
            {loading && (
              <div className="card">
                <p className="empty-state-text">{t.table.loading}</p>
              </div>
            )}
            {!loading && displayedTerms.length === 0 && (
              <div className="card">
                <p className="empty-state-text">
                  {query ? t.termsMap.noResults : category ? t.termsList.empty : t.table.emptyNoTerms}
                </p>
              </div>
            )}
            {!loading && displayedTerms.length > 0 && (
              <ul className="term-entries">
                {displayedTerms.map((term) => {
                  const isEditing = editingId === term.id
                  const label = toSentenceCase(term[lang] || term.ru || term.kk || term.en)

                  if (isEditing) {
                    return (
                      <li key={term.id} className="term-entry term-entry-editing">
                        <div className="term-entry-edit-grid">
                          <label className="term-entry-edit-field">
                            <span>{t.langNames.kk}</span>
                            <input
                              className="row-input"
                              value={editForm.kk}
                              onChange={(e) => setEditForm({ ...editForm, kk: e.target.value })}
                            />
                          </label>
                          <label className="term-entry-edit-field">
                            <span>{t.langNames.ru}</span>
                            <input
                              className="row-input"
                              value={editForm.ru}
                              onChange={(e) => setEditForm({ ...editForm, ru: e.target.value })}
                            />
                          </label>
                          <label className="term-entry-edit-field">
                            <span>{t.langNames.en}</span>
                            <input
                              className="row-input"
                              value={editForm.en}
                              onChange={(e) => setEditForm({ ...editForm, en: e.target.value })}
                            />
                          </label>
                          <label className="term-entry-edit-field">
                            <span>{t.form.categoryLabel}</span>
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
                          </label>
                        </div>
                        <div className="term-entry-edit-actions">
                          <button
                            type="button"
                            className="btn-save"
                            onClick={() => handleEditSave(term.id)}
                          >
                            {t.table.save}
                          </button>
                          <button type="button" className="btn-cancel" onClick={handleEditCancel}>
                            {t.table.cancel}
                          </button>
                        </div>
                      </li>
                    )
                  }

                  return (
                    <li key={term.id} className="term-entry">
                      <span className="term-entry-corner-actions">
                        <button
                          type="button"
                          className={`quote-icon-btn term-fav-btn${
                            favoriteIds.has(term.id) ? ' active' : ''
                          }`}
                          onClick={() => toggleFavorite(term)}
                          aria-label={
                            favoriteIds.has(term.id)
                              ? t.termDetail.favoriteRemoveAria(label)
                              : t.termDetail.favoriteAddAria(label)
                          }
                          title={
                            favoriteIds.has(term.id)
                              ? t.termDetail.favoriteRemove
                              : t.termDetail.favoriteAdd
                          }
                          aria-pressed={favoriteIds.has(term.id)}
                        >
                          <GraduationCap size={18} aria-hidden="true" />
                        </button>
                        <CopyButton
                          text={toSentenceCase(term[lang] || term.ru || term.kk || term.en)}
                          label={label}
                          t={t}
                        />
                      </span>

                      <dl className="term-detail-fields">
                        <div className="term-detail-field">
                          <dt>{t.langNames.kk}</dt>
                          <dd>
                            <button
                              type="button"
                              className="cell-text cell-text-link"
                              onClick={() => navigate(`${termBasePath}/${term.id}`)}
                            >
                              {toSentenceCase(term.kk)}
                            </button>
                          </dd>
                        </div>
                        <div className="term-detail-field">
                          <dt>{t.langNames.ru}</dt>
                          <dd>
                            <span className="cell-text">{toSentenceCase(term.ru) || '—'}</span>
                          </dd>
                        </div>
                        <div className="term-detail-field">
                          <dt>{t.langNames.en}</dt>
                          <dd>
                            <span className="cell-text">{toSentenceCase(term.en) || '—'}</span>
                          </dd>
                        </div>
                        <div className="term-detail-field">
                          <dt>{t.form.categoryLabel}</dt>
                          <dd>
                            {term.category ? (
                              <span className="category-badge">{categoryLabel(term.category)}</span>
                            ) : (
                              <span className="cell-text">{t.form.noCategory}</span>
                            )}
                          </dd>
                        </div>
                      </dl>

                      {isAdmin && (
                        <div className="term-entry-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => handleEditStart(term)}
                            aria-label={t.table.editAria(label)}
                          >
                            {t.table.edit}
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleDelete(term)}
                            aria-label={t.table.deleteAria(label)}
                          >
                            {t.table.delete}
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default AllTermsContent
