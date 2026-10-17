import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, REMEMBER_ME_KEY } from '../supabaseClient'

const AuthContext = createContext(null)

async function resolveEmailForSignIn(identifier) {
  const trimmed = identifier.trim()
  if (!trimmed.includes('@')) {
    const { data, error } = await supabase.rpc('email_for_username', { check_username: trimmed })
    return error ? null : data
  }
  const { data: available, error } = await supabase.rpc('is_email_available', {
    check_email: trimmed,
  })
  if (error) return null
  return available ? null : trimmed
}

function classifySignInError(error) {
  const message = (error.message || '').toLowerCase()
  if (message.includes('invalid login credentials')) return 'wrong_password'
  if (error.code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'email_not_verified'
  if (error.status === 429 || message.includes('too many requests')) return 'too_many_attempts'
  return 'generic'
}

// Supabase Auth error codes (error.code) first, the message as a fallback for older servers.
function classifySignUpError(error) {
  const code = error.code || ''
  const message = (error.message || '').toLowerCase()
  // supabase-js turns a 5xx answer into AuthRetryableFetchError and drops its text: a failed
  // profile trigger («Database error saving new user») and a failed confirmation e-mail are
  // both HTTP 500. Status 0 means the request never reached the server.
  if (error.name === 'AuthRetryableFetchError' || error.status >= 500) return error.status ? 'server' : 'network'
  if (code === 'over_email_send_rate_limit' || message.includes('email rate limit')) return 'email_rate_limited'
  if (code === 'over_request_rate_limit' || error.status === 429 || message.includes('rate limit') || message.includes('too many requests')) return 'rate_limited'
  if (code === 'email_exists' || code === 'user_already_exists' || message.includes('already registered') || message.includes('already been registered')) return 'email_taken'
  if (code === 'signup_disabled' || message.includes('signups not allowed')) return 'signup_disabled'
  // The built-in mail service of Supabase sends only to the project team's addresses.
  if (code === 'email_address_not_authorized' || message.includes('not authorized')) return 'email_not_authorized'
  if (code === 'email_address_invalid' || (message.includes('email') && message.includes('invalid'))) return 'invalid_email'
  if (message.includes('error sending') || message.includes('sending confirmation')) return 'email_send_failed'
  if (code === 'captcha_failed' || message.includes('captcha')) return 'captcha'
  // The profile trigger failed and rolled the account back (see migration 0056).
  if (message.includes('database error')) return 'database'
  if (code === 'weak_password' || message.includes('password')) return 'weak_password'
  return 'generic'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) console.error('Failed to load profile', error)
    if (!data && !error) {
      // An account whose profile was not created at sign-up: the database completes it (migration 0056).
      const { data: created, error: ensureError } = await supabase.rpc('ensure_profile')
      if (ensureError) console.error('Profile could not be created', ensureError)
      setProfile(created?.id ? created : null)
      return
    }
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      fetchProfile(data.session?.user?.id).finally(() => {
        if (active) setLoading(false)
      })
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      fetchProfile(nextSession?.user?.id)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async ({ identifier, password, rememberMe }) => {
    window.localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false')

    const email = await resolveEmailForSignIn(identifier)
    if (!email) {
      return { error: { code: 'user_not_found' } }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // The address goes back, so «Отправить письмо повторно» works when the sign-in was by username.
      return { error: { code: classifySignInError(error), message: error.message, email } }
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, account_status')
      .eq('id', data.user.id)
      .maybeSingle()
    if (profileError) console.error('Failed to load profile after sign-in', profileError)

    if (profileRow?.account_status === 'suspended') {
      await supabase.auth.signOut()
      return { error: { code: 'account_suspended' } }
    }

    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)

    return { data, profile: profileRow }
  }, [])

  const signUp = useCallback(
    async ({ firstName, lastName, username, email, password, preferredLanguage }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username,
            preferred_language: preferredLanguage,
          },
          emailRedirectTo: `${window.location.origin}/account`,
        },
      })
      if (error) {
        const lost = !error.message || error.message === '{}'
        return { error: { code: classifySignUpError(error), message: lost ? `HTTP ${error.status ?? 0}` : error.message } }
      }
      // With e-mail confirmation on, Supabase answers an already registered address with a
      // user that has no identities and sends nothing — say so instead of «check your mail».
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { error: { code: 'email_taken' } }
      }
      return { data }
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const resendVerificationEmail = useCallback(async (email) => {
    return supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/account` } })
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    })
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    return supabase.auth.updateUser({ password: newPassword })
  }, [])

  const checkUsernameAvailable = useCallback(async (username) => {
    const { data, error } = await supabase.rpc('is_username_available', {
      check_username: username,
    })
    if (error) return null
    return data
  }, [])

  const checkEmailAvailable = useCallback(async (email) => {
    const { data, error } = await supabase.rpc('is_email_available', { check_email: email })
    if (error) return null
    return data
  }, [])

  const refreshProfile = useCallback(() => {
    return fetchProfile(session?.user?.id)
  }, [fetchProfile, session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAuthenticated: !!session,
      loading,
      signIn,
      signUp,
      signOut,
      resendVerificationEmail,
      sendPasswordReset,
      updatePassword,
      checkUsernameAvailable,
      checkEmailAvailable,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      resendVerificationEmail,
      sendPasswordReset,
      updatePassword,
      checkUsernameAvailable,
      checkEmailAvailable,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
