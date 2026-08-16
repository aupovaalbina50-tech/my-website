import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, List, Star } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../i18n/translations'
import { categoryLucideIcon } from '../constants/categoryIcons.js'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import { PlayButton, AiSpeakButton } from '../components/TermAudio.jsx'
import { toSentenceCase } from '../utils/textCase.js'
import { useFavoriteTerms } from './account/useFavoriteTerms.js'

function TermsListPage() {
  const { key } = useParams()
  const navigate = useNavigate()
  const { lang, t } = useLanguage()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ru: '', kk: '', en: '', category: '' })
  const { favoriteIds, toggleFavorite } = useFavoriteTerms()

  const category = useMemo(() => (key ? CATEGORIES.find((c) => c.key === key) : null), [key])
  const Icon = key ? categoryLucideIcon(key) : List
  const categoryNotFound = Boolean(key) && !category

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
    if (key) query = query.eq('category', key)

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
  }, [key, categoryNotFound])

  const categoryLabel = (catKey) => CATEGORIES.find((c) => c.key === catKey)?.[lang] || catKey

  const handleDelete = async (term) => {
    const label = toSentenceCase(term.kk || term.ru || term.en)
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
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection={key ? '' : 'terms'} onSectionClick={() => {}} />
        <div className="home-content">
          <section className="terms-list-section">
            {error && <div className="alert">{error}</div>}

            <button type="button" className="quote-back-link" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} aria-hidden="true" />
              {t.termsList.back}
            </button>

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
                    <h1 className="terms-list-title">{category ? category[lang] : t.termsList.allTitle}</h1>
                    <p className="terms-list-count">
                      {loading ? t.table.loading : t.categorySection.count(terms.length)}
                    </p>
                  </div>
                </div>

                <div className="card">
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
                        {!loading && terms.length === 0 && (
                          <tr>
                            <td className="empty-state" colSpan={5}>
                              {category ? t.termsList.empty : t.table.emptyNoTerms}
                            </td>
                          </tr>
                        )}
                        {!loading &&
                          terms.map((term) => {
                            const isEditing = editingId === term.id
                            return (
                              <tr key={term.id}>
                                {isEditing ? (
                                  <>
                                    <td>
                                      <input
                                        className="row-input"
                                        value={editForm.kk}
                                        onChange={(e) => setEditForm({ ...editForm, kk: e.target.value })}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className="row-input"
                                        value={editForm.ru}
                                        onChange={(e) => setEditForm({ ...editForm, ru: e.target.value })}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className="row-input"
                                        value={editForm.en}
                                        onChange={(e) => setEditForm({ ...editForm, en: e.target.value })}
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
                                      <button
                                        type="button"
                                        className="cell-text cell-text-link"
                                        onClick={() => navigate(`/terms/${term.id}`)}
                                      >
                                        {toSentenceCase(term.kk)}
                                      </button>
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
                                        <span className="category-badge">{categoryLabel(term.category)}</span>
                                      ) : (
                                        <span className="cell-text">—</span>
                                      )}
                                    </td>
                                    <td className="col-actions">
                                      <div className="row-actions">
                                        <button
                                          type="button"
                                          className={`quote-icon-btn term-fav-btn${
                                            favoriteIds.has(term.id) ? ' active' : ''
                                          }`}
                                          onClick={() => toggleFavorite(term)}
                                          aria-label={
                                            favoriteIds.has(term.id)
                                              ? t.termDetail.favoriteRemoveAria(
                                                  toSentenceCase(term.kk || term.ru || term.en),
                                                )
                                              : t.termDetail.favoriteAddAria(
                                                  toSentenceCase(term.kk || term.ru || term.en),
                                                )
                                          }
                                          title={
                                            favoriteIds.has(term.id)
                                              ? t.termDetail.favoriteRemove
                                              : t.termDetail.favoriteAdd
                                          }
                                          aria-pressed={favoriteIds.has(term.id)}
                                        >
                                          <Star
                                            size={16}
                                            aria-hidden="true"
                                            fill={favoriteIds.has(term.id) ? 'currentColor' : 'none'}
                                          />
                                        </button>
                                        {isAdmin && (
                                          <>
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
                                          </>
                                        )}
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
              </>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsListPage
