import { useNavigate } from 'react-router-dom'
import { BookmarkPlus, MousePointerClick, Star } from 'lucide-react'
import SectionIntro from '../../components/SectionIntro.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations'
import { useFavoriteTerms } from './useFavoriteTerms.js'
import { toSentenceCase } from '../../utils/textCase.js'

function MyDictionaryPage() {
  const { lang, t } = useLanguage()
  const navigate = useNavigate()
  const { terms, loading, toggleFavorite } = useFavoriteTerms()

  const categoryLabel = (catKey) => CATEGORIES.find((c) => c.key === catKey)?.[lang] || catKey

  return (
    <div className="account-home">
      <div>
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{t.termFavorites.pageTitle}</h1>
        <SectionIntro
          lead={t.termFavorites.introLead}
          steps={[
            { icon: BookmarkPlus, ...t.termFavorites.introSteps[0], onClick: () => navigate('/account/terms') },
            { icon: MousePointerClick, ...t.termFavorites.introSteps[1], target: '.terms-table' },
            { icon: Star, ...t.termFavorites.introSteps[2], target: '.terms-table' },
          ]}
        />
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
                    {t.termFavorites.loading}
                  </td>
                </tr>
              )}
              {!loading && terms.length === 0 && (
                <tr>
                  <td className="empty-state" colSpan={5}>
                    {t.termFavorites.empty}
                  </td>
                </tr>
              )}
              {!loading &&
                terms.map((term) => (
                  <tr key={term.id}>
                    <td>
                      <button
                        type="button"
                        className="cell-text cell-text-link"
                        onClick={() => navigate(`/account/terms/${term.id}`)}
                      >
                        {toSentenceCase(term.kk)}
                      </button>
                    </td>
                    <td>
                      <span className="cell-text">{toSentenceCase(term.ru)}</span>
                    </td>
                    <td>
                      <span className="cell-text">{toSentenceCase(term.en)}</span>
                    </td>
                    <td>
                      {term.category ? (
                        <span className="category-badge">{categoryLabel(term.category)}</span>
                      ) : (
                        <span className="cell-text">—</span>
                      )}
                    </td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="quote-icon-btn term-fav-btn active"
                        onClick={() => toggleFavorite(term)}
                        aria-label={t.termDetail.favoriteRemoveAria(
                          toSentenceCase(term[lang] || term.ru || term.kk || term.en),
                        )}
                        title={t.termDetail.favoriteRemove}
                        aria-pressed="true"
                      >
                        <Star size={16} aria-hidden="true" fill="currentColor" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MyDictionaryPage
