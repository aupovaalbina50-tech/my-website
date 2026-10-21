import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FolderOpen,
  BookOpen,
  LayoutGrid,
  ALargeSmall,
  Share2,
  Landmark,
  Quote,
  UserCircle,
  Search,
  Eye,
  Wrench,
  Library,
  Target,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import ActivityPanel from './ActivityPanel.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations'
import { MISSIONS, TOTAL_MISSIONS } from '../../data/missions.js'
import AuthCard from './auth/AuthCard.jsx'
import { useRecentTerms } from './useRecentTerms.js'
import { useMastery } from './useMastery.js'
import { useMissionsProgress } from './useMissionsProgress.js'
import DashboardTermSearch from '../shared/DashboardTermSearch.jsx'
import { toSentenceCase } from '../../utils/textCase.js'

const TOOL_LINKS = [
  { key: 'terms', to: '/account/terms', Icon: BookOpen },
  { key: 'categories', to: '/account/categories', Icon: LayoutGrid },
  { key: 'alphabet', to: '/account/alphabet', Icon: ALargeSmall },
  { key: 'network', to: '/account/network', Icon: Share2 },
]

const MATERIAL_LINKS = [
  { key: 'workspace', to: '/account/workspace', Icon: FolderOpen },
  { key: 'committees', to: '/account/committees', Icon: Landmark },
  { key: 'quotes', to: '/quotes', Icon: Quote },
]

const GOAL_STEP = 5

function AccountHomePage() {
  const { isAuthenticated, loading, user, profile } = useAuth()
  const { lang, t } = useLanguage()
  const navigate = useNavigate()
  const m = t.account.home.mastery
  const act = t.account.home.activity

  useEffect(() => {
    document.body.classList.add('account-light-theme')
    return () => document.body.classList.remove('account-light-theme')
  }, [])

  const { terms: recentTerms, loading: recentLoading } = useRecentTerms()
  const { masteredIds } = useMastery()
  const { missionState, completedCount: missionsCompletedCount, loading: missionsLoading } = useMissionsProgress()

  const masteredCount = masteredIds.size

  const missionTermsTotal = useMemo(() => MISSIONS.reduce((sum, mission) => sum + mission.requiredTerms, 0), [])
  // Terms studied in missions, each counted once per mission (up to its
  // required number), whether or not the mission is finished yet.
  const missionTermsStudied = useMemo(
    () => Object.values(missionState).reduce((sum, s) => sum + s.studied, 0),
    [missionState],
  )
  const missionAvgScore = useMemo(() => {
    const scores = Object.values(missionState)
      .filter((s) => s.status === 'completed' && s.score !== null)
      .map((s) => s.score)
    if (scores.length === 0) return null
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [missionState])

  const goalWindowProgress = masteredCount % GOAL_STEP
  const goalRemaining = goalWindowProgress === 0 ? GOAL_STEP : GOAL_STEP - goalWindowProgress
  const goalPercent = Math.round(((GOAL_STEP - goalRemaining) / GOAL_STEP) * 100)

  if (loading) {
    return <div className="auth-page" aria-busy="true" />
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <AuthCard />
      </div>
    )
  }

  const displayName = profile?.first_name || user?.email || ''
  const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.[lang] || key

  const renderTermCard = (term, basePath) => (
    <button
      key={term.id}
      type="button"
      className="dash-recent-card"
      onClick={() => navigate(`${basePath}/${term.id}`)}
    >
      <span className="dash-recent-card-top">
        <span className="dash-recent-card-lang">{t.langNames[lang]}</span>
        {term.category && <span className="category-badge">{categoryLabel(term.category)}</span>}
      </span>
      <span className="dash-recent-card-name">
        {toSentenceCase(term[lang] || term.ru || term.kk || term.en)}
      </span>
      <ArrowRight className="dash-recent-card-arrow" size={16} aria-hidden="true" />
    </button>
  )

  return (
    <div className="dash-page">
      <div className="dash-hero">
        <span className="dash-hero-avatar" aria-hidden="true">
          <UserCircle size={28} />
        </span>
        <div className="dash-hero-text">
          <h1 className="dash-hero-title">{t.account.home.pageTitle}</h1>
          <p className="dash-hero-greeting">{t.account.home.greeting(displayName)}</p>
        </div>
      </div>

      <ActivityPanel
        metrics={[
          { key: 'missions', label: act.missions, value: missionsLoading ? null : missionsCompletedCount, caption: act.of(TOTAL_MISSIONS) },
          { key: 'terms', label: act.terms, value: missionsLoading ? null : missionTermsStudied, caption: act.of(missionTermsTotal) },
          { key: 'avg', label: act.avgScore, value: missionsLoading || missionAvgScore === null ? null : `${missionAvgScore}%` },
          // Each mission grants its achievement on the first completion.
          { key: 'achievements', label: act.achievements, value: missionsLoading ? null : missionsCompletedCount, caption: act.of(TOTAL_MISSIONS) },
        ]}
      />

      <section className="dash-section">
        <h2 className="dash-section-title">
          <Search size={20} aria-hidden="true" />
          {t.account.home.searchTitle}
        </h2>
        <DashboardTermSearch termBasePath="/account/terms" />
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">
          <Target size={20} aria-hidden="true" />
          {m.goalTitle}
        </h2>
        <div className="goal-card">
          <p className="goal-card-text">{m.goalText(GOAL_STEP)}</p>
          <div className="goal-card-track quiz-progress-track">
            <div className="quiz-progress-fill" style={{ width: `${goalPercent}%` }} />
          </div>
          <p className="goal-card-remaining">{m.goalRemaining(goalRemaining)}</p>
          <Link to="/account/terms" className="btn-auth-primary quiz-start-btn">
            {m.goalButton}
          </Link>
        </div>
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">
          <Eye size={20} aria-hidden="true" />
          {t.account.home.continueTitle}
        </h2>
        {recentLoading ? (
          <p className="dash-empty-text">{t.table.loading}</p>
        ) : recentTerms.length === 0 ? (
          <p className="dash-empty-text">{t.termsList.emptyViewed}</p>
        ) : (
          <div className="dash-recent-grid">
            {recentTerms.slice(0, 6).map((term) => renderTermCard(term, '/account/terms'))}
          </div>
        )}
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">
          <Wrench size={20} aria-hidden="true" />
          {t.account.home.toolsTitle}
        </h2>
        <div className="dash-secondary-grid">
          {TOOL_LINKS.map(({ key, to, Icon }) => (
            <Link key={key} to={to} className="dash-secondary-card">
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              <span>{t.account.sidebar[key]}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">
          <Library size={20} aria-hidden="true" />
          {t.account.home.materialsTitle}
        </h2>
        <div className="dash-secondary-grid">
          {MATERIAL_LINKS.map(({ key, to, Icon }) => (
            <Link key={key} to={to} className="dash-secondary-card">
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              <span>{key === 'quotes' ? t.nav.quotes : t.account.sidebar[key]}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="dash-footer-note">
        <h3>{t.header.title}</h3>
        <p>{t.account.home.footerText}</p>
      </div>
    </div>
  )
}

export default AccountHomePage
