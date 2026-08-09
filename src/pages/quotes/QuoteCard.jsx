import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Quote, Copy, Share2, Star } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

function highlightText(text, query) {
  const q = query.trim()
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="quote-highlight">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function QuoteCard({ quote, isFavorite, onToggleFavorite, onCopy, onShare, searchQuery = '' }) {
  const { t } = useLanguage()

  return (
    <article className="quote-card">
      <Quote className="quote-card-mark" aria-hidden="true" />
      <Link to={`/quotes/${quote.quote_number}`} className="quote-card-body">
        <span className="quote-card-number">{t.quotes.card.number(quote.quote_number)}</span>
        <p className="quote-card-text">{highlightText(quote.quote_text, searchQuery)}</p>
      </Link>
      <div className="quote-card-footer">
        <span className="quote-card-author">{quote.author}</span>
        <div className="quote-card-actions">
          <button
            type="button"
            className="quote-icon-btn"
            onClick={() => onCopy(quote)}
            aria-label={t.quotes.card.copy}
            title={t.quotes.card.copy}
          >
            <Copy size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="quote-icon-btn"
            onClick={() => onShare(quote)}
            aria-label={t.quotes.card.share}
            title={t.quotes.card.share}
          >
            <Share2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`quote-icon-btn quote-fav-btn${isFavorite ? ' active' : ''}`}
            onClick={() => onToggleFavorite(quote)}
            aria-label={isFavorite ? t.quotes.card.favoriteRemove : t.quotes.card.favoriteAdd}
            title={isFavorite ? t.quotes.card.favoriteRemove : t.quotes.card.favoriteAdd}
            aria-pressed={isFavorite}
          >
            <Star size={16} aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  )
}

export default memo(QuoteCard)
