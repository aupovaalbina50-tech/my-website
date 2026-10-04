import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, ClipboardCheck, ShieldCheck, Siren, Target, TriangleAlert } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { TOTAL_MISSIONS } from '../../data/missions.js'
import { useMissionsProgress } from './useMissionsProgress.js'
import MissionsList from './MissionsList.jsx'
import MissionsHero from './MissionsHero.jsx'

const STEP_ORDER = ['study', 'test', 'result', 'mission']
const STEP_ICONS = { study: BookOpen, test: ClipboardCheck, result: Target, mission: ShieldCheck }

const VALID_STAGES = ['intro', 'hero', 'list']

function MissionsIntroPage() {
  const { t } = useLanguage()
  const location = useLocation()
  const m = t.account.missions
  const [stage, setStage] = useState(() =>
    VALID_STAGES.includes(location.state?.stage) ? location.state.stage : 'intro'
  )
  const { missionState, completedCount } = useMissionsProgress()

  if (stage === 'list') {
    return <MissionsList />
  }

  if (stage === 'hero') {
    const h = m.hero
    return (
      <div className="mission-page">
        <MissionsHero missionState={missionState} completedCount={completedCount} onShowList={() => setStage('list')} />
        {completedCount === 0 && (
          <div className="mission-progress-note">
            <span className="mission-progress-text">{h.progressNote}</span>
            <span className="mission-progress-count">{h.progressCount(completedCount, TOTAL_MISSIONS)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="account-home mission-page">
      <div className="account-card">
        <span className="mission-eyebrow">
          <Siren size={14} aria-hidden="true" />
          {t.account.sidebar.missions}
        </span>
        <h1 className="account-title">{m.intro.title}</h1>
        <p className="account-description">{m.intro.subtitle}</p>
      </div>

      <div className="card mission-steps-card">
        <ol className="mission-steps">
          {STEP_ORDER.map((key, i) => {
            const step = m.intro.steps[key]
            const Icon = STEP_ICONS[key]
            return (
              <li className="mission-step" key={key} style={{ '--i': i }}>
                <div className="mission-step-marker">
                  <span className="mission-step-number">{step.number}</span>
                  <span className="mission-step-icon" aria-hidden="true">
                    <Icon size={19} strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mission-step-body">
                  <h2 className="mission-step-title">{step.title}</h2>
                  <p className="mission-step-text">{step.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mission-rule">
        <span className="mission-rule-icon" aria-hidden="true">
          <TriangleAlert size={24} strokeWidth={2} />
        </span>
        <div>
          <h3 className="mission-rule-title">{m.intro.ruleTitle}</h3>
          <p className="mission-rule-text">{m.intro.ruleText}</p>
        </div>
      </div>

      <button
        type="button"
        className="btn-auth-primary quiz-start-btn mission-cta"
        onClick={() => setStage('hero')}
      >
        {m.intro.cta}
      </button>
    </div>
  )
}

export default MissionsIntroPage
