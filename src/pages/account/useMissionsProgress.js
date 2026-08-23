import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { MISSIONS } from '../../data/missions.js'

function defaultState() {
  return Object.fromEntries(
    MISSIONS.map((mission) => [
      mission.id,
      { status: 'not_started', studied: 0, total: mission.requiredTerms, score: null, completedAt: null },
    ]),
  )
}

// Real per-user progress. studied-term counts come from mission_term_progress
// (0012), best quiz score per mission from mission_test_attempts (0013), and
// final "completed" status + date from mission_completions (0014) — passing
// the quiz only grants clearance to start the Step 3 operation, it is
// finishing THAT which marks a mission done, so status only reaches
// 'completed' once a completion row exists. A mission that was quizzed but
// never finished the operation stays 'in_progress'. `score` is the best
// quiz score on record (motivational — never regresses on a worse retry);
// per-mission best/last/attempt-count history lives in
// useMissionAttemptStats, used only where that detail is shown. If any of
// these tables hasn't been created yet in the live project, this falls
// back to the original all-not_started defaults instead of throwing.
export function useMissionsProgress() {
  const { user } = useAuth()
  const [missionState, setMissionState] = useState(defaultState)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setMissionState(defaultState())
      setLoading(false)
      return
    }
    setLoading(true)

    const [
      { data: studyRows, error: studyError },
      { data: attemptRows, error: attemptError },
      { data: completionRows, error: completionError },
    ] = await Promise.all([
      supabase.from('mission_term_progress').select('mission_id, term_id').eq('user_id', user.id),
      supabase.from('mission_test_attempts').select('mission_id, score_percent').eq('user_id', user.id),
      supabase
        .from('mission_completions')
        .select('mission_id, score_percent, completed_at')
        .eq('user_id', user.id),
    ])

    if (studyError || attemptError || completionError) {
      setMissionState(defaultState())
      setLoading(false)
      return
    }

    const studiedCountByMission = new Map()
    ;(studyRows || []).forEach((row) => {
      studiedCountByMission.set(row.mission_id, (studiedCountByMission.get(row.mission_id) || 0) + 1)
    })

    const bestScoreByMission = new Map()
    ;(attemptRows || []).forEach((row) => {
      const current = bestScoreByMission.get(row.mission_id)
      if (current === undefined || row.score_percent > current) {
        bestScoreByMission.set(row.mission_id, row.score_percent)
      }
    })

    const completionByMission = new Map()
    ;(completionRows || []).forEach((row) => {
      const current = completionByMission.get(row.mission_id)
      if (!current || new Date(row.completed_at) > new Date(current.completedAt)) {
        completionByMission.set(row.mission_id, { score: row.score_percent, completedAt: row.completed_at })
      }
    })

    const next = Object.fromEntries(
      MISSIONS.map((mission) => {
        const studied = Math.min(studiedCountByMission.get(mission.id) || 0, mission.requiredTerms)
        const bestScore = bestScoreByMission.has(mission.id) ? bestScoreByMission.get(mission.id) : null
        const completion = completionByMission.get(mission.id) || null
        const status =
          completion !== null ? 'completed' : studied > 0 || bestScore !== null ? 'in_progress' : 'not_started'
        const score = completion !== null ? Math.max(completion.score, bestScore ?? 0) : bestScore
        return [
          mission.id,
          { status, studied, total: mission.requiredTerms, score, completedAt: completion?.completedAt ?? null },
        ]
      }),
    )

    setMissionState(next)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const completedCount = Object.values(missionState).filter((s) => s.status === 'completed').length

  return { missionState, completedCount, loading, refresh: load }
}
