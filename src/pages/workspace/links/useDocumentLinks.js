import { useCallback, useEffect, useMemo, useState } from 'react'
import { isOutdated, provenanceState } from './consistency.js'
import { loadLinks } from './linksApi.js'

/** The links of a document and what needs attention (for the editor banner too). */
export function useDocumentLinks(documentId, values) {
  const [state, setState] = useState({ loading: true, error: false, items: [] })
  const reload = useCallback(async () => {
    if (!documentId) return
    setState((s) => ({ ...s, loading: true, error: false }))
    try {
      setState({ loading: false, error: false, items: await loadLinks(documentId) })
    } catch {
      setState({ loading: false, error: true, items: [] })
    }
  }, [documentId])
  useEffect(() => {
    reload()
  }, [reload])
  const sources = useMemo(() => new Map(state.items.filter((i) => i.other).map((i) => [i.other.id, i.other])), [state.items])
  const attention = useMemo(() => {
    const outdated = state.items.filter((i) => i.other && isOutdated(i.link, documentId, i.other)).length
    const changed = provenanceState(values, sources).filter((p) => p.state === 'source_changed').length
    return outdated + changed
  }, [state.items, documentId, values, sources])
  const replace = (link) => setState((s) => ({ ...s, items: s.items.map((i) => (i.link.id === link.id ? { ...i, link } : i)) }))
  return { ...state, reload, replace, sources, attention }
}
