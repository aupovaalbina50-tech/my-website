import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../i18n/translations'
import { categoryIcon } from '../constants/categoryIcons.js'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import { PlayButton, AiSpeakButton } from '../components/TermAudio.jsx'
import { toSentenceCase } from '../utils/textCase.js'
import { useFavoriteTerms } from './account/useFavoriteTerms.js'

function TermDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang, t } = useLanguage()
  const { user } = useAuth()
  const [term, setTerm] = useState(null)
  const [loading, setLoading] = useState(true)
  const recordedIdRef = useRef(null)
  const { favoriteIds, toggleFavorite } = useFavoriteTerms()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setTerm(data)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!user || !term || recordedIdRef.current === term.id) return
    recordedIdRef.current = term.id
    supabase
      .from('term_views')
      .upsert(
        { user_id: user.id, term_id: term.id, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,term_id' },
      )
  }, [user, term])

  const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.[lang] || key

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="search" onSectionClick={() => {}} />
        <div className="home-content">
          <div className="quote-detail-nav no-print">
            <button type="button" className="quote-back-link" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} aria-hidden="true" />
              {t.termDetail.back}
            </button>
          </div>

          {loading && (
            <div className="card">
              <p className="empty-state-text">{t.termDetail.loading}</p>
            </div>
          )}

          {!loading && !term && (
            <div className="card">
              <p className="empty-state-text">{t.termDetail.notFound}</p>
            </div>
          )}

          {!loading && term && (
            <article className="card term-detail-card">
              <div className="term-detail-icon" aria-hidden="true">
                {categoryIcon(term.category)}
              </div>
              <h1 className="term-detail-title">
                {toSentenceCase(term.kk || term.ru || term.en)}
                <PlayButton src={term.audio_kk} label={toSentenceCase(term.kk)} t={t} />
                {!term.audio_kk && term.kk && (
                  <AiSpeakButton text={toSentenceCase(term.kk)} lang="kk-KZ" t={t} />
                )}
                <button
                  type="button"
                  className={`quote-icon-btn term-fav-btn${favoriteIds.has(term.id) ? ' active' : ''}`}
                  onClick={() => toggleFavorite(term)}
                  aria-label={
                    favoriteIds.has(term.id) ? t.termDetail.favoriteRemove : t.termDetail.favoriteAdd
                  }
                  title={
                    favoriteIds.has(term.id) ? t.termDetail.favoriteRemove : t.termDetail.favoriteAdd
                  }
                  aria-pressed={favoriteIds.has(term.id)}
                >
                  <Star size={18} aria-hidden="true" fill={favoriteIds.has(term.id) ? 'currentColor' : 'none'} />
                </button>
              </h1>

              <dl className="term-detail-fields">
                <div className="term-detail-field">
                  <dt>{t.langNames.ru}</dt>
                  <dd>
                    <span className="cell-text">{toSentenceCase(term.ru) || '—'}</span>
                    <PlayButton src={term.audio_ru} label={toSentenceCase(term.ru)} t={t} />
                    {!term.audio_ru && term.ru && (
                      <AiSpeakButton text={toSentenceCase(term.ru)} lang="ru-RU" t={t} />
                    )}
                  </dd>
                </div>
                <div className="term-detail-field">
                  <dt>{t.langNames.en}</dt>
                  <dd>
                    <span className="cell-text">{toSentenceCase(term.en) || '—'}</span>
                    <PlayButton src={term.audio_en} label={toSentenceCase(term.en)} t={t} />
                    {!term.audio_en && term.en && (
                      <AiSpeakButton text={toSentenceCase(term.en)} lang="en-US" t={t} />
                    )}
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
            </article>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermDetailPage
