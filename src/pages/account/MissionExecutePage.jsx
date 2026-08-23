import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Trophy, X, XCircle } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { MISSIONS } from '../../data/missions.js'
import { useMissionOperation } from './useMissionOperation.js'

const STAGE_KEYS = ['assess', 'identify', 'action', 'control']

function OperationVisual({ stabilized }) {
  return (
    <div className="mission-op-visual">
      <svg className="mission-op-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <line className="mission-brief-ground" x1="0" y1="188" x2="640" y2="188" />
        <g className="mission-brief-facility">
          <rect x="40" y="108" width="90" height="80" />
          <rect x="140" y="130" width="60" height="58" />
          <rect x="210" y="70" width="26" height="118" />
          <rect className="mission-brief-window" x="60" y="128" width="14" height="14" />
          <rect className="mission-brief-window" x="90" y="128" width="14" height="14" />
          <rect className="mission-brief-window" x="60" y="152" width="14" height="14" />
          <rect className="mission-brief-window" x="90" y="152" width="14" height="14" />
        </g>
        <g transform="translate(420 152)">
          <circle
            className={`mission-op-containment${stabilized ? ' mission-op-containment--stabilized' : ''}`}
            r="70"
          />
          {!stabilized && <circle className="mission-brief-ring mission-brief-ring--1" r="18" />}
          {!stabilized && <circle className="mission-brief-ring mission-brief-ring--2" r="18" />}
          <circle className={`mission-op-core${stabilized ? ' mission-op-core--stabilized' : ''}`} r="9" />
        </g>
      </svg>
    </div>
  )
}

function MissionExecutePage() {
  const { missionId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const e = t.account.missions.execute
  const c = t.account.missions.complete

  const mission = MISSIONS.find((item) => item.id === missionId)
  const op = useMissionOperation(mission)
  const [toastDismissed, setToastDismissed] = useState(false)

  const goToMission = () => navigate(`/account/missions/mission/${missionId}`)
  const goToMissionsList = () => navigate('/account/missions', { state: { stage: 'list' } })
  const goHome = () => navigate('/account')

  useEffect(() => {
    if (!mission) navigate('/account/missions', { state: { stage: 'list' } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission])

  useEffect(() => {
    if (mission && !op.scoreLoading && !op.cleared) goToMission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, op.scoreLoading, op.cleared])

  if (!mission) {
    return null
  }

  if (op.scoreLoading || !op.cleared) {
    return (
      <div className="mission-page">
        <div className="card">
          <p className="empty-state-text">{t.account.missions.study.loading}</p>
        </div>
      </div>
    )
  }

  if (op.phase === 'complete') {
    return (
      <div className="mission-page">
        {op.isNewAchievement && !toastDismissed && (
          <div className="mission-achievement-toast" role="status">
            <span className="mission-achievement-toast-icon" aria-hidden="true">
              <Trophy size={18} strokeWidth={1.75} />
            </span>
            <div className="mission-achievement-toast-body">
              <p className="mission-achievement-toast-title">{c.toastTitle}</p>
              <p className="mission-achievement-toast-name">{mission.achievement[lang]}</p>
            </div>
            <button
              type="button"
              className="mission-achievement-toast-close"
              onClick={() => setToastDismissed(true)}
              aria-label={c.toastClose}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mission-complete-op-card">
          <div className="mission-op-hero mission-op-hero--final">
            <OperationVisual stabilized />
            <span className="mission-op-final-label">
              <CheckCircle2 size={16} aria-hidden="true" /> {e.stabilizedLabel}
            </span>
          </div>

          <h1 className="mission-complete-title">{c.title}</h1>
          <p className="mission-goal-mission">&laquo;{mission.title[lang]}&raquo;</p>

          <ul className="mission-complete-checklist">
            <li>
              <CheckCircle2 size={16} aria-hidden="true" /> {c.checklist.studied(mission.requiredTerms)}
            </li>
            <li>
              <CheckCircle2 size={16} aria-hidden="true" /> {c.checklist.tested}
            </li>
            <li>
              <CheckCircle2 size={16} aria-hidden="true" /> {c.checklist.score(op.percent)}
            </li>
            <li>
              <CheckCircle2 size={16} aria-hidden="true" /> {c.checklist.operation}
            </li>
          </ul>

          <div className="mission-achievement-card">
            <span className="mission-achievement-icon" aria-hidden="true">
              <Trophy size={22} strokeWidth={1.75} />
            </span>
            <span className="mission-achievement-eyebrow">{c.achievementEyebrow}</span>
            <span className="mission-achievement-label">{mission.achievement[lang]}</span>
            <p className="mission-achievement-desc">{c.achievementDesc}</p>
          </div>

          <div className="quiz-result-actions">
            <button type="button" className="btn-auth-secondary" onClick={goToMissionsList}>
              {c.toMissionsCta}
            </button>
            <button type="button" className="btn-auth-primary" onClick={goHome}>
              {c.toHomeCta}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const stateLabel = op.percent >= 90 ? e.stateLabels.excellent : e.stateLabels.passed
  const visibleStageKeys = STAGE_KEYS.slice(0, Math.min(op.totalStages, STAGE_KEYS.length))

  return (
    <div className="mission-page">
      <button type="button" className="mission-brief-back" onClick={goToMission}>
        <ArrowLeft size={16} aria-hidden="true" />
        {e.back}
      </button>

      <div className="mission-brief-head">
        <div className="mission-brief-head-text">
          <span className="mission-brief-crumb">{e.headerPrefix}</span>
          <h1 className="mission-brief-title">{mission.title[lang]}</h1>
        </div>
        <div className="mission-brief-status">
          <span className="mission-brief-status-label">{t.account.missions.detail.missionLabel(mission.number)}</span>
          <span className="mission-brief-status-badge mission-brief-status-badge--in_progress">
            <span className="mission-brief-status-dot" aria-hidden="true" />
            {e.statusStarted}
          </span>
        </div>
      </div>

      <div className="mission-brief-hero mission-op-hero">
        <OperationVisual stabilized={false} />
        <div className="mission-op-readout">
          <span className="mission-op-readout-label">{e.readinessLabel}</span>
          <span className="mission-op-readout-value">{op.percent}%</span>
          <span className="mission-op-readout-state">{stateLabel}</span>
        </div>
      </div>

      <div className="mission-goal">
        <div>
          <h2 className="mission-goal-title">{e.taskTitle}</h2>
          <p className="mission-goal-note">{e.taskText(mission.title[lang])}</p>
        </div>
      </div>

      <div className="mission-op-stage-dots">
        {visibleStageKeys.map((key, i) => {
          const done = op.completedStages.has(i)
          const current = i === op.stageIndex
          const meta = key === 'action' ? { number: '03', title: mission.actionLabel[lang] } : e.stages[key]
          return (
            <div
              key={key}
              className={`mission-op-stage-dot${done ? ' mission-op-stage-dot--done' : ''}${
                current ? ' mission-op-stage-dot--current' : ''
              }`}
            >
              <span className="mission-op-stage-number">{done ? <CheckCircle2 size={13} /> : meta.number}</span>
              <span className="mission-op-stage-title">{meta.title}</span>
            </div>
          )
        })}
      </div>

      {!op.ready ? (
        <div className="card">
          <p className="empty-state-text">{t.account.missions.study.loading}</p>
        </div>
      ) : (
        op.currentCheck && (
          <div className="card mission-op-check-card">
            <p className="quiz-prompt-label">{e.checkPrompt}</p>
            <h2 className="quiz-term">{op.currentCheck.prompt}</h2>

            <div className="quiz-options">
              {op.currentCheck.options.map((option) => {
                const isPending = op.pendingOptionId === option.id
                const isCorrectOption = option.id === op.currentCheck.correctId
                let stateClass = ''
                if (op.feedback === 'correct') {
                  if (isCorrectOption) stateClass = ' correct'
                } else if (op.feedback === 'wrong' && isPending) {
                  stateClass = ' wrong'
                } else if (isPending) {
                  stateClass = ' selected'
                }
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`quiz-option${stateClass}`}
                    disabled={op.feedback === 'correct'}
                    onClick={() => op.selectOption(option.id)}
                  >
                    <span className="quiz-option-text">{option.text}</span>
                    {op.feedback === 'correct' && isCorrectOption && (
                      <CheckCircle2 size={22} className="quiz-option-icon" aria-hidden="true" />
                    )}
                    {op.feedback === 'wrong' && isPending && (
                      <XCircle size={22} className="quiz-option-icon" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>

            {op.feedback === 'wrong' && (
              <div className="mission-quiz-feedback mission-quiz-feedback--wrong">
                <XCircle size={18} aria-hidden="true" />
                {e.wrongHint}
              </div>
            )}

            {op.feedback !== 'correct' ? (
              <button
                type="button"
                className="btn-auth-primary quiz-next-btn"
                onClick={op.confirm}
                disabled={op.pendingOptionId === null}
              >
                {e.confirmCta}
              </button>
            ) : (
              <button type="button" className="btn-auth-primary quiz-next-btn" onClick={op.advance}>
                {op.stageIndex === op.totalStages - 1 ? e.finishCta : e.nextCta}
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}

export default MissionExecutePage
