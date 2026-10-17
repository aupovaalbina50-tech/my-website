import { useEffect, useRef, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { subscribeAiConsent } from './aiConsent.js'
import './aiConsent.css'

/** The dialog of requireAiConsent(); one per app. */
export default function AiConsentHost() {
  const { t } = useLanguage()
  const c = t.workspace.aiConsent
  const [answer, setAnswer] = useState(null)
  const [always, setAlways] = useState(false)
  const ref = useRef(null)

  useEffect(() => subscribeAiConsent((a) => setAnswer(a)), [])
  useEffect(() => {
    if (!answer) return
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && close(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!answer) return null
  function close(ok) {
    if (ok) answer.accept(always)
    else answer.decline()
    setAnswer(null)
    setAlways(false)
  }
  return (
    <div className="ai-consent-backdrop">
      <div className="ai-consent" role="alertdialog" aria-modal="true" aria-labelledby="ai-consent-title" tabIndex={-1} ref={ref}>
        <h2 id="ai-consent-title">
          <ShieldAlert size={22} aria-hidden="true" />
          {c.title}
        </h2>
        <p>{c.text}</p>
        <ul>
          {c.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <label className="ai-consent-always">
          <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} />
          {c.always}
        </label>
        <div className="ai-consent-actions">
          <button type="button" className="ai-consent-btn" onClick={() => close(false)}>
            {c.decline}
          </button>
          <button type="button" className="ai-consent-btn ai-consent-btn--primary" onClick={() => close(true)}>
            {c.accept}
          </button>
        </div>
      </div>
    </div>
  )
}
