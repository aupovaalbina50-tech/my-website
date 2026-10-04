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
import { useMissionStageStatus } from './useMissionStageStatus.js'
import MissionScene from './MissionScene.jsx'

const STAGE_ICONS = { study: BookOpen, test: ClipboardCheck, result: Target, finish: ShieldCheck }

function MissionDetailPage() {
  const { missionId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const d = t.account.missions.detail
  const l = t.account.missions.list

  const mission = MISSIONS.find((item) => item.id === missionId)
  const { missionState } = useMissionsProgress()
  const attemptStats = useMissionAttemptStats(missionId)
  const run = useMissionStageStatus(mission)

  const goToList = () => navigate('/account/missions', { state: { stage: 'list' } })
  const goToStudy = () => navigate(`/account/missions/mission/${missionId}/study`)
  const goToStage = (stageKey) => {
    if (stageKey === 'study') goToStudy()
    else if (stageKey === 'test') navigate(`/account/missions/mission/${missionId}/test`)
    else if (stageKey === 'finish') navigate(`/account/missions/mission/${missionId}/execute`)
  }

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

  // Status of each stage in the current run — derived from saved progress,
  // never assumed. 'active' stages can be opened; 'locked' ones cannot yet.
  const stageStatus = {
    study: run.studyDone ? 'done' : 'active',
    test: run.testPassed ? 'done' : run.studyDone ? 'active' : 'locked',
    result: run.testPassed ? 'done' : 'locked',
    finish: run.testPassed ? 'active' : 'locked',
  }
  const stageBadge = (key) => {
    const status = stageStatus[key]
    if (status === 'done') return d.stageStatus.done
    if (status === 'locked') return d.stageStatus.locked
    if (key === 'study' && run.studied > 0) return d.stageStatus.studied(run.studied, run.total)
    return d.stageStatus.available
  }
  const runStarted = run.studied > 0

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
        <MissionScene missionId={mission.id} reached={0} />
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
            const status = run.loading ? 'locked' : stageStatus[stage.key]
            const openable = status === 'active' && stage.key !== 'result'
            return (
              <li
                className={`mission-step mission-step--${
                  status === 'done' ? 'done' : status === 'active' ? 'active' : 'future'
                }${openable ? ' mission-step--openable' : ''}`}
                key={stage.key}
                style={{ '--i': i }}
                role={openable ? 'button' : undefined}
                tabIndex={openable ? 0 : undefined}
                onClick={openable ? () => goToStage(stage.key) : undefined}
                onKeyDown={
                  openable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          goToStage(stage.key)
                        }
                      }
                    : undefined
                }
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
                  {!run.loading && (
                    <span className={`mission-step-badge mission-step-badge--${status}`}>
                      {status === 'done' && <CheckCircle2 size={14} aria-hidden="true" />}
                      {stageBadge(stage.key)}
                    </span>
                  )}
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

      {state.status === 'completed' ? (
        <>
          <button type="button" className="btn-auth-primary quiz-start-btn mission-cta" onClick={goToStudy}>
            {runStarted ? d.continueCta : d.restartCta}
          </button>
          <button
            type="button"
            className="btn-auth-secondary mission-cta"
            onClick={() => navigate(`/account/missions/mission/${mission.id}/test`)}
          >
            {d.retryCta}
          </button>
        </>
      ) : (
        <button type="button" className="btn-auth-primary quiz-start-btn mission-cta" onClick={goToStudy}>
          {runStarted ? d.continueCta : d.startCta}
        </button>
      )}
    </div>
  )
}

export default MissionDetailPage
