// Rate limits for the inspector. Every page OCR and every analyzed chunk is
// one AI call (a typical document = a few calls), so each counts. Limits
// are tighter than the chat assistant's. Reuses the generic
// `ai_chat_rate_limit_check` Postgres function already used by ai-chat, with
// its own identifier prefix so the two features have separate counters.
//
// Tunable via Edge Function secrets, no code change needed:
//   supabase secrets set DOC_INSPECTOR_LIMIT_PER_HOUR=60
//   supabase secrets set DOC_INSPECTOR_LIMIT_PER_DAY=200
//   supabase secrets set DOC_INSPECTOR_GLOBAL_PER_DAY=1500

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

function envInt(name: string, fallback: number): number {
  const parsed = parseInt(Deno.env.get(name) ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function withinLimit(identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('ai_chat_rate_limit_check', {
    p_identifier: identifier,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    // Same policy as ai-chat: if the limiter itself breaks, don't take the
    // feature down — but log it loudly.
    console.error('doc-inspector rate limit check failed, allowing request:', error)
    return true
  }
  return data === true
}

export interface RateLimitResult {
  allowed: boolean
  reason?: 'per_hour' | 'per_day' | 'global'
  retryAfterSeconds?: number
}

/** `who` is the signed-in user's id when available, otherwise the client IP. */
export async function enforceInspectorLimits(who: string): Promise<RateLimitResult> {
  if (!(await withinLimit(`doc-inspector:global`, envInt('DOC_INSPECTOR_GLOBAL_PER_DAY', 1500), 86400))) {
    return { allowed: false, reason: 'global', retryAfterSeconds: 3600 }
  }
  if (!(await withinLimit(`doc-inspector:h:${who}`, envInt('DOC_INSPECTOR_LIMIT_PER_HOUR', 60), 3600))) {
    return { allowed: false, reason: 'per_hour', retryAfterSeconds: 3600 }
  }
  if (!(await withinLimit(`doc-inspector:d:${who}`, envInt('DOC_INSPECTOR_LIMIT_PER_DAY', 200), 86400))) {
    return { allowed: false, reason: 'per_day', retryAfterSeconds: 86400 }
  }
  return { allowed: true }
}
