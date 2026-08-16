import { useState } from 'react'
import { ShieldAlert, ExternalLink } from 'lucide-react'
import SiteSectionLayout from '../components/SiteSectionLayout.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { CONFUSABLE_TERMS } from '../data/confusableTerms'

function ConfusableTermsPage() {
  const { lang, t } = useLanguage()
  const [selectedId, setSelectedId] = useState(CONFUSABLE_TERMS[0].id)
  const selected =
    CONFUSABLE_TERMS.find((pair) => pair.id === selectedId) || CONFUSABLE_TERMS[0]

  return (
    <SiteSectionLayout activeSection="confusable">
      <section id="confusable" className="section-confusable">
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{t.nav.confusable}</h1>
        <p className="section-lead">{t.confusable.lead}</p>

        <div className="committees-split confusable-split">
          <nav className="committees-nav confusable-nav" aria-label={t.nav.confusable}>
            {CONFUSABLE_TERMS.map((pair) => (
              <button
                key={pair.id}
                type="button"
                className={`committees-nav-item confusable-nav-item${pair.id === selectedId ? ' active' : ''}`}
                onClick={() => setSelectedId(pair.id)}
                aria-current={pair.id === selectedId ? 'true' : undefined}
              >
                <span className="confusable-nav-item-name">{pair.termA.name[lang]}</span>
                <span className="confusable-nav-item-mark" aria-hidden="true">
                  ≠
                </span>
                <span className="confusable-nav-item-name">{pair.termB.name[lang]}</span>
              </button>
            ))}
          </nav>

          <div className="committees-detail confusable-detail" key={selected.id}>
            <p className="confusable-eyebrow">
              <ShieldAlert size={14} aria-hidden="true" />
              {t.confusable.eyebrow}
            </p>

            <div className="confusable-pair">
              <div className="confusable-term-card">
                <h2 className="confusable-term-title">{selected.termA.name[lang]}</h2>
                <p className="confusable-term-text">{selected.termA.definition[lang]}</p>
              </div>

              <div className="confusable-seal" aria-hidden="true">
                <span>≠</span>
              </div>

              <div className="confusable-term-card confusable-term-card-b">
                <h2 className="confusable-term-title">{selected.termB.name[lang]}</h2>
                <p className="confusable-term-text">{selected.termB.definition[lang]}</p>
              </div>
            </div>

            <div className="confusable-difference">
              <p className="confusable-difference-label">{t.confusable.differenceHeading}</p>
              <p className="confusable-difference-text">{selected.difference[lang]}</p>
            </div>

            <div className="confusable-sources">
              <p className="confusable-sources-label">{t.confusable.sourceLabel}</p>
              {selected.sources.map((source) => (
                <a
                  key={source.docId + source.label[lang]}
                  className="confusable-source-link"
                  href={`https://adilet.zan.kz/${lang === 'kk' ? 'kaz' : 'rus'}/docs/${source.docId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  {source.label[lang]}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteSectionLayout>
  )
}

export default ConfusableTermsPage
