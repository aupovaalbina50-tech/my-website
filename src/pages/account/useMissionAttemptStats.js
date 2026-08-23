import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'

// Full attempt history for a single mission — best score, most recent
// score, and attempt count — all derived from mission_test_attempts
// (0013), which is never pruned (see 0014 for the completion record).
// Used by MissionDetailPage's "already completed" view (spec: best
// result / last result / attempt count, none of it lost on retry).
export function useMissionAttemptStats(missionId) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ best: null, last: null, count: 0, loading: true })

  useEffect(() => {
    let cancelled = false
    if (!user || !missionId) {
      setStats({ best: null, last: null, count: 0, loading: false })
      return
    }
    setStats((current) => ({ ...current, loading: true }))
    supabase
      .from('mission_test_attempts')
      .select('score_percent, created_at')
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data || data.length === 0) {
          setStats({ best: null, last: null, count: 0, loading: false })
          return
        }
        const best = Math.max(...data.map((row) => row.score_percent))
        setStats({ best, last: data[0].score_percent, count: data.length, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [user, missionId])

  return stats
}
