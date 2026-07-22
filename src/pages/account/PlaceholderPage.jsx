import { useLanguage } from '../../i18n/LanguageContext.jsx'

function PlaceholderPage({ titleKey }) {
  const { t } = useLanguage()

  return (
    <div className="account-card account-card-placeholder">
      <h1 className="account-title">{t.account.sidebar[titleKey]}</h1>
      <p className="account-description">{t.sections.comingSoon}</p>
    </div>
  )
}

export default PlaceholderPage
