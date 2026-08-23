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
export function useMissionTermStudy(mission) {
  const { user, isAuthenticated } = useAuth()
  const [terms, setTerms] = useState([])
  const [studiedIds, setStudiedIds] = useState(new Set())
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
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .eq('category', mission.categoryKey)
      .order('kk', { ascending: true })
      .limit(mission.requiredTerms)

    const loadedTerms = termRows || []
    setTerms(loadedTerms)

    if (user && loadedTerms.length > 0) {
      const { data: progressRows, error } = await supabase
        .from('mission_term_progress')
        .select('term_id')
        .eq('user_id', user.id)
        .eq('mission_id', mission.id)

      if (error) {
        setPersistenceAvailable(false)
        setStudiedIds(new Set())
      } else {
        setPersistenceAvailable(true)
        setStudiedIds(new Set((progressRows || []).map((row) => row.term_id)))
      }
    } else {
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

      const { error } = await supabase
        .from('mission_term_progress')
        .upsert(
          { user_id: user.id, mission_id: mission.id, term_id: termId },
          { onConflict: 'user_id,mission_id,term_id' },
        )
      if (error) setPersistenceAvailable(false)
    },
    [isAuthenticated, user, mission?.id, persistenceAvailable],
  )

  return { terms, studiedIds, markStudied, loading, persistenceAvailable }
}
