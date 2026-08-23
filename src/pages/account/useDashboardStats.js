import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'

export function useDashboardStats() {
  const { user } = useAuth()
  const [totalTerms, setTotalTerms] = useState(null)
  const [totalTermsError, setTotalTermsError] = useState(false)
  const [historyCount, setHistoryCount] = useState(null)
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setTotalTerms(null)
    setTotalTermsError(false)
    supabase
      .from('terms')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (cancelled) return
        if (error) setTotalTermsError(true)
        else setTotalTerms(count ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setHistoryCount(0)
      setHistoryError(false)
      return undefined
    }
    setHistoryCount(null)
    setHistoryError(false)
    supabase
      .from('term_views')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count, error }) => {
        if (cancelled) return
        if (error) setHistoryError(true)
        else setHistoryCount(count ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return { totalTerms, totalTermsError, historyCount, historyError }
}
