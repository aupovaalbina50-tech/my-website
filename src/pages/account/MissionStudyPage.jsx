import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Target } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { MISSIONS } from '../../data/missions.js'
import { useMissionTermStudy } from './useMissionTermStudy.js'
import { toSentenceCase } from '../../utils/textCase.js'

function TermLangRow({ label, text, active }) {
  if (!text) return null
  return (
    <div className={`mission-term-lang-row${active ? ' mission-term-lang-row--active' : ''}`}>
      <div className="mission-term-lang-head">
        <span className="mission-term-lang-label">{label}</span>
      </div>
      <p className="mission-term-lang-text">{toSentenceCase(text)}</p>
    </div>
  )
}

function MissionStudyPage() {
  const { missionId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const s = t.account.missions.study

  const mission = MISSIONS.find((item) => item.id === missionId)
  const { terms, studiedIds, markStudied, loading } = useMissionTermStudy(mission)

  const [viewIndex, setViewIndex] = useState(0)
  const [activeLang, setActiveLang] = useState(lang)
  const [stage, setStage] = useState('studying')
  const initializedRef = useRef(false)

  const goToMission = () => navigate(`/account/missions/mission/${missionId}`)

  useEffect(() => {
    if (!mission) {
      navigate('/account/missions', { state: { stage: 'list' } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission])

  useEffect(() => {
    if (loading || initializedRef.current || terms.length === 0) return
    initializedRef.current = true
    if (studiedIds.size >= terms.length) {
      setStage('complete')
      setViewIndex(terms.length - 1)
    } else {
      setViewIndex(Math.min(studiedIds.size, terms.length - 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, terms.length])

  if (!mission) {
    return null
  }

  const total = terms.length
  const currentTerm = terms[viewIndex]
  const isCurrentStudied = currentTerm ? studiedIds.has(currentTerm.id) : false
  const studiedCount = studiedIds.size
  const progressPercent = total > 0 ? Math.round((studiedCount / total) * 100) : 0
  const maxUnlockedIndex = Math.min(studiedCount, Math.max(total - 1, 0))

  const handleMarkStudied = () => {
    if (!currentTerm || isCurrentStudied) return
    markStudied(currentTerm.id)
  }

  const handleNext = () => {
    if (!currentTerm || !isCurrentStudied) return
    if (viewIndex < total - 1) {
      setViewIndex((i) => i + 1)
    } else {
      setStage('complete')
    }
  }

  const handleBack = () => {
    setViewIndex((i) => Math.max(0, i - 1))
  }

  const jumpTo = (index) => {
    if (index <= maxUnlockedIndex) setViewIndex(index)
  }

  if (stage === 'complete') {
    return (
      <div className="mission-page">
        <button type="button" className="mission-brief-back" onClick={goToMission}>
          <ArrowLeft size={16} aria-hidden="true" />
          {s.back}
        </button>
        <div className="mission-complete-card">
          <span className="mission-complete-icon" aria-hidden="true">
            <Target size={30} strokeWidth={1.75} />
          </span>
          <h1 className="mission-complete-title">{s.completeTitle}</h1>
          <p className="mission-complete-text">{s.completeText}</p>
          <button
            type="button"
            className="btn-auth-primary quiz-start-btn mission-cta"
            onClick={() => navigate(`/account/missions/mission/${mission.id}/test`)}
          >
            {s.completeCta}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mission-page mission-study-page">
      <button type="button" className="mission-brief-back" onClick={goToMission}>
        <ArrowLeft size={16} aria-hidden="true" />
        {s.back}
      </button>

      <div className="mission-brief-head">
        <div className="mission-brief-head-text">
          <span className="mission-brief-crumb">{s.eyebrow}</span>
          <h1 className="mission-brief-title">{s.title}</h1>
          <p className="mission-brief-subtitle">{s.subtitle}</p>
        </div>
        <div className="mission-brief-status">
          <span className="mission-brief-status-label">{s.missionLabel(mission.number)}</span>
          <span className="mission-study-mission-title">{mission.title[lang]}</span>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p className="empty-state-text">{s.loading}</p>
        </div>
      ) : total === 0 ? (
        <div className="card">
          <p className="empty-state-text">{s.noTerms}</p>
        </div>
      ) : (
        <>
          <div className="mission-progress-block">
            <div className="mission-progress-top">
              <span className="mission-progress-number">
                {String(viewIndex + 1).padStart(2, '0')} / {total}
              </span>
              <span className="mission-progress-status">
                {isCurrentStudied ? s.studiedStatus : s.studyingStatus}
              </span>
            </div>
            <div className="quiz-progress-track">
              <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="mission-dots" role="list">
            {terms.map((term, i) => {
              const done = studiedIds.has(term.id)
              const isCurrent = i === viewIndex
              const unlocked = i <= maxUnlockedIndex
              return (
                <button
                  key={term.id}
                  type="button"
                  role="listitem"
                  className={`mission-dot${done ? ' mission-dot--done' : ''}${
                    isCurrent ? ' mission-dot--current' : ''
                  }`}
                  disabled={!unlocked}
                  onClick={() => jumpTo(i)}
                  aria-current={isCurrent ? 'true' : undefined}
                  aria-label={`${i + 1}`}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </button>
              )
            })}
          </div>

          <div className="card mission-term-card">
            <div className="mission-term-tabs">
              <button
                type="button"
                className={`mission-term-tab${activeLang === 'kk' ? ' mission-term-tab--active' : ''}`}
                onClick={() => setActiveLang('kk')}
              >
                KZ
              </button>
              <button
                type="button"
                className={`mission-term-tab${activeLang === 'ru' ? ' mission-term-tab--active' : ''}`}
                onClick={() => setActiveLang('ru')}
              >
                RU
              </button>
              <button
                type="button"
                className={`mission-term-tab${activeLang === 'en' ? ' mission-term-tab--active' : ''}`}
                onClick={() => setActiveLang('en')}
              >
                EN
              </button>
            </div>

            <div className="mission-term-langs">
              <TermLangRow label={s.langKk} text={currentTerm.kk} active={activeLang === 'kk'} />
              <TermLangRow label={s.langRu} text={currentTerm.ru} active={activeLang === 'ru'} />
              <TermLangRow label={s.langEn} text={currentTerm.en} active={activeLang === 'en'} />
            </div>

            {isCurrentStudied ? (
              <div className="mission-term-confirmed">
                <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                {s.markedStudiedLabel}
              </div>
            ) : (
              <button type="button" className="mission-term-confirm" onClick={handleMarkStudied}>
                <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                {s.markStudiedCta}
              </button>
            )}

            <div className="mission-term-nav">
              <button
                type="button"
                className="btn-auth-secondary mission-term-nav-btn"
                onClick={handleBack}
                disabled={viewIndex === 0}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {s.navBack}
              </button>
              <button
                type="button"
                className="btn-auth-primary mission-term-nav-btn"
                onClick={handleNext}
                disabled={!isCurrentStudied}
              >
                {s.navNext}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default MissionStudyPage
