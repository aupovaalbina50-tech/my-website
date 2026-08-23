import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'

function toDateKey(iso) {
  return new Date(iso).toISOString().slice(0, 10)
}

export function useActivityStreak() {
  const { user } = useAuth()
  const [activeDays, setActiveDays] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setActiveDays(new Set())
      setLoading(false)
      return undefined
    }
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - 30)

    Promise.all([
      supabase
        .from('term_views')
        .select('viewed_at')
        .eq('user_id', user.id)
        .gte('viewed_at', since.toISOString()),
      supabase
        .from('test_attempts')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString()),
    ]).then(([viewsRes, attemptsRes]) => {
      if (cancelled) return
      const days = new Set()
      ;(viewsRes.data || []).forEach((row) => days.add(toDateKey(row.viewed_at)))
      ;(attemptsRes.data || []).forEach((row) => days.add(toDateKey(row.created_at)))
      setActiveDays(days)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  return { activeDays, loading }
}
