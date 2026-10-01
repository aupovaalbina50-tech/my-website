import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useMissionTermStudy } from './useMissionTermStudy.js'
import { isMissionScorePassing } from '../../utils/missionScoreTier.js'

// Real status of each stage of the mission's CURRENT run (see
// useMissionTermStudy for what a run is), for the stage list on the mission
// page. Stage 1 is only "done" once every term in the mission's list has
// actually been marked studied during this run; stage 2 unlocks after that
// and is done once a passing quiz attempt was recorded during this run.
export function useMissionStageStatus(mission) {
  const { user } = useAuth()
  const { terms, studiedIds, runStartedAt, loading: studyLoading } = useMissionTermStudy(mission)
  const [testPassed, setTestPassed] = useState(false)
  const [testLoading, setTestLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (studyLoading) return undefined
    if (!user || !mission) {
      setTestPassed(false)
      setTestLoading(false)
      return undefined
    }
    let query = supabase
      .from('mission_test_attempts')
      .select('score_percent')
      .eq('user_id', user.id)
      .eq('mission_id', mission.id)
    if (runStartedAt) query = query.gt('created_at', runStartedAt)
    query.then(({ data, error }) => {
      if (cancelled) return
      setTestPassed(!error && (data || []).some((row) => isMissionScorePassing(row.score_percent)))
      setTestLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user, mission?.id, runStartedAt, studyLoading])

  const total = terms.length
  const studied = studiedIds.size
  const studyDone = total > 0 && studied >= total

  return {
    loading: studyLoading || testLoading,
    studied,
    total,
    studyDone,
    testPassed: studyDone && testPassed,
  }
}
