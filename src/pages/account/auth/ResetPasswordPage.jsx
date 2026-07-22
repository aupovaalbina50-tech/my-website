import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import Header from '../../../components/Header.jsx'
import Footer from '../../../components/Footer.jsx'
import { passwordMeetsRequirements } from '../../../auth/validators.js'

function ResetPasswordPage() {
  const { t } = useLanguage()
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!password) nextErrors.password = t.auth.errors.required
    else if (!passwordMeetsRequirements(password)) {
      nextErrors.password = t.auth.errors.passwordRequirements
    }
    if (!confirmPassword) nextErrors.confirmPassword = t.auth.errors.required
    else if (confirmPassword !== password) {
      nextErrors.confirmPassword = t.auth.signUp.passwordsMismatch
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const { error } = await updatePassword(password)
    setSubmitting(false)
    if (error) {
      setErrors({ password: t.auth.errors.genericSignIn })
      return
    }
    setDone(true)
    setTimeout(() => navigate('/account'), 2500)
  }

  return (
    <>
      <Header />
      <main className="auth-page">
        <div className="auth-card auth-card-standalone">
          <h1 className="auth-form-title">{t.auth.reset.title}</h1>
          {done ? (
            <p className="field-success">✅ {t.auth.reset.success}</p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <p className="auth-form-subtitle">{t.auth.reset.subtitle}</p>
              <div className="field">
                <label htmlFor="reset-password">{t.auth.reset.newPasswordLabel}</label>
                <div className={`input-icon-wrap${errors.password ? ' invalid' : ''}`}>
                  <Lock size={18} className="input-icon" aria-hidden="true" />
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>
              <div className="field">
                <label htmlFor="reset-confirm">{t.auth.reset.confirmLabel}</label>
                <div className={`input-icon-wrap${errors.confirmPassword ? ' invalid' : ''}`}>
                  <Lock size={18} className="input-icon" aria-hidden="true" />
                  <input
                    id="reset-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
              </div>
              <button type="submit" className="btn-auth-primary" disabled={submitting}>
                {submitting && <Loader2 size={18} className="spin" aria-hidden="true" />}
                {submitting ? t.auth.reset.submitting : t.auth.reset.submit}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export default ResetPasswordPage
