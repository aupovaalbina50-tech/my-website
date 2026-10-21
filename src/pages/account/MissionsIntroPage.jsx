import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, ClipboardCheck, ShieldCheck, Target, TriangleAlert } from 'lucide-react'
import SectionIntro from '../../components/SectionIntro.jsx'
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
      <div>
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{m.intro.title}</h1>
        <SectionIntro
          lead={m.intro.subtitle}
          steps={STEP_ORDER.map((key) => ({ icon: STEP_ICONS[key], title: m.intro.steps[key].title, text: m.intro.steps[key].text }))}
        />
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
