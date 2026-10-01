import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'

// Pulls the mission's terms straight from the real `terms` table (never a
// fabricated list) and tracks which of them the user has explicitly
// confirmed as studied for THIS mission, via mission_term_progress
// (migration 0012). If that table hasn't been created yet in the live
// project, writes/reads fail gracefully and progress just stays
// session-local instead of throwing — the study flow still works, it
// simply won't survive a refresh until the migration is applied.
//
// Missions are replayable, so "studied" is scoped to the CURRENT run: a run
// starts right after the user's latest mission_completions row (0014) for
// this mission, or at the beginning if they never finished it. Only marks
// made after that point count. Re-marking a term on a later run bumps its
// studied_at (0020 adds the UPDATE policy + trigger for that), so the run's
// progress is read back from the database and survives a refresh, while
// earlier completions — the user's overall progress — are never touched.
export function useMissionTermStudy(mission) {
  const { user, isAuthenticated } = useAuth()
  const [terms, setTerms] = useState([])
  const [studiedIds, setStudiedIds] = useState(new Set())
  const [runStartedAt, setRunStartedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [persistenceAvailable, setPersistenceAvailable] = useState(true)

  const load = useCallback(async () => {
    if (!mission) {
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: termRows } = await supabase
      .from('terms')
      .select('id, ru, kk, en, category')
      .eq('category', mission.categoryKey)
      .order('kk', { ascending: true })
      .limit(mission.requiredTerms)

    const loadedTerms = termRows || []
    setTerms(loadedTerms)

    if (user && loadedTerms.length > 0) {
      const [{ data: progressRows, error }, { data: completionRows }] = await Promise.all([
        supabase
          .from('mission_term_progress')
          .select('term_id, studied_at')
          .eq('user_id', user.id)
          .eq('mission_id', mission.id),
        supabase
          .from('mission_completions')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('mission_id', mission.id)
          .order('completed_at', { ascending: false })
          .limit(1),
      ])

      const runStart = completionRows && completionRows.length > 0 ? completionRows[0].completed_at : null
      setRunStartedAt(runStart)

      if (error) {
        setPersistenceAvailable(false)
        setStudiedIds(new Set())
      } else {
        setPersistenceAvailable(true)
        // Only count terms that are in the mission's CURRENT list (the list is
        // the first N terms of the category, so new dictionary terms can shift
        // it) and that were marked during the current run.
        const currentIds = new Set(loadedTerms.map((term) => term.id))
        const runStartTime = runStart ? new Date(runStart).getTime() : null
        setStudiedIds(
          new Set(
            (progressRows || [])
              .filter((row) => currentIds.has(row.term_id))
              .filter((row) => runStartTime === null || new Date(row.studied_at).getTime() > runStartTime)
              .map((row) => row.term_id),
          ),
        )
      }
    } else {
      setRunStartedAt(null)
      setStudiedIds(new Set())
    }

    setLoading(false)
  }, [mission?.id, mission?.categoryKey, mission?.requiredTerms, user])

  useEffect(() => {
    load()
  }, [load])

  const markStudied = useCallback(
    async (termId) => {
      setStudiedIds((current) => {
        if (current.has(termId)) return current
        const next = new Set(current)
        next.add(termId)
        return next
      })

      if (!mission || !isAuthenticated || !user || !persistenceAvailable) return

      // On a repeat run the row already exists: the conflict path UPDATEs it,
      // and the 0020 trigger stamps studied_at = now(), moving it into this run.
      await supabase
        .from('mission_term_progress')
        .upsert(
          { user_id: user.id, mission_id: mission.id, term_id: termId },
          { onConflict: 'user_id,mission_id,term_id' },
        )
    },
    [isAuthenticated, user, mission?.id, persistenceAvailable],
  )

  return { terms, studiedIds, runStartedAt, markStudied, loading, persistenceAvailable }
}
