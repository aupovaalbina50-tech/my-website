import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { bucketEvents, emptyDays, firstPer } from '../../utils/activitySeries.js'

export const ACTIVITY_DAYS = 30

// Before migration 0063 is applied: rebuild the same series from the source
// tables. term_views keeps only the latest view, so a term re-opened later
// may show on that later day — `approximate` tells the panel to say so.
async function loadFromSources(userId, since) {
  const [views, mastery, studied, tests, missionTests, completions] = await Promise.all([
    supabase.from('term_views').select('term_id, viewed_at').eq('user_id', userId),
    supabase.from('term_mastery').select('term_id, created_at').eq('user_id', userId),
    supabase.from('mission_term_progress').select('term_id, studied_at').eq('user_id', userId),
    supabase.from('test_attempts').select('created_at').eq('user_id', userId).gte('created_at', since),
    supabase.from('mission_test_attempts').select('created_at').eq('user_id', userId).gte('created_at', since),
    supabase.from('mission_completions').select('mission_id, completed_at').eq('user_id', userId),
  ])
  const studyRows = [
    ...(views.data || []).map((r) => ({ term: r.term_id, at: r.viewed_at })),
    ...(mastery.data || []).map((r) => ({ term: r.term_id, at: r.created_at })),
    ...(studied.data || []).map((r) => ({ term: r.term_id, at: r.studied_at })),
  ]
  return [
    ...firstPer(studyRows, (r) => r.term, (r) => r.at).map((at) => ({ kind: 'term_study', at })),
    ...(tests.data || []).map((r) => ({ kind: 'test', at: r.created_at })),
    ...(missionTests.data || []).map((r) => ({ kind: 'mission_test', at: r.created_at })),
    ...firstPer(completions.data || [], (r) => r.mission_id, (r) => r.completed_at).map((at) => ({ kind: 'mission_complete', at })),
  ]
}

/**
 * The current user's actions over the last 30 days, per day: «study» —
 * terms studied for the first time; «practice» — test and mission quiz
 * attempts and first mission completions. Read from user_activity_events
 * (RLS: own rows only); the 7-day view is the last 7 of these days.
 */
export function useActivityTimeline() {
  const { user } = useAuth()
  const [state, setState] = useState({ days: emptyDays(ACTIVITY_DAYS), loading: true, error: false, approximate: false })

  useEffect(() => {
    let cancelled = false
    const days = emptyDays(ACTIVITY_DAYS)
    if (!user) {
      setState({ days, loading: false, error: false, approximate: false })
      return undefined
    }
    const since = days[0].date.toISOString()
    setState((s) => ({ ...s, loading: true }))

    ;(async () => {
      const { data, error } = await supabase
        .from('user_activity_events')
        .select('kind, occurred_at')
        .eq('user_id', user.id)
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: true })
        .limit(5000)
      let events
      let approximate = false
      if (error) {
        try {
          events = await loadFromSources(user.id, since)
          approximate = true
        } catch {
          if (!cancelled) setState({ days, loading: false, error: true, approximate: false })
          return
        }
      } else {
        events = (data || []).map((r) => ({ kind: r.kind, at: r.occurred_at }))
      }
      if (!cancelled) setState({ days: bucketEvents(events, days), loading: false, error: false, approximate })
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  return state
}
