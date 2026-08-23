import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useMissionTermStudy } from './useMissionTermStudy.js'
import { buildQuestions } from './missionQuestionBuilder.js'
import { isMissionScorePassing } from '../../utils/missionScoreTier.js'

const OPERATION_STAGE_COUNT = 4

// The operation only exists as a reward for clearing the quiz, and needs to
// survive a page refresh (it's a real route). So rather than trust
// navigation state for the score that unlocked it, this re-derives
// clearance from the user's own latest mission_test_attempts row — the
// single source of truth also used by useMissionsProgress.
export function useMissionOperation(mission) {
  const { user } = useAuth()
  const { terms, loading: termsLoading } = useMissionTermStudy(mission)

  const [scoreState, setScoreState] = useState({ loading: true, percent: null, cleared: false })
  const [checks, setChecks] = useState([])
  const [stageIndex, setStageIndex] = useState(0)
  const [pendingOptionId, setPendingOptionId] = useState(null)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [completedStages, setCompletedStages] = useState(new Set())
  const [phase, setPhase] = useState('running') // running | complete
  const [saved, setSaved] = useState(false)
  const [isNewAchievement, setIsNewAchievement] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user || !mission) {
      setScoreState({ loading: false, percent: null, cleared: false })
      return
    }
    supabase
      .from('mission_test_attempts')
      .select('score_percent')
      .eq('user_id', user.id)
      .eq('mission_id', mission.id)
      .order('score_percent', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return
        const best = !error && data && data.length > 0 ? data[0].score_percent : null
        setScoreState({ loading: false, percent: best, cleared: best !== null && isMissionScorePassing(best) })
      })
    return () => {
      cancelled = true
    }
  }, [user, mission])

  useEffect(() => {
    if (termsLoading || terms.length === 0 || checks.length > 0) return
    setChecks(buildQuestions(terms, Math.min(OPERATION_STAGE_COUNT, terms.length)))
  }, [termsLoading, terms, checks.length])

  const currentCheck = checks[stageIndex] || null

  const selectOption = useCallback(
    (optionId) => {
      if (feedback === 'correct') return
      setPendingOptionId(optionId)
      setFeedback(null)
    },
    [feedback],
  )

  const confirm = useCallback(() => {
    if (pendingOptionId === null || !currentCheck || feedback === 'correct') return
    const correct = pendingOptionId === currentCheck.correctId
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) setCompletedStages((current) => new Set(current).add(stageIndex))
  }, [pendingOptionId, currentCheck, feedback, stageIndex])

  const advance = useCallback(() => {
    if (feedback !== 'correct') return
    if (stageIndex < checks.length - 1) {
      setStageIndex((i) => i + 1)
      setPendingOptionId(null)
      setFeedback(null)
    } else {
      setPhase('complete')
    }
  }, [feedback, stageIndex, checks.length])

  const saveCompletion = useCallback(async () => {
    if (!user || !mission || saved || scoreState.percent === null) return
    const { data: priorRows } = await supabase
      .from('mission_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('mission_id', mission.id)
      .limit(1)
    const isFirstCompletion = !priorRows || priorRows.length === 0

    const { error } = await supabase.from('mission_completions').insert({
      user_id: user.id,
      mission_id: mission.id,
      category: mission.categoryKey,
      score_percent: scoreState.percent,
    })
    if (!error) {
      setSaved(true)
      setIsNewAchievement(isFirstCompletion)
    }
  }, [user, mission, saved, scoreState.percent])

  useEffect(() => {
    if (phase === 'complete') saveCompletion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return {
    scoreLoading: scoreState.loading,
    percent: scoreState.percent,
    cleared: scoreState.cleared,
    termsLoading,
    ready: checks.length > 0,
    stageIndex,
    totalStages: checks.length,
    currentCheck,
    pendingOptionId,
    feedback,
    completedStages,
    selectOption,
    confirm,
    advance,
    phase,
    saved,
    isNewAchievement,
  }
}
