import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'

function LoginForm() {
  const { t } = useLanguage()
  const { signIn } = useAuth()
  const { showToast } = useToast()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const trimmedIdentifier = identifier.trim()
    const errors = {}
    if (!trimmedIdentifier) errors.identifier = t.auth.errors.required
    if (!password) errors.password = t.auth.errors.required
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    const { data, error, profile } = await signIn({
      identifier: trimmedIdentifier,
      password,
      rememberMe,
    })
    setSubmitting(false)

    if (error) {
      if (error.code === 'user_not_found') {
        setFieldErrors({ identifier: t.auth.errors.userNotFound })
      } else if (error.code === 'wrong_password') {
        setFieldErrors({ password: t.auth.errors.wrongPassword })
      } else if (error.code === 'email_not_verified') {
        setFormError(t.auth.errors.emailNotVerified)
      } else if (error.code === 'account_suspended') {
        setFormError(t.auth.errors.accountSuspended)
      } else if (error.code === 'too_many_attempts') {
        setFormError(t.auth.errors.tooManyAttempts)
      } else {
        setFormError(t.auth.errors.genericSignIn)
      }
      return
    }

    const name = profile?.first_name || data?.user?.email || ''
    showToast(t.auth.signIn.welcomeBack(name), { type: 'success' })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-form-title">{t.auth.tabs.signIn}</h2>
      <p className="auth-form-subtitle">{t.auth.signIn.subtitle}</p>

      {formError && (
        <div className="auth-form-alert" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="login-identifier">{t.auth.signIn.identifierLabel}</label>
        <div className={`input-icon-wrap${fieldErrors.identifier ? ' invalid' : ''}`}>
          <User size={18} className="input-icon" aria-hidden="true" />
          <input
            id="login-identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value)
              if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: undefined })
            }}
            placeholder={t.auth.signIn.identifierPlaceholder}
            aria-invalid={!!fieldErrors.identifier}
            aria-describedby={fieldErrors.identifier ? 'login-identifier-error' : undefined}
          />
        </div>
        {fieldErrors.identifier && (
          <p className="field-error" id="login-identifier-error">
            {fieldErrors.identifier}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="login-password">{t.auth.signIn.passwordLabel}</label>
        <div className={`input-icon-wrap${fieldErrors.password ? ' invalid' : ''}`}>
          <Lock size={18} className="input-icon" aria-hidden="true" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined })
            }}
            placeholder={t.auth.signIn.passwordPlaceholder}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
          />
          <button
            type="button"
            className="input-icon-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t.auth.signIn.hidePassword : t.auth.signIn.showPassword}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="field-error" id="login-password-error">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="auth-form-options">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>{t.auth.signIn.rememberMe}</span>
        </label>
        <Link to="/account/forgot-password" className="auth-link">
          {t.auth.signIn.forgotPassword}
        </Link>
      </div>

      <button type="submit" className="btn-auth-primary" disabled={submitting}>
        {submitting && <Loader2 size={18} className="spin" aria-hidden="true" />}
        {submitting ? t.auth.signIn.submitting : t.auth.signIn.submit}
      </button>
    </form>
  )
}

export default LoginForm
