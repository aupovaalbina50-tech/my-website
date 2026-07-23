import { useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, Loader2, Mail, User } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import {
  getPasswordStrengthScore,
  isValidEmailFormat,
  isValidName,
  isValidUsernameFormat,
  passwordMeetsRequirements,
  passwordStrengthLevel,
} from '../../../auth/validators.js'

const DEBOUNCE_MS = 450

function RegisterForm() {
  const { t, lang } = useLanguage()
  const { signUp, checkUsernameAvailable, checkEmailAvailable, resendVerificationEmail } = useAuth()
  const { showToast } = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [emailStatus, setEmailStatus] = useState('idle')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(null)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle')
      return undefined
    }
    if (!isValidUsernameFormat(username)) {
      setUsernameStatus('invalid')
      return undefined
    }
    setUsernameStatus('checking')
    const handle = setTimeout(async () => {
      const available = await checkUsernameAvailable(username)
      setUsernameStatus(available ? 'available' : 'taken')
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [username, checkUsernameAvailable])

  useEffect(() => {
    if (!email) {
      setEmailStatus('idle')
      return undefined
    }
    if (!isValidEmailFormat(email)) {
      setEmailStatus('invalid')
      return undefined
    }
    setEmailStatus('checking')
    const handle = setTimeout(async () => {
      const available = await checkEmailAvailable(email.trim())
      setEmailStatus(available ? 'available' : 'taken')
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [email, checkEmailAvailable])

  const passwordScore = getPasswordStrengthScore(password)
  const strengthLevel = passwordStrengthLevel(passwordScore)
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === password
  const confirmMismatches = confirmPassword.length > 0 && confirmPassword !== password

  const clearFieldError = (key) => {
    if (fieldErrors[key]) setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const errors = {}
    if (!firstName.trim()) errors.firstName = t.auth.errors.required
    else if (!isValidName(firstName)) errors.firstName = t.auth.errors.nameLettersOnly

    if (!lastName.trim()) errors.lastName = t.auth.errors.required
    else if (!isValidName(lastName)) errors.lastName = t.auth.errors.nameLettersOnly

    if (!username) errors.username = t.auth.errors.required
    else if (!isValidUsernameFormat(username)) errors.username = t.auth.errors.usernameFormat
    else if (usernameStatus === 'taken') errors.username = t.auth.signUp.usernameTaken

    if (!email.trim()) errors.email = t.auth.errors.required
    else if (!isValidEmailFormat(email)) errors.email = t.auth.errors.invalidEmail
    else if (emailStatus === 'taken') errors.email = t.auth.signUp.emailTaken

    if (!password) errors.password = t.auth.errors.required
    else if (!passwordMeetsRequirements(password)) errors.password = t.auth.errors.passwordRequirements

    if (!confirmPassword) errors.confirmPassword = t.auth.errors.required
    else if (confirmPassword !== password) errors.confirmPassword = t.auth.signUp.passwordsMismatch

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !agreeTerms) return

    setSubmitting(true)
    const { data, error } = await signUp({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username,
      email: email.trim(),
      password,
      preferredLanguage: lang,
    })
    setSubmitting(false)

    if (error) {
      setFormError(t.auth.errors.genericSignUp)
      return
    }

    if (data.session) {
      showToast(t.auth.signUp.welcomeNew, { type: 'success' })
    } else {
      setPendingVerification(email.trim())
    }
  }

  const handleResend = async () => {
    if (!pendingVerification) return
    setResending(true)
    await resendVerificationEmail(pendingVerification)
    setResending(false)
    showToast(t.auth.verify.resent, { type: 'success' })
  }

  if (pendingVerification) {
    return (
      <div className="auth-verify-panel">
        <h2 className="auth-form-title">{t.auth.verify.title}</h2>
        <p className="auth-form-subtitle">{t.auth.verify.message}</p>
        <button
          type="button"
          className="btn-auth-secondary"
          onClick={handleResend}
          disabled={resending}
        >
          {resending && <Loader2 size={18} className="spin" aria-hidden="true" />}
          {resending ? t.auth.verify.resending : t.auth.verify.resend}
        </button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-form-title">{t.auth.signUp.title}</h2>
      <p className="auth-form-subtitle">{t.auth.signUp.subtitle}</p>

      {formError && (
        <div className="auth-form-alert" role="alert">
          {formError}
        </div>
      )}

      <div className="auth-form-row">
        <div className="field">
          <label htmlFor="reg-first-name">{t.auth.signUp.firstNameLabel}</label>
          <input
            id="reg-first-name"
            type="text"
            className={fieldErrors.firstName ? 'invalid' : ''}
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              clearFieldError('firstName')
            }}
            placeholder={t.auth.signUp.firstNamePlaceholder}
            aria-invalid={!!fieldErrors.firstName}
          />
          {fieldErrors.firstName && <p className="field-error">{fieldErrors.firstName}</p>}
        </div>

        <div className="field">
          <label htmlFor="reg-last-name">{t.auth.signUp.lastNameLabel}</label>
          <input
            id="reg-last-name"
            type="text"
            className={fieldErrors.lastName ? 'invalid' : ''}
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value)
              clearFieldError('lastName')
            }}
            placeholder={t.auth.signUp.lastNamePlaceholder}
            aria-invalid={!!fieldErrors.lastName}
          />
          {fieldErrors.lastName && <p className="field-error">{fieldErrors.lastName}</p>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="reg-username">{t.auth.signUp.usernameLabel}</label>
        <div
          className={`input-icon-wrap${
            fieldErrors.username || usernameStatus === 'invalid' || usernameStatus === 'taken'
              ? ' invalid'
              : usernameStatus === 'available'
                ? ' valid'
                : ''
          }`}
        >
          <User size={18} className="input-icon" aria-hidden="true" />
          <input
            id="reg-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              clearFieldError('username')
            }}
            placeholder={t.auth.signUp.usernamePlaceholder}
            aria-invalid={!!fieldErrors.username}
          />
        </div>
        {fieldErrors.username && <p className="field-error">{fieldErrors.username}</p>}
        {!fieldErrors.username && usernameStatus === 'checking' && (
          <p className="field-hint">{t.auth.checking}</p>
        )}
        {!fieldErrors.username && usernameStatus === 'available' && (
          <p className="field-success">✅ {t.auth.signUp.usernameAvailable}</p>
        )}
        {!fieldErrors.username && usernameStatus === 'taken' && (
          <p className="field-error">❌ {t.auth.signUp.usernameTaken}</p>
        )}
        {!fieldErrors.username && usernameStatus === 'invalid' && (
          <p className="field-error">{t.auth.errors.usernameFormat}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="reg-email">{t.auth.signUp.emailLabel}</label>
        <div
          className={`input-icon-wrap${
            fieldErrors.email || emailStatus === 'invalid' || emailStatus === 'taken'
              ? ' invalid'
              : emailStatus === 'available'
                ? ' valid'
                : ''
          }`}
        >
          <Mail size={18} className="input-icon" aria-hidden="true" />
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearFieldError('email')
            }}
            placeholder={t.auth.signUp.emailPlaceholder}
            aria-invalid={!!fieldErrors.email}
          />
        </div>
        {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
        {!fieldErrors.email && emailStatus === 'checking' && (
          <p className="field-hint">{t.auth.checking}</p>
        )}
        {!fieldErrors.email && emailStatus === 'available' && (
          <p className="field-success">✅ {t.auth.signUp.emailAvailable}</p>
        )}
        {!fieldErrors.email && emailStatus === 'taken' && (
          <p className="field-error">❌ {t.auth.signUp.emailTaken}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="reg-password">{t.auth.signUp.passwordLabel}</label>
        <div className={`input-icon-wrap has-toggle${fieldErrors.password ? ' invalid' : ''}`}>
          <Lock size={18} className="input-icon" aria-hidden="true" />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearFieldError('password')
            }}
            placeholder={t.auth.signUp.passwordPlaceholder}
            aria-invalid={!!fieldErrors.password}
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
        {password && (
          <div className={`password-strength strength-${strengthLevel}`}>
            <div className="password-strength-bar">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="password-strength-label">{t.auth.signUp.strength[strengthLevel]}</span>
          </div>
        )}
        {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
      </div>

      <div className="field">
        <label htmlFor="reg-confirm-password">{t.auth.signUp.confirmPasswordLabel}</label>
        <div
          className={`input-icon-wrap${
            fieldErrors.confirmPassword || confirmMismatches
              ? ' invalid'
              : confirmMatches
                ? ' valid'
                : ''
          }`}
        >
          <Lock size={18} className="input-icon" aria-hidden="true" />
          <input
            id="reg-confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              clearFieldError('confirmPassword')
            }}
            placeholder={t.auth.signUp.confirmPasswordPlaceholder}
            aria-invalid={!!fieldErrors.confirmPassword}
          />
        </div>
        {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
        {!fieldErrors.confirmPassword && confirmMatches && (
          <p className="field-success">✅ {t.auth.signUp.passwordsMatch}</p>
        )}
        {!fieldErrors.confirmPassword && confirmMismatches && (
          <p className="field-error">❌ {t.auth.signUp.passwordsMismatch}</p>
        )}
      </div>

      <label className="checkbox-field terms-field">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
        />
        <span>
          {t.auth.signUp.termsPrefix}
          <a href="/terms" target="_blank" rel="noreferrer" className="auth-link">
            {t.auth.signUp.termsLink}
          </a>
          {t.auth.signUp.termsSuffix}
        </span>
      </label>

      <button
        type="submit"
        className="btn-auth-primary"
        disabled={submitting || !agreeTerms}
      >
        {submitting && <Loader2 size={18} className="spin" aria-hidden="true" />}
        {submitting ? t.auth.signUp.submitting : t.auth.signUp.submit}
      </button>
    </form>
  )
}

export default RegisterForm
