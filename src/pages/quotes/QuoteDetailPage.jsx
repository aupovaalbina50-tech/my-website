import { useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Quote,
  Copy,
  Share2,
  Star,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useQuotes } from './useQuotes.js'
import Header from '../../components/Header.jsx'
import HomeSidebar from '../../components/HomeSidebar.jsx'
import Footer from '../../components/Footer.jsx'

function setMetaDescription(content) {
  let tag = document.querySelector('meta[name="description"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function QuoteDetailPage() {
  const { number } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { quotes, loading, favoriteIds, toggleFavorite, copyQuote, shareQuote, recordView } =
    useQuotes()

  const quoteNumber = Number(number)
  const quote = useMemo(
    () => quotes.find((q) => q.quote_number === quoteNumber),
    [quotes, quoteNumber],
  )

  const recordedIdRef = useRef(null)

  useEffect(() => {
    if (quote && recordedIdRef.current !== quote.id) {
      recordedIdRef.current = quote.id
      recordView(quote)
    }
  }, [quote, recordView])

  useEffect(() => {
    if (!quote) return
    document.title = t.quotes.detail.pageTitle(quote.quote_number)
    setMetaDescription(
      t.quotes.detail.metaDescription(quote.quote_number, quote.quote_text.slice(0, 140)),
    )
  }, [quote, t])

  const total = quotes.length
  const prevNumber = total ? ((quoteNumber - 2 + total) % total) + 1 : null
  const nextNumber = total ? (quoteNumber % total) + 1 : null

  if (loading) {
    return (
      <>
        <Header />
        <div className="account-shell">
          <HomeSidebar activeSection="quotes" onSectionClick={() => {}} />
          <div className="home-content">
            <p className="empty-state-text">{t.quotes.loading}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!quote) {
    return (
      <>
        <Header />
        <div className="account-shell">
          <HomeSidebar activeSection="quotes" onSectionClick={() => {}} />
          <div className="home-content">
            <div className="card">
              <p className="empty-state-text">{t.quotes.detail.notFound}</p>
              <Link to="/quotes" className="modal-source-link">
                {t.quotes.detail.back}
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const isFavorite = favoriteIds.has(quote.id)

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="quotes" onSectionClick={() => {}} />
        <div className="home-content">
          <div className="quote-detail-nav no-print">
            <button type="button" className="quote-back-link" onClick={() => navigate('/quotes')}>
              <ArrowLeft size={16} aria-hidden="true" />
              {t.quotes.detail.back}
            </button>
          </div>

          <article className="quote-detail-card">
            <Quote className="quote-detail-mark" aria-hidden="true" />
            <span className="quote-card-number">{t.quotes.card.number(quote.quote_number)}</span>
            <p className="quote-detail-text">«{quote.quote_text}»</p>
            <div className="quote-detail-author">
              <span className="quote-detail-author-name">{quote.author}</span>
              <span className="quote-detail-author-title">{t.quotes.authorTitle}</span>
            </div>

            <div className="quote-detail-actions no-print">
              <button type="button" className="quote-action-btn" onClick={() => copyQuote(quote)}>
                <Copy size={16} aria-hidden="true" />
                {t.quotes.card.copy}
              </button>
              <button type="button" className="quote-action-btn" onClick={() => shareQuote(quote)}>
                <Share2 size={16} aria-hidden="true" />
                {t.quotes.card.share}
              </button>
              <button
                type="button"
                className="quote-action-btn"
                onClick={() => window.print()}
              >
                <Printer size={16} aria-hidden="true" />
                {t.quotes.detail.print}
              </button>
              <button
                type="button"
                className={`quote-action-btn quote-fav-btn${isFavorite ? ' active' : ''}`}
                onClick={() => toggleFavorite(quote)}
                aria-pressed={isFavorite}
              >
                <Star size={16} aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
                {isFavorite ? t.quotes.card.favoriteRemove : t.quotes.card.favoriteAdd}
              </button>
            </div>
          </article>

          <div className="quote-detail-pager no-print">
            <Link to={`/quotes/${prevNumber}`} className="quote-pager-btn">
              <ChevronLeft size={18} aria-hidden="true" />
              {t.quotes.detail.prev}
            </Link>
            <Link to={`/quotes/${nextNumber}`} className="quote-pager-btn">
              {t.quotes.detail.next}
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default QuoteDetailPage
