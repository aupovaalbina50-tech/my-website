import { useEffect, useState } from 'react'
import { fetchAllTerms } from '../../utils/fetchAllTerms.js'

export function useAllTerms() {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAllTerms('id, kk, ru, en, category')
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
