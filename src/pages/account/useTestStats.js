import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'

export function useTestStats() {
  const { user } = useAuth()
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!user) {
      setAttempts([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    supabase
      .from('test_attempts')
      .select('id, category, total_questions, correct_answers, score_percent, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (!error && data) setAttempts(data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  const summary = useMemo(() => {
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        overallAccuracy: 0,
        bestScore: 0,
        averageScore: 0,
      }
    }
    const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0)
    const totalCorrect = attempts.reduce((sum, a) => sum + a.correct_answers, 0)
    const bestScore = Math.max(...attempts.map((a) => a.score_percent))
    const averageScore = Math.round(
      attempts.reduce((sum, a) => sum + a.score_percent, 0) / attempts.length,
    )
    return {
      totalAttempts: attempts.length,
      totalQuestions,
      totalCorrect,
      overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      bestScore,
      averageScore,
    }
  }, [attempts])

  const byCategory = useMemo(() => {
    const groups = new Map()
    for (const attempt of attempts) {
      if (!attempt.category) continue
      const group = groups.get(attempt.category) || {
        category: attempt.category,
        attempts: 0,
        totalQuestions: 0,
        totalCorrect: 0,
      }
      group.attempts += 1
      group.totalQuestions += attempt.total_questions
      group.totalCorrect += attempt.correct_answers
      groups.set(attempt.category, group)
    }
    return [...groups.values()]
      .map((group) => ({
        ...group,
        accuracy:
          group.totalQuestions > 0
            ? Math.round((group.totalCorrect / group.totalQuestions) * 100)
            : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
  }, [attempts])

  return {
    loading,
    attempts,
    recentAttempts: attempts.slice(0, 10),
    summary,
    byCategory,
  }
}
