import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

export const QUESTION_COUNT_OPTIONS = [5, 10, 15]
const OPTIONS_PER_QUESTION = 4

function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function useTestQuiz() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const answerLang = lang === 'kk' ? 'ru' : 'kk'

  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [questionCount, setQuestionCount] = useState(10)

  const [stage, setStage] = useState('setup') // setup | quiz | results
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState(null)
  const [answers, setAnswers] = useState([])
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('terms')
      .select('id, ru, kk, en, category')
      .then(({ data, error }) => {
        if (!active) return
        if (!error && data) setTerms(data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const pool = useMemo(() => {
    const base = category ? terms.filter((term) => term.category === category) : terms
    return base.filter((term) => term[lang]?.trim() && term[answerLang]?.trim())
  }, [terms, category, lang, answerLang])

  // Terms whose text is identical in both languages (e.g. borrowed words like
  // "анемометр") make a useless question — the "correct answer" would just
  // repeat the prompt, so they're excluded from the pool a question can be
  // drawn from (they can still appear as distractor options).
  const questionPool = useMemo(
    () =>
      pool.filter(
        (term) => term[lang].trim().toLowerCase() !== term[answerLang].trim().toLowerCase(),
      ),
    [pool, lang, answerLang],
  )

  const canStart = questionPool.length >= 1 && pool.length >= OPTIONS_PER_QUESTION

  const start = useCallback(() => {
    if (questionPool.length === 0 || pool.length < OPTIONS_PER_QUESTION) return

    const shuffledPool = shuffle(questionPool)
    const count = Math.min(questionCount, shuffledPool.length)
    const picked = shuffledPool.slice(0, count)

    const built = picked.map((term) => {
      const distractors = shuffle(pool.filter((t) => t.id !== term.id)).slice(
        0,
        OPTIONS_PER_QUESTION - 1,
      )
      const options = shuffle([term, ...distractors]).map((t) => ({
        id: t.id,
        text: t[answerLang],
      }))
      return { term, options }
    })

    setQuestions(built)
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setAnswers([])
    setSaveError(false)
    setStage('quiz')
  }, [pool, questionPool, questionCount, answerLang])

  const currentQuestion = questions[currentIndex] || null
  const isLastQuestion = currentIndex === questions.length - 1

  const selectOption = useCallback(
    (optionId) => {
      if (selectedOptionId !== null || !currentQuestion) return
      setSelectedOptionId(optionId)
      const correct = optionId === currentQuestion.term.id
      setAnswers((current) => [...current, { term: currentQuestion.term, correct }])
    },
    [selectedOptionId, currentQuestion],
  )

  const saveAttempt = useCallback(
    async (finalAnswers) => {
      if (!user || finalAnswers.length === 0) return
      const correctCount = finalAnswers.filter((a) => a.correct).length
      const { data: attempt, error } = await supabase
        .from('test_attempts')
        .insert({
          user_id: user.id,
          category: category || null,
          total_questions: finalAnswers.length,
          correct_answers: correctCount,
          score_percent: Math.round((correctCount / finalAnswers.length) * 100),
        })
        .select()
        .single()

      if (error || !attempt) {
        setSaveError(true)
        return
      }

      await supabase.from('test_answers').insert(
        finalAnswers.map((a) => ({
          attempt_id: attempt.id,
          user_id: user.id,
          term_id: a.term.id,
          is_correct: a.correct,
        })),
      )
    },
    [user, category],
  )

  const goNext = useCallback(() => {
    if (isLastQuestion) {
      setStage('results')
      saveAttempt(answers)
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelectedOptionId(null)
  }, [isLastQuestion, answers, saveAttempt])

  const restart = useCallback(() => {
    setStage('setup')
    setQuestions([])
    setCurrentIndex(0)
    setSelectedOptionId(null)
    setAnswers([])
  }, [])

  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers])

  return {
    loading,
    category,
    setCategory,
    questionCount,
    setQuestionCount,
    canStart,
    poolSize: pool.length,
    start,
    stage,
    currentQuestion,
    currentIndex,
    totalQuestions: questions.length,
    selectedOptionId,
    selectOption,
    goNext,
    isLastQuestion,
    restart,
    score,
    answerLang,
    saveError,
  }
}
