import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useToast } from '../../components/ToastContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

export function useFavoriteTerms() {
  const { user, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set())
      setTerms([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: favRows } = await supabase
      .from('term_favorites')
      .select('term_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setFavoriteIds(new Set((favRows || []).map((row) => row.term_id)))

    if (!favRows || favRows.length === 0) {
      setTerms([])
      setLoading(false)
      return
    }

    const { data: termRows } = await supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .in('id', favRows.map((row) => row.term_id))

    const byId = new Map((termRows || []).map((term) => [term.id, term]))
    setTerms(favRows.map((row) => byId.get(row.term_id)).filter(Boolean))
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const toggleFavorite = useCallback(
    async (term) => {
      if (!isAuthenticated || !user) {
        showToast(t.termFavorites.signInRequired, { type: 'error' })
        return
      }
      const isFav = favoriteIds.has(term.id)

      if (isFav) {
        setFavoriteIds((current) => {
          const next = new Set(current)
          next.delete(term.id)
          return next
        })
        setTerms((current) => current.filter((existing) => existing.id !== term.id))
        const { error: deleteError } = await supabase
          .from('term_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('term_id', term.id)
        if (deleteError) {
          await fetchFavorites()
          return
        }
        showToast(t.termFavorites.removed)
      } else {
        setFavoriteIds((current) => new Set(current).add(term.id))
        setTerms((current) => [term, ...current])
        const { error: insertError } = await supabase
          .from('term_favorites')
          .insert({ user_id: user.id, term_id: term.id })
        if (insertError) {
          await fetchFavorites()
          return
        }
        showToast(t.termFavorites.added)
      }
    },
    [favoriteIds, isAuthenticated, user, showToast, t, fetchFavorites],
  )

  return { favoriteIds, terms, loading, toggleFavorite }
}
