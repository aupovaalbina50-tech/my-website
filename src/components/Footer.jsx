import { useLanguage } from '../i18n/LanguageContext.jsx'

function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="site-footer">
      <p>{t.header.subtitle}</p>
    </footer>
  )
}

export default Footer
