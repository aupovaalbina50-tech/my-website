import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { toSentenceCase } from '../../utils/textCase.js'

// Shared instant term search dropdown — used by the home page hero search and
// the dashboard quick search so both behave the same: full term names
// (wrapped, never truncated), updated on every keystroke, best matches first.

export const MAX_SUGGESTIONS = 8
// PostgREST returns at most 1000 rows per request.
const PAGE_SIZE = 1000

export async function fetchAllTerms(columns) {
  const all = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('terms')
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { data: all.length ? all : null, error }
    all.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) return { data: all, error: null }
  }
}

export function startsWithQuery(text, query) {
  return (text || '')
    .toLowerCase()
    .split(/[\s,;()/-]+/)
    .some((word) => word.startsWith(query))
}

// Lower is better: the whole term starts with the query (in the UI language,
// then in any language), then some word of it does.
function matchRank(term, query, langOrder) {
  for (let i = 0; i < langOrder.length; i++) {
    if ((term[langOrder[i]] || '').toLowerCase().startsWith(query)) return i
  }
  for (let i = 0; i < langOrder.length; i++) {
    if (startsWithQuery(term[langOrder[i]], query)) return langOrder.length + i
  }
  return -1
}

export function useTermSuggestions(terms, rawQuery, lang) {
  const query = rawQuery.trim().toLowerCase()
  const otherLang = lang === 'kk' ? 'ru' : 'kk'
  return useMemo(() => {
    if (!query) return []
    const langOrder = [lang, otherLang, 'en']
    const label = (term) => term[lang] || term[otherLang] || term.en || ''
    // The dictionary has a few duplicate rows (same kk/ru/en); show each once.
    const seen = new Set()
    return terms
      .map((term) => ({ term, rank: matchRank(term, query, langOrder) }))
      .filter((item) => item.rank >= 0)
      .sort((a, b) => a.rank - b.rank || label(a.term).localeCompare(label(b.term), lang))
      .filter(({ term }) => {
        const key = [term.kk, term.ru, term.en].map((s) => (s || '').trim().toLowerCase()).join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, MAX_SUGGESTIONS)
      .map((item) => item.term)
  }, [terms, query, lang, otherLang])
}

export function HighlightedText({ text, query }) {
  if (!query) return text
  const wordRegex = /[^\s,;()/-]+/g
  const parts = []
  let lastIndex = 0
  let match
  while ((match = wordRegex.exec(text))) {
    const word = match[0]
    if (word.toLowerCase().startsWith(query)) {
      const start = match.index
      const end = start + query.length
      if (start > lastIndex) parts.push(text.slice(lastIndex, start))
      parts.push(<mark key={start}>{text.slice(start, end)}</mark>)
      lastIndex = end
    }
  }
  parts.push(text.slice(lastIndex))
  return parts
}

// Keyboard state for the combobox: ↑/↓ move, Enter opens, Escape closes.
export function useSuggestionKeyboard({ suggestions, open, query, onSelect, onClose }) {
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  const onKeyDown = (e) => {
    if (!open) return
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onSelect(suggestions[activeIndex >= 0 ? activeIndex : 0])
    }
  }

  return { activeIndex, setActiveIndex, onKeyDown }
}

export function TermSuggestionList({ id, suggestions, query, lang, activeIndex, setActiveIndex, onSelect, notFoundText }) {
  const otherLang = lang === 'kk' ? 'ru' : 'kk'
  const q = query.trim().toLowerCase()
  return (
    <ul className="search-suggestions search-suggestions--full" id={id} role="listbox">
      {suggestions.length === 0 ? (
        <li className="search-suggestion-empty">{notFoundText}</li>
      ) : (
        suggestions.map((term, i) => (
          <li key={term.id} id={`${id}-option-${i}`} role="option" aria-selected={i === activeIndex}>
            <button
              type="button"
              className={`search-suggestion-item${i === activeIndex ? ' search-suggestion-item--active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => onSelect(term)}
            >
              <span className="search-suggestion-accent" aria-hidden="true"></span>
              <span className="search-suggestion-text">
                <span className="search-suggestion-primary">
                  <HighlightedText text={toSentenceCase(term[lang] || term[otherLang] || term.en)} query={q} />
                </span>
                <span className="search-suggestion-secondary">
                  <HighlightedText text={toSentenceCase(term[otherLang])} query={q} />
                  {term.en && (
                    <>
                      {' · '}
                      <HighlightedText text={toSentenceCase(term.en)} query={q} />
                    </>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))
      )}
    </ul>
  )
}
