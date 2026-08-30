import { Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { CATEGORIES } from '../../i18n/translations'
import { toSentenceCase } from '../../utils/textCase.js'

const LANG_ROWS = [
  { key: 'kk', flag: '🇰🇿' },
  { key: 'ru', flag: '🇷🇺' },
  { key: 'en', flag: '🇬🇧' },
]

function TermMapPanel({
  term,
  lang,
  t,
  hazardLabel,
  groupLabel,
  relatedTerms,
  relatedTotal = 0,
  onSelectRelated,
  onClose,
  crossHazards = [],
  currentHazardId = null,
  onSelectHazard,
  showConnections = false,
  onToggleConnections,
}) {
  const categoryLabel = term.category
    ? CATEGORIES.find((c) => c.key === term.category)?.[lang] || term.category
    : null
  const title = toSentenceCase(term[lang] || term.ru || term.kk || term.en)

  return (
    <>
      <div className="term-map-panel-backdrop" onClick={onClose} />
      <aside className="term-map-panel" role="dialog" aria-label={title}>
        <div className="term-map-panel-header">
          <h2 className="term-map-panel-title">{title}</h2>
          <button
            type="button"
            className="term-map-panel-close"
            onClick={onClose}
            aria-label={t.termMap.panel.close}
            title={t.termMap.panel.close}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="term-map-panel-body">
          <div className="term-map-panel-langs">
            {LANG_ROWS.filter((row) => term[row.key]).map((row) => (
              <div className="term-map-panel-lang-row" key={row.key}>
                <span className="term-map-panel-lang-flag" aria-hidden="true">
                  {row.flag}
                </span>
                <span className="term-map-panel-lang-name">{t.langNames[row.key]}</span>
                <span className="term-map-panel-lang-value">{toSentenceCase(term[row.key])}</span>
              </div>
            ))}
          </div>

          {categoryLabel && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.form.categoryLabel}</span>
              <span className="category-badge">{categoryLabel}</span>
            </div>
          )}

          {hazardLabel && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.panel.hazardLabel}</span>
              <span className="term-map-panel-section-value">{hazardLabel}</span>
            </div>
          )}

          {groupLabel && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.panel.groupLabel}</span>
              <span className="term-map-panel-section-value">{groupLabel}</span>
            </div>
          )}

          {crossHazards.length > 1 && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.crossHazardsLabel}</span>
              <div className="term-map-panel-related">
                {crossHazards.map((hazard) => {
                  const isCurrent = hazard.id === currentHazardId
                  return (
                    <button
                      key={hazard.id}
                      type="button"
                      className={`term-map-panel-hazard-chip${isCurrent ? ' current' : ''}`}
                      onClick={() => !isCurrent && onSelectHazard(hazard.id)}
                      disabled={isCurrent}
                      title={hazard.name[lang]}
                    >
                      <hazard.Icon size={14} aria-hidden="true" />
                      {hazard.name[lang]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {(relatedTotal > 0 || crossHazards.length > 0) && (
            <div className="term-map-panel-section">
              <div className="term-map-panel-connections-stats">
                {relatedTotal > 0 && <span>{t.termMap.relatedTermsCount(relatedTotal)}</span>}
                {crossHazards.length > 0 && <span>{t.termMap.crossCountBadge(crossHazards.length)}</span>}
              </div>
              <button type="button" className="term-map-panel-connections-btn" onClick={onToggleConnections}>
                {showConnections ? t.termMap.hideConnections : t.termMap.showConnections}
              </button>
            </div>
          )}

          {relatedTerms.length > 0 && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.panel.relatedLabel}</span>
              <div className="term-map-panel-related">
                {relatedTerms.map((related) => (
                  <button
                    key={related.id}
                    type="button"
                    className="term-map-panel-related-chip"
                    onClick={() => onSelectRelated(related.id)}
                  >
                    {toSentenceCase(related[lang] || related.ru)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link to={`/terms/${term.id}`} className="term-map-panel-more-link">
            {t.termMap.panel.detailsLink}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </>
  )
}

export default TermMapPanel
