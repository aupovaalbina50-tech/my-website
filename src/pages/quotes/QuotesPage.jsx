import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, Search, Sparkles } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useQuotes } from './useQuotes.js'
import QuoteCard from './QuoteCard.jsx'
import Header from '../../components/Header.jsx'
import HomeSidebar from '../../components/HomeSidebar.jsx'
import Footer from '../../components/Footer.jsx'
import SectionIntro from '../../components/SectionIntro.jsx'

const noop = () => {}

function shuffle(list, seed) {
  const arr = [...list]
  let s = seed || 1
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// «№5», «5», «#5», «No 5» — a search by the quote's number.
const NUMBER_QUERY = /^(?:№|#|n|no\.?)?\s*(\d{1,4})$/i

function QuotesPage() {
  const { t } = useLanguage()
  const { quotes, loading, error, stats, favoriteIds, toggleFavorite, copyQuote, shareQuote } =
    useQuotes()

  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('number')
  const [randomSeed, setRandomSeed] = useState(1)
  const [quoteOfDay, setQuoteOfDay] = useState(null)

  useEffect(() => {
    document.title = `${t.quotes.hero.title} — ${t.header.title}`
  }, [t])

  useEffect(() => {
    if (quotes.length > 0 && !quoteOfDay) {
      setQuoteOfDay(quotes[Math.floor(Math.random() * quotes.length)])
    }
  }, [quotes, quoteOfDay])

  const deferredSearch = useDeferredValue(search)

  const visibleQuotes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    const number = NUMBER_QUERY.exec(query)?.[1]
    const filtered = number
      ? quotes.filter((quote) => Number(quote.quote_number) === Number(number))
      : query
        ? quotes.filter((quote) => quote.quote_text.toLowerCase().includes(query))
        : quotes

    if (sortMode === 'alpha') {
      return [...filtered].sort((a, b) => a.quote_text.localeCompare(b.quote_text, 'kk'))
    }
    if (sortMode === 'random') {
      return shuffle(filtered, randomSeed)
    }
    return filtered
  }, [quotes, deferredSearch, sortMode, randomSeed])

  const handleSortChange = (mode) => {
    setSortMode(mode)
    if (mode === 'random') setRandomSeed((seed) => seed + 1)
  }

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="quotes" onSectionClick={noop} />
        <div className="home-content">
          <section className="section-quotes-intro">
            <div className="section-kicker" aria-hidden="true"></div>
            <h1 className="section-title">{t.quotes.hero.title}</h1>
            <SectionIntro
              lead={t.quotes.hero.introLead}
              steps={[
                { icon: Sparkles, ...t.quotes.hero.introSteps[0], target: '.quote-of-day-card' },
                { icon: Search, ...t.quotes.hero.introSteps[1], target: '.quote-search-wrap', focus: '.quote-search-input' },
                { icon: ArrowDownUp, ...t.quotes.hero.introSteps[2], target: '.quote-sort-group' },
              ]}
            />
          </section>

          <div className="quote-stats-grid">
            <div className="stat-tile">
              <span className="stat-value">{stats?.total_quotes ?? quotes.length}</span>
              <span className="stat-label">{t.quotes.stats.total}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats?.total_favorited ?? 0}</span>
              <span className="stat-label">{t.quotes.stats.favorites}</span>
            </div>
          </div>

          {quoteOfDay && (
            <div className="quote-of-day-card">
              <div className="quote-of-day-label">
                <Sparkles size={16} aria-hidden="true" />
                <span>{t.quotes.quoteOfDay.title}</span>
              </div>
              <p className="quote-of-day-text">«{quoteOfDay.quote_text}»</p>
              <span className="quote-of-day-author">{quoteOfDay.author}</span>
              <p className="quote-of-day-subtitle">{t.quotes.quoteOfDay.subtitle}</p>
            </div>
          )}

          <div className="quote-toolbar">
            <div className="quote-search-wrap">
              <Search size={18} className="quote-search-icon" aria-hidden="true" />
              <input
                type="search"
                className="quote-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.quotes.search.placeholder}
                aria-label={t.quotes.search.aria}
              />
            </div>
            <div className="quote-sort-group" role="group" aria-label={t.quotes.sort.aria}>
              <button
                type="button"
                className={`sort-btn${sortMode === 'number' ? ' active' : ''}`}
                onClick={() => handleSortChange('number')}
              >
                {t.quotes.sort.byNumber}
              </button>
              <button
                type="button"
                className={`sort-btn${sortMode === 'alpha' ? ' active' : ''}`}
                onClick={() => handleSortChange('alpha')}
              >
                {t.quotes.sort.alphabetical}
              </button>
              <button
                type="button"
                className={`sort-btn${sortMode === 'random' ? ' active' : ''}`}
                onClick={() => handleSortChange('random')}
              >
                {t.quotes.sort.random}
              </button>
            </div>
          </div>

          <p className="quote-results-count">
            {search.trim()
              ? t.quotes.search.resultsCount(visibleQuotes.length)
              : t.quotes.search.totalCount(quotes.length)}
          </p>

          {error && <div className="alert">{error}</div>}

          {loading ? (
            <p className="empty-state-text quote-empty">{t.quotes.loading}</p>
          ) : visibleQuotes.length === 0 ? (
            <p className="empty-state-text quote-empty">{t.quotes.search.empty}</p>
          ) : (
            <div className="quote-grid">
              {visibleQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  isFavorite={favoriteIds.has(quote.id)}
                  onToggleFavorite={toggleFavorite}
                  onCopy={copyQuote}
                  onShare={shareQuote}
                  searchQuery={NUMBER_QUERY.test(search.trim()) ? '' : search}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default QuotesPage
