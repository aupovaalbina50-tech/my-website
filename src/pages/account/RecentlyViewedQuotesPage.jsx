import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useQuotes } from '../quotes/useQuotes.js'
import QuoteCard from '../quotes/QuoteCard.jsx'

function RecentlyViewedQuotesPage() {
  const { t } = useLanguage()
  const { recentlyViewedQuotes, favoriteIds, loading, toggleFavorite, copyQuote, shareQuote } =
    useQuotes()

  return (
    <div className="account-home">
      <div className="account-card">
        <h1 className="account-title">{t.account.sidebar.viewingHistory}</h1>
        <p className="account-description">{t.quotes.hero.title}</p>
      </div>

      {loading ? (
        <p className="empty-state-text">{t.quotes.loading}</p>
      ) : recentlyViewedQuotes.length === 0 ? (
        <p className="empty-state-text">{t.quotes.emptyViewed}</p>
      ) : (
        <div className="quote-grid">
          {recentlyViewedQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              isFavorite={favoriteIds.has(quote.id)}
              onToggleFavorite={toggleFavorite}
              onCopy={copyQuote}
              onShare={shareQuote}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentlyViewedQuotesPage
