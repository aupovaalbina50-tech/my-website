import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useMissionTermStudy } from './useMissionTermStudy.js'
import { missionScoreTier } from '../../utils/missionScoreTier.js'
import { buildQuestions } from './missionQuestionBuilder.js'

const TARGET_QUESTION_COUNT = 15

export function useMissionQuiz(mission) {
  const { user } = useAuth()
  const { terms, studiedIds, loading: termsLoading } = useMissionTermStudy(mission)

  const [stage, setStage] = useState('intro') // intro | quiz | results
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pendingOptionId, setPendingOptionId] = useState(null)
  const [confirmed, setConfirmed] = useState(null) // { optionId, correct } | null
  const [answers, setAnswers] = useState([])
  const [saving, setSaving] = useState(false)

  const canStart = terms.length > 0

  const start = useCallback(() => {
    if (!canStart) return
    setQuestions(buildQuestions(terms, TARGET_QUESTION_COUNT))
    setCurrentIndex(0)
    setPendingOptionId(null)
    setConfirmed(null)
    setAnswers([])
    setStage('quiz')
  }, [terms, canStart])

  const currentQuestion = questions[currentIndex] || null
  const isLastQuestion = currentIndex === questions.length - 1

  const selectOption = useCallback(
    (optionId) => {
      if (confirmed) return
      setPendingOptionId(optionId)
    },
    [confirmed],
  )

  const confirmAnswer = useCallback(() => {
    if (pendingOptionId === null || confirmed || !currentQuestion) return
    const correct = pendingOptionId === currentQuestion.correctId
    setConfirmed({ optionId: pendingOptionId, correct })
    setAnswers((current) => [...current, { term: currentQuestion.term, correct }])
  }, [pendingOptionId, confirmed, currentQuestion])

  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers])
  const totalQuestions = questions.length
  const percent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const status = missionScoreTier(percent)

  const saveAttempt = useCallback(async () => {
    if (!user || !mission || totalQuestions === 0) return
    setSaving(true)
    await supabase.from('mission_test_attempts').insert({
      user_id: user.id,
      mission_id: mission.id,
      total_questions: totalQuestions,
      correct_answers: score,
      score_percent: percent,
      status,
    })
    setSaving(false)
  }, [user, mission, totalQuestions, score, percent, status])

  const goNext = useCallback(() => {
    if (!confirmed) return
    if (isLastQuestion) {
      setStage('results')
      saveAttempt()
      return
    }
    setCurrentIndex((i) => i + 1)
    setPendingOptionId(null)
    setConfirmed(null)
  }, [confirmed, isLastQuestion, saveAttempt])

  const retry = useCallback(() => {
    start()
  }, [start])

  return {
    termsLoading,
    canStart,
    studiedTermsCount: terms.length,
    studiedCount: studiedIds.size,
    stage,
    start,
    currentQuestion,
    currentIndex,
    totalQuestions,
    pendingOptionId,
    confirmed,
    selectOption,
    confirmAnswer,
    goNext,
    isLastQuestion,
    score,
    percent,
    status,
    saving,
    retry,
  }
}
