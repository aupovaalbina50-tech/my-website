import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in the deployment environment (e.g. Vercel Project Settings -> Environment Variables) and redeploy.',
  )
}

export const REMEMBER_ME_KEY = 'cd_remember_me'

function resolveAuthStorage() {
  if (typeof window === 'undefined') return undefined
  return window.localStorage.getItem(REMEMBER_ME_KEY) === 'false'
    ? window.sessionStorage
    : window.localStorage
}

const dynamicAuthStorage = {
  getItem: (key) => resolveAuthStorage()?.getItem(key) ?? null,
  setItem: (key, value) => resolveAuthStorage()?.setItem(key, value),
  removeItem: (key) => resolveAuthStorage()?.removeItem(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: dynamicAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
