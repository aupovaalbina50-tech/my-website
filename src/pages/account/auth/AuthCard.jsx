import { useState } from 'react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import LoginForm from './LoginForm.jsx'
import RegisterForm from './RegisterForm.jsx'

function AuthCard() {
  const { t } = useLanguage()
  const [tab, setTab] = useState('signIn')

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="auth-tab-signin"
          aria-selected={tab === 'signIn'}
          aria-controls="auth-panel"
          className={`auth-tab${tab === 'signIn' ? ' active' : ''}`}
          onClick={() => setTab('signIn')}
        >
          {t.auth.tabs.signIn}
        </button>
        <button
          type="button"
          role="tab"
          id="auth-tab-signup"
          aria-selected={tab === 'signUp'}
          aria-controls="auth-panel"
          className={`auth-tab${tab === 'signUp' ? ' active' : ''}`}
          onClick={() => setTab('signUp')}
        >
          {t.auth.tabs.signUp}
        </button>
      </div>

      <div
        className="auth-panel"
        id="auth-panel"
        role="tabpanel"
        aria-labelledby={tab === 'signIn' ? 'auth-tab-signin' : 'auth-tab-signup'}
        key={tab}
      >
        {tab === 'signIn' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  )
}

export default AuthCard
