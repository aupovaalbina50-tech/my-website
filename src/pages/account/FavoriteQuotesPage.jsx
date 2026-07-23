import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useQuotes } from '../quotes/useQuotes.js'
import QuoteCard from '../quotes/QuoteCard.jsx'

function FavoriteQuotesPage() {
  const { t } = useLanguage()
  const { favoriteQuotes, favoriteIds, loading, toggleFavorite, copyQuote, shareQuote } =
    useQuotes()

  return (
    <div className="account-home">
      <div className="account-card">
        <h1 className="account-title">{t.account.sidebar.favorites}</h1>
        <p className="account-description">{t.quotes.hero.title}</p>
      </div>

      {loading ? (
        <p className="empty-state-text">{t.quotes.loading}</p>
      ) : favoriteQuotes.length === 0 ? (
        <p className="empty-state-text">{t.quotes.emptyFavorites}</p>
      ) : (
        <div className="quote-grid">
          {favoriteQuotes.map((quote) => (
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

export default FavoriteQuotesPage
