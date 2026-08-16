import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations'
import { scoreTier } from '../../utils/scoreTier.js'
import { useTestStats } from './useTestStats.js'

function categoryLabel(key, lang, t) {
  if (!key) return t.tests.setup.allCategories
  return CATEGORIES.find((cat) => cat.key === key)?.[lang] || key
}

function formatDate(isoString, lang) {
  return new Date(isoString).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatisticsPage() {
  const { lang, t } = useLanguage()
  const ts = t.statistics
  const { loading, summary, byCategory, recentAttempts } = useTestStats()

  return (
    <div className="account-home account-home-wide">
      <div className="account-card">
        <h1 className="account-title">{ts.title}</h1>
        <p className="account-description">{ts.subtitle}</p>
      </div>

      {loading ? (
        <p className="empty-state-text">{ts.loading}</p>
      ) : summary.totalAttempts === 0 ? (
        <div className="card">
          <p className="empty-state-text">{ts.empty}</p>
          <Link to="/account/tests" className="btn-auth-primary quiz-start-btn">
            {ts.startTest}
          </Link>
        </div>
      ) : (
        <>
          <div className="account-stats-grid">
            <div className="stat-tile">
              <span className="stat-value">{summary.totalAttempts}</span>
              <span className="stat-label">{ts.stats.totalAttempts}</span>
            </div>
            <div className="stat-tile">
              <span className={`stat-value stat-value--${scoreTier(summary.overallAccuracy)}`}>
                {summary.overallAccuracy}%
              </span>
              <span className="stat-label">{ts.stats.overallAccuracy}</span>
            </div>
            <div className="stat-tile">
              <span className={`stat-value stat-value--${scoreTier(summary.bestScore)}`}>
                {summary.bestScore}%
              </span>
              <span className="stat-label">{ts.stats.bestScore}</span>
            </div>
            <div className="stat-tile">
              <span className={`stat-value stat-value--${scoreTier(summary.averageScore)}`}>
                {summary.averageScore}%
              </span>
              <span className="stat-label">{ts.stats.averageScore}</span>
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="card">
              <h2>{ts.byCategory.title}</h2>
              <p className="account-description stats-section-hint">{ts.byCategory.hint}</p>
              <div className="category-stats-list">
                {byCategory.map((group) => (
                  <div className="category-stat-row" key={group.category}>
                    <div className="category-stat-head">
                      <span className="category-stat-label">
                        {categoryLabel(group.category, lang, t)}
                      </span>
                      <span className={`category-stat-percent category-stat-percent--${scoreTier(group.accuracy)}`}>
                        {group.accuracy}%
                      </span>
                    </div>
                    <div className="quiz-progress-track">
                      <div
                        className={`quiz-progress-fill quiz-progress-fill--${scoreTier(group.accuracy)}`}
                        style={{ width: `${group.accuracy}%` }}
                      />
                    </div>
                    <span className="category-stat-meta">
                      {ts.byCategory.attemptsCount(group.attempts)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2>{ts.recent.title}</h2>
            <div className="recent-attempts-list">
              {recentAttempts.map((attempt) => (
                <div className="recent-attempt-row" key={attempt.id}>
                  <div className="recent-attempt-main">
                    <span className="recent-attempt-category">
                      {categoryLabel(attempt.category, lang, t)}
                    </span>
                    <span className="recent-attempt-date">
                      {formatDate(attempt.created_at, lang)}
                    </span>
                  </div>
                  <span className={`recent-attempt-score recent-attempt-score--${scoreTier(attempt.score_percent)}`}>
                    {attempt.correct_answers}/{attempt.total_questions} · {attempt.score_percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default StatisticsPage
