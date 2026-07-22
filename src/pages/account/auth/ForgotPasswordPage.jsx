import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Mail } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import Header from '../../../components/Header.jsx'
import Footer from '../../../components/Footer.jsx'
import { isValidEmailFormat } from '../../../auth/validators.js'

function ForgotPasswordPage() {
  const { t } = useLanguage()
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setError(t.auth.errors.required)
      return
    }
    if (!isValidEmailFormat(trimmed)) {
      setError(t.auth.errors.invalidEmail)
      return
    }
    setError('')
    setSubmitting(true)
    await sendPasswordReset(trimmed)
    setSubmitting(false)
    setSent(true)
  }

  return (
    <>
      <Header />
      <main className="auth-page">
        <div className="auth-card auth-card-standalone">
          <h1 className="auth-form-title">{t.auth.forgot.title}</h1>
          {sent ? (
            <p className="field-success">✅ {t.auth.forgot.sent}</p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <p className="auth-form-subtitle">{t.auth.forgot.subtitle}</p>
              <div className="field">
                <label htmlFor="forgot-email">{t.auth.signUp.emailLabel}</label>
                <div className={`input-icon-wrap${error ? ' invalid' : ''}`}>
                  <Mail size={18} className="input-icon" aria-hidden="true" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    placeholder={t.auth.signUp.emailPlaceholder}
                    aria-invalid={!!error}
                  />
                </div>
                {error && <p className="field-error">{error}</p>}
              </div>
              <button type="submit" className="btn-auth-primary" disabled={submitting}>
                {submitting && <Loader2 size={18} className="spin" aria-hidden="true" />}
                {submitting ? t.auth.forgot.submitting : t.auth.forgot.submit}
              </button>
            </form>
          )}
          <Link to="/account" className="auth-link auth-back-link">
            {t.auth.forgot.backToSignIn}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default ForgotPasswordPage
