import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations'
import { useRecentTerms } from './useRecentTerms.js'
import { toSentenceCase } from '../../utils/textCase.js'

function RecentlyViewedTermsPage() {
  const { lang, t } = useLanguage()
  const navigate = useNavigate()
  const { terms, loading } = useRecentTerms()

  const categoryLabel = (catKey) => CATEGORIES.find((c) => c.key === catKey)?.[lang] || catKey

  return (
    <div className="account-home">
      <div className="account-card">
        <h1 className="account-title">{t.account.sidebar.viewingHistory}</h1>
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
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="empty-state" colSpan={4}>
                    {t.table.loading}
                  </td>
                </tr>
              )}
              {!loading && terms.length === 0 && (
                <tr>
                  <td className="empty-state" colSpan={4}>
                    {t.termsList.emptyViewed}
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
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RecentlyViewedTermsPage
