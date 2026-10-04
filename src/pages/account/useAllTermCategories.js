import { useEffect, useState } from 'react'
import { fetchAllTerms } from '../../utils/fetchAllTerms.js'

export function useAllTermCategories() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchAllTerms('id, category')
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setRows(data)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { rows, loading }
}
