import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useToast } from '../../components/ToastContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

export function useMastery() {
  const { user, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [manualIds, setManualIds] = useState(new Set())
  const [quizIds, setQuizIds] = useState(new Set())
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMastery = useCallback(async () => {
    if (!user) {
      setManualIds(new Set())
      setQuizIds(new Set())
      setTerms([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [{ data: manualRows }, { data: quizRows }] = await Promise.all([
      supabase
        .from('term_mastery')
        .select('term_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('test_answers').select('term_id').eq('user_id', user.id).eq('is_correct', true),
    ])

    const manual = new Set((manualRows || []).map((row) => row.term_id))
    const quiz = new Set((quizRows || []).map((row) => row.term_id))
    setManualIds(manual)
    setQuizIds(quiz)

    const allIds = [...new Set([...manual, ...quiz])]
    if (allIds.length === 0) {
      setTerms([])
      setLoading(false)
      return
    }

    const { data: termRows } = await supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .in('id', allIds)

    const byId = new Map((termRows || []).map((term) => [term.id, term]))
    const ordered = [
      ...(manualRows || []).map((row) => byId.get(row.term_id)).filter(Boolean),
      ...[...quiz]
        .filter((id) => !manual.has(id))
        .map((id) => byId.get(id))
        .filter(Boolean),
    ]
    setTerms(ordered)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchMastery()
  }, [fetchMastery])

  const masteredIds = new Set([...manualIds, ...quizIds])

  const toggleMastery = useCallback(
    async (term) => {
      if (!isAuthenticated || !user) {
        showToast(t.termMastery.signInRequired, { type: 'error' })
        return
      }
      const isManual = manualIds.has(term.id)

      if (isManual) {
        setManualIds((current) => {
          const next = new Set(current)
          next.delete(term.id)
          return next
        })
        if (!quizIds.has(term.id)) {
          setTerms((current) => current.filter((existing) => existing.id !== term.id))
        }
        const { error: deleteError } = await supabase
          .from('term_mastery')
          .delete()
          .eq('user_id', user.id)
          .eq('term_id', term.id)
        if (deleteError) {
          await fetchMastery()
          return
        }
        showToast(t.termMastery.removed)
      } else {
        setManualIds((current) => new Set(current).add(term.id))
        setTerms((current) =>
          current.some((existing) => existing.id === term.id) ? current : [term, ...current],
        )
        const { error: insertError } = await supabase
          .from('term_mastery')
          .insert({ user_id: user.id, term_id: term.id })
        if (insertError) {
          await fetchMastery()
          return
        }
        showToast(t.termMastery.added)
      }
    },
    [manualIds, quizIds, isAuthenticated, user, showToast, t, fetchMastery],
  )

  return { masteredIds, manualIds, quizIds, terms, loading, toggleMastery }
}
