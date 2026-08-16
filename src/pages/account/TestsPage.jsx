import { CheckCircle2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations'
import { toSentenceCase } from '../../utils/textCase.js'
import { scoreTier } from '../../utils/scoreTier.js'
import { QUESTION_COUNT_OPTIONS, useTestQuiz } from './useTestQuiz.js'

function TestsPage() {
  const { lang, t } = useLanguage()
  const tt = t.tests
  const quiz = useTestQuiz()

  if (quiz.stage === 'setup') {
    return (
      <div className="account-home">
        <div className="account-card">
          <h1 className="account-title">{tt.setup.title}</h1>
          <p className="account-description">{tt.setup.subtitle}</p>
        </div>

        <div className="card quiz-setup-card">
          {quiz.loading ? (
            <p className="empty-state-text">{tt.setup.loading}</p>
          ) : (
            <>
              <label className="quiz-setup-field">
                <span className="quiz-setup-label">{tt.setup.categoryLabel}</span>
                <select
                  className="category-filter quiz-setup-select"
                  value={quiz.category}
                  onChange={(e) => quiz.setCategory(e.target.value)}
                >
                  <option value="">{tt.setup.allCategories}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat[lang]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="quiz-setup-field">
                <span className="quiz-setup-label">{tt.setup.questionCountLabel}</span>
                <div className="quiz-count-chips">
                  {QUESTION_COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`chip quiz-count-chip${quiz.questionCount === n ? ' active' : ''}`}
                      onClick={() => quiz.setQuestionCount(n)}
                    >
                      {tt.setup.questionsOption(n)}
                    </button>
                  ))}
                </div>
              </div>

              {!quiz.canStart && <p className="quiz-warning">{tt.setup.notEnoughTerms}</p>}

              <button
                type="button"
                className="btn-auth-primary quiz-start-btn"
                disabled={!quiz.canStart}
                onClick={quiz.start}
              >
                {tt.setup.startButton}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (quiz.stage === 'quiz') {
    const { currentQuestion } = quiz
    if (!currentQuestion) return null
    const questionNumber = quiz.currentIndex + 1
    const progressPercent = Math.round((questionNumber / quiz.totalQuestions) * 100)

    return (
      <div className="account-home">
        <div className="card quiz-card">
          <div className="quiz-progress-row">
            <span className="quiz-progress-badge">
              {tt.quiz.progress(questionNumber, quiz.totalQuestions)}
            </span>
          </div>
          <div className="quiz-progress-track">
            <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <p className="quiz-prompt-label">{tt.quiz.prompt(lang, quiz.answerLang)}</p>
          <h2 className="quiz-term">{toSentenceCase(currentQuestion.term[lang])}</h2>

          <div className="quiz-options">
            {currentQuestion.options.map((option) => {
              const isSelected = quiz.selectedOptionId === option.id
              const isCorrectOption = option.id === currentQuestion.term.id
              let stateClass = ''
              if (quiz.selectedOptionId !== null) {
                if (isCorrectOption) stateClass = ' correct'
                else if (isSelected) stateClass = ' wrong'
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`quiz-option${stateClass}`}
                  disabled={quiz.selectedOptionId !== null}
                  onClick={() => quiz.selectOption(option.id)}
                >
                  <span className="quiz-option-text">{toSentenceCase(option.text)}</span>
                  {stateClass === ' correct' && (
                    <CheckCircle2 size={22} className="quiz-option-icon" aria-hidden="true" />
                  )}
                  {stateClass === ' wrong' && (
                    <XCircle size={22} className="quiz-option-icon" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>

          {quiz.selectedOptionId !== null && (
            <button type="button" className="btn-auth-primary quiz-next-btn" onClick={quiz.goNext}>
              {quiz.isLastQuestion ? tt.quiz.finish : tt.quiz.next}
            </button>
          )}
        </div>
      </div>
    )
  }

  const percent =
    quiz.totalQuestions > 0 ? Math.round((quiz.score / quiz.totalQuestions) * 100) : 0
  const tier = scoreTier(percent)
  const message = tier === 'good' ? tt.results.excellent : tier === 'mid' ? tt.results.good : tt.results.tryAgain

  return (
    <div className="account-home">
      <div className="account-card">
        <h1 className="account-title">{tt.results.title}</h1>
        <p className={`quiz-result-score quiz-result-score--${tier}`}>
          {tt.results.score(quiz.score, quiz.totalQuestions)}
        </p>
        <p className="account-description">{message}</p>
        {quiz.saveError && <p className="quiz-warning">{tt.results.saveFailed}</p>}
        <div className="quiz-result-actions">
          <button type="button" className="btn-auth-primary" onClick={quiz.restart}>
            {tt.results.restart}
          </button>
          <Link to="/account" className="btn-auth-secondary">
            {tt.results.backToDashboard}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TestsPage
