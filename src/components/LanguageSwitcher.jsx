import { useLanguage } from '../i18n/LanguageContext.jsx'

function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage()
  return (
    <div className="lang-switcher" role="group" aria-label={t.langSwitcher.aria}>
      <button
        type="button"
        className={`lang-btn${lang === 'kk' ? ' active' : ''}`}
        onClick={() => setLang('kk')}
        aria-pressed={lang === 'kk'}
      >
        {t.langSwitcher.kk}
      </button>
      <span className="lang-sep">/</span>
      <button
        type="button"
        className={`lang-btn${lang === 'ru' ? ' active' : ''}`}
        onClick={() => setLang('ru')}
        aria-pressed={lang === 'ru'}
      >
        {t.langSwitcher.ru}
      </button>
    </div>
  )
}

export default LanguageSwitcher
