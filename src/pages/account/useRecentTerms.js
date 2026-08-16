import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'

export function useRecentTerms() {
  const { user } = useAuth()
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRecentTerms = useCallback(async () => {
    if (!user) {
      setTerms([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: views } = await supabase
      .from('term_views')
      .select('term_id, viewed_at')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(20)

    if (!views || views.length === 0) {
      setTerms([])
      setLoading(false)
      return
    }

    const { data: termRows } = await supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .in('id', views.map((v) => v.term_id))

    const byId = new Map((termRows || []).map((term) => [term.id, term]))
    setTerms(views.map((v) => byId.get(v.term_id)).filter(Boolean))
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchRecentTerms()
  }, [fetchRecentTerms])

  return { terms, loading }
}
