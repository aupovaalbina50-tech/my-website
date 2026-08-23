import { useLanguage } from '../../i18n/LanguageContext.jsx'

function DocsContent() {
  const { t } = useLanguage()

  return (
    <section id="docs" className="section-static">
      <div className="card">
        <h2>{t.sections.docsTitle}</h2>
        <p className="empty-state-text">{t.sections.comingSoon}</p>
      </div>
    </section>
  )
}

export default DocsContent
