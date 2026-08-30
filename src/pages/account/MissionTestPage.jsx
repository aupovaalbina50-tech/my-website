import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations.js'
import { MISSIONS } from '../../data/missions.js'
import { useMissionQuiz } from './useMissionQuiz.js'

const LANG_TAG = { kk: 'KZ', ru: 'RU', en: 'EN' }
const TIER_ICON = { excellent: Trophy, passed: CheckCircle2, needs_practice: AlertTriangle, failed: RotateCcw }
const SCORE_CLASS = { excellent: 'good', passed: 'good', needs_practice: 'mid', failed: 'low' }

function ScoreRing({ percent, scoreClass }) {
  const size = 128
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference

  return (
    <div className="mission-score-ring-wrap">
      <svg className="mission-score-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="mission-score-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className={`mission-score-ring-fill mission-score-ring-fill--${scoreClass}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="mission-score-ring-percent">{percent}%</span>
    </div>
  )
}

function ResultsTransition({ quizLabel, readinessLabel, percent, operationLabel }) {
  return (
    <div className="mission-transition-chain">
      <div className="mission-transition-node" style={{ '--i': 0 }}>
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>{quizLabel}</span>
      </div>
      <span className="mission-transition-arrow" style={{ '--i': 1 }} aria-hidden="true">
        &darr;
      </span>
      <div className="mission-transition-node" style={{ '--i': 2 }}>
        <span className="mission-transition-value">{percent}%</span>
        <span>{readinessLabel}</span>
      </div>
      <span className="mission-transition-arrow" style={{ '--i': 3 }} aria-hidden="true">
        &darr;
      </span>
      <div className="mission-transition-node mission-transition-node--operation" style={{ '--i': 4 }}>
        <span>{operationLabel}</span>
      </div>
    </div>
  )
}

function MissionTestPage() {
  const { missionId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const s = t.account.missions.test

  const mission = MISSIONS.find((item) => item.id === missionId)
  const quiz = useMissionQuiz(mission)

  const goToMission = () => navigate(`/account/missions/mission/${missionId}`)
  const goToStudy = () => navigate(`/account/missions/mission/${missionId}/study`)

  useEffect(() => {
    if (!mission) navigate('/account/missions', { state: { stage: 'list' } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission])

  if (!mission) {
    return null
  }

  const category = CATEGORIES.find((c) => c.key === mission.categoryKey)

  if (quiz.stage === 'quiz' && quiz.currentQuestion) {
    const q = quiz.currentQuestion
    const questionNumber = quiz.currentIndex + 1
    const progressPercent = Math.round((questionNumber / quiz.totalQuestions) * 100)

    return (
      <div className="mission-page">
        <button type="button" className="mission-brief-back" onClick={goToMission}>
          <ArrowLeft size={16} aria-hidden="true" />
          {s.back}
        </button>

        <div className="card quiz-card">
          <div className="quiz-progress-row">
            <span className="quiz-progress-badge">{s.quiz.questionLabel(questionNumber, quiz.totalQuestions)}</span>
            <span className="mission-quiz-score">{s.quiz.correctCount(quiz.score)}</span>
          </div>
          <div className="quiz-progress-track">
            <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mission-quiz-tag">
            {LANG_TAG[q.fromLang]} &rarr; {LANG_TAG[q.toLang]}
          </div>
          <p className="quiz-prompt-label">{s.quiz.instruction(q.fromLang, q.toLang)}</p>
          <h2 className="quiz-term">{q.prompt}</h2>

          <div className="quiz-options">
            {q.options.map((option) => {
              const isPending = quiz.pendingOptionId === option.id
              const isCorrectOption = option.id === q.correctId
              let stateClass = ''
              if (quiz.confirmed) {
                if (isCorrectOption) stateClass = ' correct'
                else if (isPending) stateClass = ' wrong'
              } else if (isPending) {
                stateClass = ' selected'
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`quiz-option${stateClass}`}
                  disabled={!!quiz.confirmed}
                  onClick={() => quiz.selectOption(option.id)}
                >
                  <span className="quiz-option-text">{option.text}</span>
                  {quiz.confirmed && stateClass === ' correct' && (
                    <CheckCircle2 size={22} className="quiz-option-icon" aria-hidden="true" />
                  )}
                  {quiz.confirmed && stateClass === ' wrong' && (
                    <XCircle size={22} className="quiz-option-icon" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>

          {quiz.confirmed && (
            <div className={`mission-quiz-feedback${quiz.confirmed.correct ? ' mission-quiz-feedback--correct' : ' mission-quiz-feedback--wrong'}`}>
              {quiz.confirmed.correct ? (
                <>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  {s.quiz.correctTitle} &middot; {s.quiz.correctText}
                </>
              ) : (
                <>
                  <XCircle size={18} aria-hidden="true" />
                  {s.quiz.wrongTitle}. {s.quiz.correctAnswerLabel(q.options.find((o) => o.id === q.correctId)?.text)}
                </>
              )}
            </div>
          )}

          {!quiz.confirmed ? (
            <button
              type="button"
              className="btn-auth-primary quiz-next-btn"
              onClick={quiz.confirmAnswer}
              disabled={quiz.pendingOptionId === null}
            >
              {s.quiz.answerCta}
            </button>
          ) : (
            <button type="button" className="btn-auth-primary quiz-next-btn" onClick={quiz.goNext}>
              {s.quiz.nextCta}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (quiz.stage === 'results') {
    const r = s.results
    const tier = r.tiers[quiz.status]
    const TierIcon = TIER_ICON[quiz.status]
    const passed = quiz.status === 'passed' || quiz.status === 'excellent'

    return (
      <div className="mission-page">
        <button type="button" className="mission-brief-back" onClick={goToMission}>
          <ArrowLeft size={16} aria-hidden="true" />
          {s.back}
        </button>

        <div className="account-home">
          <div className="account-card mission-results-card">
            <h1 className="account-title">{r.title}</h1>

            <ScoreRing percent={quiz.percent} scoreClass={SCORE_CLASS[quiz.status]} />

            <p className="mission-results-fraction">
              {quiz.score} / {quiz.totalQuestions}
            </p>

            <div className="mission-results-breakdown">
              <span>
                <CheckCircle2 size={15} aria-hidden="true" /> {r.correctLabel}: {quiz.score}
              </span>
              <span>
                <XCircle size={15} aria-hidden="true" /> {r.wrongLabel}: {quiz.totalQuestions - quiz.score}
              </span>
              <span>
                <BookOpen size={15} aria-hidden="true" /> {r.studiedLabel(quiz.studiedCount, quiz.studiedTermsCount)}
              </span>
            </div>

            <span className={`mission-results-status mission-results-status--${SCORE_CLASS[quiz.status]}`}>
              <TierIcon size={14} aria-hidden="true" /> {r.statusLabels[quiz.status]}
            </span>

            <div className="mission-readiness-block">
              <p className="mission-readiness-intro">{r.readinessIntro}</p>
              <p className="mission-readiness-title">{r.readinessTitle}</p>
              <p className="account-description mission-results-tier-title">{tier.title}</p>
              <p className="account-description">{tier.text}</p>
              {passed && <p className="mission-readiness-ready">{r.readinessTextReady(mission.title[lang])}</p>}
            </div>

            {passed && (
              <ResultsTransition
                quizLabel={r.transition.quizLabel}
                readinessLabel={r.transition.readinessLabel}
                percent={quiz.percent}
                operationLabel={r.transition.operationLabel(mission.title[lang])}
              />
            )}

            {passed && (
              <div className="mission-rule mission-results-confirm">
                <span className="mission-rule-icon" aria-hidden="true">
                  <CheckCircle2 size={22} strokeWidth={2} />
                </span>
                <div>
                  <h3 className="mission-rule-title">{r.confirmedTitle}</h3>
                  <p className="mission-rule-text">{r.confirmedText(category?.[lang])}</p>
                </div>
              </div>
            )}

            <div className="quiz-result-actions">
              {passed && (
                <button
                  type="button"
                  className="btn-auth-primary"
                  onClick={() => navigate(`/account/missions/mission/${missionId}/execute`)}
                >
                  {r.continueCta}
                </button>
              )}
              {quiz.status === 'needs_practice' && (
                <>
                  <button type="button" className="btn-auth-secondary" onClick={goToStudy}>
                    {r.repeatTermsCta}
                  </button>
                  <button type="button" className="btn-auth-primary" onClick={quiz.retry}>
                    {r.retryCta}
                  </button>
                </>
              )}
              {quiz.status === 'failed' && (
                <button type="button" className="btn-auth-primary" onClick={goToStudy}>
                  {r.backToStudyCta}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mission-page">
      <button type="button" className="mission-brief-back" onClick={goToMission}>
        <ArrowLeft size={16} aria-hidden="true" />
        {s.back}
      </button>

      <div className="mission-brief-head">
        <div className="mission-brief-head-text">
          <span className="mission-brief-crumb">{s.intro.eyebrow}</span>
          <h1 className="mission-brief-title">{s.intro.title}</h1>
          <p className="mission-brief-subtitle">{s.intro.subtitle}</p>
        </div>
      </div>

      {quiz.termsLoading ? (
        <div className="card">
          <p className="empty-state-text">{t.account.missions.study.loading}</p>
        </div>
      ) : !quiz.canStart ? (
        <div className="card">
          <p className="empty-state-text">{s.intro.noTerms}</p>
        </div>
      ) : (
        <div className="card mission-test-intro-card">
          <div className="mission-test-intro-stats">
            <span className="category-badge">{s.intro.statTerms(quiz.studiedTermsCount)}</span>
            <span className="category-badge">{s.intro.statLangs}</span>
            <span className="category-badge">{s.intro.statType}</span>
          </div>
          <button type="button" className="btn-auth-primary quiz-start-btn mission-cta" onClick={quiz.start}>
            {s.intro.startCta}
          </button>
        </div>
      )}
    </div>
  )
}

export default MissionTestPage
