import { Languages } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { MISSION_LANGS, MISSION_LANG_NAMES } from './missionLanguage.js'

const LANG_TAG = { kk: 'KZ', ru: 'RU', en: 'EN' }

// "На каком языке вы хотите пройти миссию?" — shown at the start of a run,
// before Step 1. The choice is the language of the whole Step 2 test.
function MissionLanguagePicker({ value, onChoose }) {
  const { t } = useLanguage()
  const l = t.account.missions.language

  return (
    <div className="card mission-lang-picker">
      <span className="mission-lang-picker-icon" aria-hidden="true">
        <Languages size={26} strokeWidth={1.75} />
      </span>
      <p className="mission-lang-picker-eyebrow">{l.eyebrow}</p>
      <h2 className="mission-lang-picker-title">{l.title}</h2>
      <p className="mission-lang-picker-text">{l.text}</p>
      <div className="mission-lang-picker-options" role="radiogroup" aria-label={l.title}>
        {MISSION_LANGS.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={value === code}
            className={`mission-lang-option${value === code ? ' mission-lang-option--active' : ''}`}
            onClick={() => onChoose(code)}
          >
            <span className="mission-lang-option-tag">{LANG_TAG[code]}</span>
            <span className="mission-lang-option-name">{MISSION_LANG_NAMES[code]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default MissionLanguagePicker
