import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Languages,
  ShieldCheck,
  Target,
  TriangleAlert,
  Trophy,
} from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations.js'
import { MISSIONS } from '../../data/missions.js'
import { useMissionsProgress } from './useMissionsProgress.js'
import { useMissionAttemptStats } from './useMissionAttemptStats.js'

const STAGE_ICONS = { study: BookOpen, test: ClipboardCheck, result: Target, finish: ShieldCheck }

function MissionBriefVisual() {
  return (
    <div className="mission-brief-visual">
      <svg
        className="mission-brief-svg"
        viewBox="0 0 640 220"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <line className="mission-brief-ground" x1="0" y1="188" x2="640" y2="188" />

        <g className="mission-brief-facility">
          <rect x="40" y="108" width="90" height="80" />
          <rect x="140" y="130" width="60" height="58" />
          <rect x="210" y="70" width="26" height="118" />
          <rect className="mission-brief-window" x="60" y="128" width="14" height="14" />
          <rect className="mission-brief-window" x="90" y="128" width="14" height="14" />
          <rect className="mission-brief-window" x="60" y="152" width="14" height="14" />
          <rect className="mission-brief-window" x="90" y="152" width="14" height="14" />
          <circle className="mission-brief-beacon" cx="223" cy="62" r="6" />
        </g>

        <g className="mission-brief-zone" transform="translate(420 152)">
          <circle className="mission-brief-containment" r="70" />
          <circle className="mission-brief-ring mission-brief-ring--1" r="18" />
          <circle className="mission-brief-ring mission-brief-ring--2" r="18" />
          <circle className="mission-brief-core" r="7" />
        </g>
      </svg>
      <span className="mission-brief-scanline" aria-hidden="true" />
    </div>
  )
}

function MissionDetailPage() {
  const { missionId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const d = t.account.missions.detail
  const l = t.account.missions.list

  const mission = MISSIONS.find((item) => item.id === missionId)
  const { missionState } = useMissionsProgress()
  const attemptStats = useMissionAttemptStats(missionId)

  const goToList = () => navigate('/account/missions', { state: { stage: 'list' } })

  useEffect(() => {
    if (!mission) goToList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission])

  if (!mission) {
    return null
  }

  const category = CATEGORIES.find((c) => c.key === mission.categoryKey)
  const Icon = mission.Icon
  const state = missionState[mission.id]

  const stages = [
    { key: 'study', number: '01', title: d.stages.study.title, text: d.stages.study.text(mission.requiredTerms) },
    { key: 'test', number: '02', title: d.stages.test.title, text: d.stages.test.text },
    { key: 'result', number: '03', title: d.stages.result.title, text: d.stages.result.text },
    { key: 'finish', number: '04', title: d.stages.finish.title, text: mission.completion[lang] },
  ]

  return (
    <div className="mission-page mission-brief-page">
      <button type="button" className="mission-brief-back" onClick={goToList}>
        <ArrowLeft size={16} aria-hidden="true" />
        {d.back}
      </button>

      <div className="mission-brief-head">
        <div className="mission-brief-head-text">
          <span className="mission-brief-crumb">
            {mission.number} &middot; {category?.[lang]}
          </span>
          <h1 className="mission-brief-title">{mission.title[lang]}</h1>
          <p className="mission-brief-subtitle">{d.subtitle(category?.[lang])}</p>
        </div>
        <div className="mission-brief-status">
          <span className="mission-brief-status-label">{d.missionLabel(mission.number)}</span>
          <span className={`mission-brief-status-badge mission-brief-status-badge--${state.status}`}>
            <span className="mission-brief-status-dot" aria-hidden="true" />
            {state.status === 'completed'
              ? l.statusCompleted
              : state.status === 'in_progress'
                ? l.statusInProgress
                : l.statusNotStarted}
          </span>
        </div>
      </div>

      <div className="mission-brief-hero">
        <MissionBriefVisual />
      </div>

      {state.status === 'completed' && (
        <div className="mission-completed-banner">
          <div className="mission-completed-banner-head">
            <span className="mission-completed-banner-icon" aria-hidden="true">
              <CheckCircle2 size={22} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="mission-completed-banner-title">{d.completedTitle}</h2>
              <p className="mission-completed-banner-text">{d.completedText}</p>
            </div>
          </div>

          <ul className="mission-complete-checklist">
            <li>
              <CheckCircle2 size={16} aria-hidden="true" />
              {t.account.missions.complete.checklist.studied(mission.requiredTerms)}
            </li>
            <li>
              <CheckCircle2 size={16} aria-hidden="true" /> {t.account.missions.complete.checklist.tested}
            </li>
            <li>
              <CheckCircle2 size={16} aria-hidden="true" />
              {t.account.missions.complete.checklist.score(state.score ?? 0)}
            </li>
            <li>
              <CheckCircle2 size={16} aria-hidden="true" /> {t.account.missions.complete.checklist.operation}
            </li>
          </ul>

          {!attemptStats.loading && attemptStats.count > 0 && (
            <div className="mission-completed-stats">
              <div className="mission-completed-stat">
                <span className="mission-completed-stat-label">{d.bestResultLabel}</span>
                <span className="mission-completed-stat-value">{attemptStats.best}%</span>
              </div>
              <div className="mission-completed-stat">
                <span className="mission-completed-stat-label">{d.lastResultLabel}</span>
                <span className="mission-completed-stat-value">{attemptStats.last}%</span>
              </div>
              <div className="mission-completed-stat">
                <span className="mission-completed-stat-label">{d.attemptsLabel}</span>
                <span className="mission-completed-stat-value">{attemptStats.count}</span>
              </div>
            </div>
          )}

          <div className="mission-achievement-card mission-achievement-card--compact">
            <span className="mission-achievement-icon" aria-hidden="true">
              <Trophy size={20} strokeWidth={1.75} />
            </span>
            <span className="mission-achievement-label">{mission.achievement[lang]}</span>
          </div>
        </div>
      )}

      <div className="mission-goal">
        <span className="mission-goal-icon" aria-hidden="true">
          <Icon size={22} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="mission-goal-title">{d.goalTitle}</h2>
          <p className="mission-goal-mission">&laquo;{mission.title[lang]}&raquo;</p>
          <p className="mission-goal-note">{d.goalNote}</p>
        </div>
      </div>

      <div className="card mission-stages-card">
        <ol className="mission-steps mission-stages">
          {stages.map((stage, i) => {
            const StageIcon = STAGE_ICONS[stage.key]
            return (
              <li
                className={`mission-step ${i === 0 ? 'mission-step--active' : 'mission-step--future'}`}
                key={stage.key}
                style={{ '--i': i }}
              >
                <div className="mission-step-marker">
                  <span className="mission-step-number">{stage.number}</span>
                  <span className="mission-step-icon" aria-hidden="true">
                    <StageIcon size={19} strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mission-step-body">
                  <h3 className="mission-step-title">{stage.title}</h3>
                  <p className="mission-step-text">{stage.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="card mission-ahead-card">
        <h2 className="mission-ahead-title">{d.aheadTitle}</h2>
        <ul className="mission-ahead-list">
          <li className="mission-ahead-row">
            <span className="mission-ahead-icon" aria-hidden="true">
              <BookOpen size={18} strokeWidth={1.75} />
            </span>
            <span>{d.aheadStudy(mission.requiredTerms)}</span>
          </li>
          <li className="mission-ahead-row">
            <span className="mission-ahead-icon" aria-hidden="true">
              <Languages size={18} strokeWidth={1.75} />
            </span>
            <span className="mission-ahead-row-text">
              {d.aheadLangs}
              <span className="mission-ahead-sub">{d.aheadLangsList}</span>
            </span>
          </li>
          <li className="mission-ahead-row">
            <span className="mission-ahead-icon" aria-hidden="true">
              <ClipboardCheck size={18} strokeWidth={1.75} />
            </span>
            <span>{d.aheadTest}</span>
          </li>
          <li className="mission-ahead-row">
            <span className="mission-ahead-icon" aria-hidden="true">
              <Target size={18} strokeWidth={1.75} />
            </span>
            <span>{d.aheadGoal}</span>
          </li>
        </ul>

        <div className="mission-rule mission-ahead-note">
          <span className="mission-rule-icon" aria-hidden="true">
            <TriangleAlert size={22} strokeWidth={2} />
          </span>
          <div>
            <h3 className="mission-rule-title">{d.aheadNoteTitle}</h3>
            <p className="mission-rule-text">{d.aheadNote}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn-auth-primary quiz-start-btn mission-cta"
        onClick={() =>
          navigate(`/account/missions/mission/${mission.id}/${state.status === 'completed' ? 'test' : 'study'}`)
        }
      >
        {state.status === 'completed' ? d.retryCta : d.startCta}
      </button>
    </div>
  )
}

export default MissionDetailPage
