import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useToast } from '../../components/ToastContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

export function useQuotes() {
  const { user, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [recentViews, setRecentViews] = useState([])
  const [stats, setStats] = useState(null)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('quotes')
      .select('id, quote_number, quote_text, author, view_count')
      .order('quote_number', { ascending: true })

    if (fetchError) {
      setError(t.quotes.toast.loadFailed)
    } else {
      setError('')
      setQuotes(data)
    }
    setLoading(false)
  }, [t])

  const fetchStats = useCallback(async () => {
    const { data, error: statsError } = await supabase.rpc('get_quote_stats')
    if (!statsError && data && data[0]) setStats(data[0])
  }, [])

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }
    const { data, error: favError } = await supabase
      .from('quote_favorites')
      .select('quote_id')
      .eq('user_id', user.id)
    if (!favError && data) setFavoriteIds(new Set(data.map((row) => row.quote_id)))
  }, [user])

  const fetchRecentViews = useCallback(async () => {
    if (!user) {
      setRecentViews([])
      return
    }
    const { data, error: viewsError } = await supabase
      .from('quote_views')
      .select('quote_id, viewed_at')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(20)
    if (!viewsError && data) setRecentViews(data)
  }, [user])

  useEffect(() => {
    fetchQuotes()
    fetchStats()
  }, [fetchQuotes, fetchStats])

  useEffect(() => {
    fetchFavorites()
    fetchRecentViews()
  }, [fetchFavorites, fetchRecentViews])

  const toggleFavorite = useCallback(
    async (quote) => {
      if (!isAuthenticated || !user) {
        showToast(t.quotes.toast.signInRequired, { type: 'error' })
        return
      }
      const isFav = favoriteIds.has(quote.id)

      if (isFav) {
        setFavoriteIds((current) => {
          const next = new Set(current)
          next.delete(quote.id)
          return next
        })
        const { error: deleteError } = await supabase
          .from('quote_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('quote_id', quote.id)
        if (deleteError) {
          setFavoriteIds((current) => new Set(current).add(quote.id))
          return
        }
        showToast(t.quotes.toast.favRemoved)
      } else {
        setFavoriteIds((current) => new Set(current).add(quote.id))
        const { error: insertError } = await supabase
          .from('quote_favorites')
          .insert({ user_id: user.id, quote_id: quote.id })
        if (insertError) {
          setFavoriteIds((current) => {
            const next = new Set(current)
            next.delete(quote.id)
            return next
          })
          return
        }
        showToast(t.quotes.toast.favAdded)
      }
    },
    [favoriteIds, isAuthenticated, user, showToast, t],
  )

  const copyQuote = useCallback(
    async (quote) => {
      const text = `«${quote.quote_text}»\n— ${quote.author}`
      try {
        await navigator.clipboard.writeText(text)
        showToast(t.quotes.toast.copied)
      } catch {
        /* clipboard unavailable in this browser context */
      }
    },
    [showToast, t],
  )

  const shareQuote = useCallback(
    async (quote) => {
      const url = `${window.location.origin}/quotes/${quote.quote_number}`
      const text = `«${quote.quote_text}» — ${quote.author}`

      if (navigator.share) {
        try {
          await navigator.share({ title: t.quotes.detail.pageTitle(quote.quote_number), text, url })
        } catch {
          /* user dismissed the native share sheet */
        }
        return
      }

      try {
        await navigator.clipboard.writeText(url)
        showToast(t.quotes.toast.linkCopied)
      } catch {
        /* clipboard unavailable in this browser context */
      }
    },
    [showToast, t],
  )

  const recordView = useCallback(
    async (quote) => {
      supabase.rpc('increment_quote_view', { p_quote_number: quote.quote_number })
      if (user) {
        await supabase
          .from('quote_views')
          .upsert(
            { user_id: user.id, quote_id: quote.id, viewed_at: new Date().toISOString() },
            { onConflict: 'user_id,quote_id' },
          )
        fetchRecentViews()
      }
    },
    [user, fetchRecentViews],
  )

  const favoriteQuotes = useMemo(
    () => quotes.filter((quote) => favoriteIds.has(quote.id)),
    [quotes, favoriteIds],
  )

  const recentlyViewedQuotes = useMemo(
    () =>
      recentViews
        .map((view) => quotes.find((quote) => quote.id === view.quote_id))
        .filter(Boolean),
    [recentViews, quotes],
  )

  return {
    quotes,
    loading,
    error,
    stats,
    favoriteIds,
    favoriteQuotes,
    recentlyViewedQuotes,
    toggleFavorite,
    copyQuote,
    shareQuote,
    recordView,
  }
}
