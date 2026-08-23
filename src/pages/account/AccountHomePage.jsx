import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  LayoutGrid,
  ALargeSmall,
  Share2,
  FileText,
  Landmark,
  Quote,
  UserCircle,
  Search,
  Eye,
  Star,
  Wrench,
  Library,
  Clock,
  Flame,
  Target,
  BarChart3,
  Flag,
  Award,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Mountain,
  Trophy,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations'
import { MISSIONS, TOTAL_MISSIONS } from '../../data/missions.js'
import AuthCard from './auth/AuthCard.jsx'
import { useFavoriteTerms } from './useFavoriteTerms.js'
import { useRecentTerms } from './useRecentTerms.js'
import { useDashboardStats } from './useDashboardStats.js'
import { useMastery } from './useMastery.js'
import { useAllTermCategories } from './useAllTermCategories.js'
import { useActivityStreak } from './useActivityStreak.js'
import { useMissionsProgress } from './useMissionsProgress.js'
import DashboardTermSearch from '../shared/DashboardTermSearch.jsx'
import ProgressRing from './ProgressRing.jsx'
import { toSentenceCase } from '../../utils/textCase.js'
import { computeStreak, computeWeekDots } from '../../utils/activityStreak.js'

function formatCompletedDate(iso, lang) {
  try {
    return new Date(iso).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

const TOOL_LINKS = [
  { key: 'terms', to: '/account/terms', Icon: BookOpen },
  { key: 'categories', to: '/account/categories', Icon: LayoutGrid },
  { key: 'alphabet', to: '/account/alphabet', Icon: ALargeSmall },
  { key: 'network', to: '/account/network', Icon: Share2 },
]

const MATERIAL_LINKS = [
  { key: 'docs', to: '/account/docs', Icon: FileText },
  { key: 'committees', to: '/account/committees', Icon: Landmark },
  { key: 'quotes', to: '/quotes', Icon: Quote },
]

const GOAL_STEP = 5
const ACHIEVEMENT_ICON = { firstTerm: Flag, tenTerms: Award, streak3: Flame, categoryDone: Layers }

function StatCard({ to, label, value, error, caption, errorLabel, Icon, accent }) {
  return (
    <Link to={to} className={`dash-stat-card dash-stat-card--${accent}`}>
      <span className="dash-stat-card-icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="dash-stat-card-label">{label}</span>
      {error ? (
        <span className="dash-stat-card-value dash-stat-card-value--error">{errorLabel}</span>
      ) : value === null ? (
        <span className="dash-stat-card-value dash-stat-card-value--loading">•••</span>
      ) : (
        <span className="dash-stat-card-value">{value}</span>
      )}
      <span className="dash-stat-card-caption">{caption}</span>
    </Link>
  )
}

function AccountHomePage() {
  const { isAuthenticated, loading, user, profile } = useAuth()
  const { lang, t } = useLanguage()
  const navigate = useNavigate()
  const m = t.account.home.mastery
  const mp = t.account.home.missionsPath

  useEffect(() => {
    document.body.classList.add('account-light-theme')
    return () => document.body.classList.remove('account-light-theme')
  }, [])

  const { terms: favoriteTerms, loading: favoritesLoading } = useFavoriteTerms()
  const { terms: recentTerms, loading: recentLoading } = useRecentTerms()
  const { totalTerms, historyCount } = useDashboardStats()
  const { masteredIds, loading: masteryLoading } = useMastery()
  const { rows: categoryRows, loading: categoryRowsLoading } = useAllTermCategories()
  const { activeDays, loading: streakLoading } = useActivityStreak()
  const { missionState, completedCount: missionsCompletedCount, loading: missionsLoading } = useMissionsProgress()

  const masteredCount = masteredIds.size
  const ringPercent = totalTerms ? Math.round((masteredCount / totalTerms) * 100) : 0

  const categoryProgress = useMemo(() => {
    const totals = {}
    const mastered = {}
    CATEGORIES.forEach((c) => {
      totals[c.key] = 0
      mastered[c.key] = 0
    })
    categoryRows.forEach((row) => {
      if (!(row.category in totals)) return
      totals[row.category] += 1
      if (masteredIds.has(row.id)) mastered[row.category] += 1
    })
    return CATEGORIES.map((c) => ({
      key: c.key,
      label: c[lang],
      total: totals[c.key],
      mastered: mastered[c.key],
      percent: totals[c.key] > 0 ? Math.round((mastered[c.key] / totals[c.key]) * 100) : 0,
    })).sort((a, b) => b.percent - a.percent)
  }, [categoryRows, masteredIds, lang])

  const streak = useMemo(() => computeStreak(activeDays), [activeDays])
  const weekDots = useMemo(() => computeWeekDots(activeDays), [activeDays])

  const categoryCompleted = categoryProgress.some((c) => c.total > 0 && c.mastered === c.total)
  const achievements = [
    { key: 'firstTerm', unlocked: (historyCount ?? 0) >= 1 },
    { key: 'tenTerms', unlocked: masteredCount >= 10 },
    { key: 'streak3', unlocked: streak >= 3 },
    { key: 'categoryDone', unlocked: categoryCompleted },
  ]
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const missionTermsTotal = useMemo(() => MISSIONS.reduce((sum, mission) => sum + mission.requiredTerms, 0), [])
  const missionTermsStudied = useMemo(
    () =>
      Object.values(missionState)
        .filter((s) => s.status === 'completed')
        .reduce((sum, s) => sum + s.studied, 0),
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
  const lastViewedTerm = recentTerms[0]

  const renderTermCard = (term, basePath) => (
    <button
      key={term.id}
      type="button"
      className="dash-recent-card"
      onClick={() => navigate(`${basePath}/${term.id}`)}
    >
      <span className="dash-recent-card-top">
        <span className="dash-recent-card-lang">{t.langNames.kk}</span>
        {term.category && <span className="category-badge">{categoryLabel(term.category)}</span>}
      </span>
      <span className="dash-recent-card-name">{toSentenceCase(term.kk)}</span>
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

      <section className="dash-section">
        <h2 className="dash-section-title">
          <ShieldCheck size={20} aria-hidden="true" />
          {mp.title}
        </h2>

        <div className="dash-mini-stats dash-missions-stats">
          <StatCard
            to="/account/missions"
            label={mp.statMissions}
            value={missionsLoading ? null : missionsCompletedCount}
            error={false}
            caption={mp.statMissionsCaption(TOTAL_MISSIONS)}
            Icon={ShieldCheck}
            accent="blue"
          />
          <StatCard
            to="/account/missions"
            label={mp.statTerms}
            value={missionsLoading ? null : missionTermsStudied}
            error={false}
            caption={mp.statTermsCaption(missionTermsTotal)}
            Icon={BookOpen}
            accent="green"
          />
          <StatCard
            to="/account/missions"
            label={mp.statAvgScore}
            value={missionsLoading ? null : missionAvgScore === null ? '—' : `${missionAvgScore}%`}
            error={false}
            caption={mp.statAvgScoreCaption}
            Icon={BarChart3}
            accent="yellow"
          />
          <StatCard
            to="/account/missions"
            label={mp.statAchievements}
            value={missionsLoading ? null : missionsCompletedCount}
            error={false}
            caption={mp.statAchievementsCaption}
            Icon={Trophy}
            accent="red"
          />
        </div>

        {missionsCompletedCount === 0 && !missionsLoading ? (
          <p className="dash-empty-text">{mp.empty}</p>
        ) : (
          <div className="mission-route-widget">
            <div className="mission-route-widget-endpoint">
              <Flag size={15} aria-hidden="true" />
              <span>{mp.routeStart}</span>
            </div>
            <ol className="mission-route-widget-list">
              {MISSIONS.map((mission) => {
                const state = missionState[mission.id]
                const done = state.status === 'completed'
                return (
                  <li
                    key={mission.id}
                    className={`mission-route-widget-node${done ? ' mission-route-widget-node--done' : ''}`}
                  >
                    <Link to={`/account/missions/mission/${mission.id}`} className="mission-route-widget-dot">
                      {done ? <CheckCircle2 size={13} aria-hidden="true" /> : mission.number}
                    </Link>
                    {done && (
                      <div className="mission-route-widget-tooltip">
                        <strong>{mission.title[lang]}</strong>
                        <span>{mp.tooltipResult(state.score)}</span>
                        {state.completedAt && (
                          <span>{mp.tooltipDate(formatCompletedDate(state.completedAt, lang))}</span>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
            <div className="mission-route-widget-endpoint mission-route-widget-endpoint--peak">
              <Mountain size={17} aria-hidden="true" />
              <span>{mp.routePeak}</span>
            </div>
          </div>
        )}
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">
          <BarChart3 size={20} aria-hidden="true" />
          {t.account.home.progressTitle}
        </h2>
        <div className="dash-progress-layout">
          <ProgressRing
            percent={ringPercent}
            mastered={masteredCount}
            total={totalTerms ?? 0}
            label={m.ringLabel}
            tooltipMastered={m.tooltipMastered(masteredCount)}
            tooltipRemaining={m.tooltipRemaining(Math.max((totalTerms ?? 0) - masteredCount, 0))}
            tooltipProgress={m.tooltipProgress(ringPercent)}
          />
          <div className="dash-mini-stats">
            <StatCard
              to="/account/my-dictionary"
              label={m.statMastered}
              value={masteryLoading ? null : masteredCount}
              error={false}
              caption={m.ringLabel}
              Icon={BookOpen}
              accent="blue"
            />
            <StatCard
              to="/account/my-dictionary"
              label={m.statFavorites}
              value={favoritesLoading ? null : favoriteTerms.length}
              error={false}
              caption={m.statFavoritesCaption}
              Icon={Star}
              accent="red"
            />
            <StatCard
              to="/account/viewing-history"
              label={m.statHistory}
              value={historyCount}
              error={false}
              caption={m.statHistoryCaption}
              Icon={Clock}
              accent="yellow"
            />
            <StatCard
              to="#achievements"
              label={m.statGoals}
              value={`${unlockedCount}/${achievements.length}`}
              error={false}
              caption={m.achievementsTitle}
              Icon={Target}
              accent="green"
            />
          </div>
        </div>
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">
          <Search size={20} aria-hidden="true" />
          {t.account.home.searchTitle}
        </h2>
        <DashboardTermSearch termBasePath="/account/terms" />
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">
          <LayoutGrid size={20} aria-hidden="true" />
          {m.categoryTitle}
        </h2>
        {categoryRowsLoading ? (
          <p className="dash-empty-text">{t.table.loading}</p>
        ) : (
          <div className="category-progress-list">
            {categoryProgress.map((c) => (
              <Link key={c.key} to="/account/categories" className="category-progress-row">
                <span className="category-progress-head">
                  <span className="category-progress-label">{c.label}</span>
                  <span className="category-progress-percent">{c.percent}%</span>
                </span>
                <div className="quiz-progress-track">
                  <div
                    className={`quiz-progress-fill quiz-progress-fill--${
                      c.percent >= 80 ? 'good' : c.percent >= 50 ? 'mid' : 'low'
                    }`}
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
                <p className="category-progress-detail">
                  {c.total > 0
                    ? `${m.categoryDetail(c.mastered, c.total)} · ${m.categoryRemaining(c.total - c.mastered)}`
                    : t.table.emptyNoTerms}
                </p>
              </Link>
            ))}
          </div>
        )}
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
          <Flame size={20} aria-hidden="true" />
          {m.streakTitle}
        </h2>
        {streakLoading ? (
          <p className="dash-empty-text">{t.table.loading}</p>
        ) : streak === 0 ? (
          <p className="dash-empty-text">{m.streakEmpty}</p>
        ) : (
          <p className="streak-summary">
            <Flame className="streak-summary-icon" size={20} aria-hidden="true" />
            {m.streakText(streak)}
          </p>
        )}
        <div className="streak-week">
          {m.weekdays.map((day, i) => (
            <div className="streak-day" key={day + i}>
              <span className="streak-day-label">{day}</span>
              <span
                className={`streak-day-dot${weekDots[i]?.active ? ' streak-day-dot--active' : ''}${
                  weekDots[i]?.isFuture ? ' streak-day-dot--future' : ''
                }`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="dash-section" id="achievements">
        <h2 className="dash-section-title">
          <Award size={20} aria-hidden="true" />
          {m.achievementsTitle}
        </h2>
        <div className="achievements-grid">
          {achievements.map((a) => {
            const AchievementIcon = ACHIEVEMENT_ICON[a.key]
            return (
              <div
                key={a.key}
                className={`achievement-badge${a.unlocked ? ' achievement-badge--unlocked' : ''}`}
              >
                <span className="achievement-badge-icon" aria-hidden="true">
                  <AchievementIcon size={19} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="achievement-badge-title">{m.achievements[a.key].title}</span>
                  <span className="achievement-badge-desc">{m.achievements[a.key].desc}</span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {lastViewedTerm && (
        <section className="dash-section">
          <h2 className="dash-section-title">
            <Eye size={20} aria-hidden="true" />
            {m.continueTitle}
          </h2>
          <div className="continue-learning-card">
            <div className="continue-learning-info">
              <p className="continue-learning-eyebrow">{m.continueLastTerm}</p>
              <p className="continue-learning-term">{toSentenceCase(lastViewedTerm.kk)}</p>
              {lastViewedTerm.category && (
                <p className="continue-learning-category">
                  {t.form.categoryLabel}: {categoryLabel(lastViewedTerm.category)}
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn-auth-primary quiz-start-btn"
              onClick={() => navigate(`/account/terms/${lastViewedTerm.id}`)}
            >
              {m.continueButton}
            </button>
          </div>
        </section>
      )}

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
          <Star size={20} aria-hidden="true" />
          {t.account.home.favoriteTermsTitle}
        </h2>
        {favoritesLoading ? (
          <p className="dash-empty-text">{t.termFavorites.loading}</p>
        ) : favoriteTerms.length === 0 ? (
          <p className="dash-empty-text">{t.termFavorites.empty}</p>
        ) : (
          <div className="dash-recent-grid">
            {favoriteTerms.slice(0, 6).map((term) => renderTermCard(term, '/account/terms'))}
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
