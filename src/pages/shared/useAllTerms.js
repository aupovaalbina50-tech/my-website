import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export function useAllTerms() {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('terms')
      .select('id, kk, ru, en, category, audio_kk, audio_ru, audio_en')
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(true)
        } else {
          setTerms(data ?? [])
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { terms, loading, error }
}
