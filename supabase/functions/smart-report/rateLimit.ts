// Rate limits for «Рапортты құрастыру». Each extract / compose request is
// one AI call. Reuses the generic `ai_chat_rate_limit_check` Postgres
// function (as ai-chat and doc-inspector do) with its own identifier
// prefix, so the report tool has separate counters.
//
// Tunable via Edge Function secrets:
//   supabase secrets set SMART_REPORT_LIMIT_PER_HOUR=40
//   supabase secrets set SMART_REPORT_LIMIT_PER_DAY=150
//   supabase secrets set SMART_REPORT_GLOBAL_PER_DAY=1000

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
    console.error('smart-report rate limit check failed, allowing request:', error)
    return true
  }
  return data === true
}

export interface RateLimitResult {
  allowed: boolean
  reason?: 'per_hour' | 'per_day' | 'global'
  retryAfterSeconds?: number
}

export async function enforceReportLimits(userId: string): Promise<RateLimitResult> {
  if (!(await withinLimit('smart-report:global', envInt('SMART_REPORT_GLOBAL_PER_DAY', 1000), 86400))) {
    return { allowed: false, reason: 'global', retryAfterSeconds: 3600 }
  }
  if (!(await withinLimit(`smart-report:h:${userId}`, envInt('SMART_REPORT_LIMIT_PER_HOUR', 40), 3600))) {
    return { allowed: false, reason: 'per_hour', retryAfterSeconds: 3600 }
  }
  if (!(await withinLimit(`smart-report:d:${userId}`, envInt('SMART_REPORT_LIMIT_PER_DAY', 150), 86400))) {
    return { allowed: false, reason: 'per_day', retryAfterSeconds: 86400 }
  }
  return { allowed: true }
}
