import { createClient } from 'npm:@supabase/supabase-js@2'

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
// Edge Function by the platform — no secret needs to be set for these.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

interface WindowConfig {
  limit: number
  windowSeconds: number
}

function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name)
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * All three limits are configurable purely via Edge Function secrets —
 * no code change needed to retune them:
 *   supabase secrets set AI_RATE_LIMIT_PER_MINUTE=30
 *   supabase secrets set AI_RATE_LIMIT_PER_DAY=300
 *   supabase secrets set AI_GLOBAL_LIMIT_PER_DAY=1500
 */
function getConfig(): Record<'perMinute' | 'perDay' | 'globalPerDay', WindowConfig> {
  return {
    perMinute: { limit: envInt('AI_RATE_LIMIT_PER_MINUTE', 25), windowSeconds: 60 },
    perDay: { limit: envInt('AI_RATE_LIMIT_PER_DAY', 200), windowSeconds: 86400 },
    globalPerDay: { limit: envInt('AI_GLOBAL_LIMIT_PER_DAY', 1000), windowSeconds: 86400 },
  }
}

async function checkWindow(identifier: string, config: WindowConfig): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('ai_chat_rate_limit_check', {
    p_identifier: identifier,
    p_limit: config.limit,
    p_window_seconds: config.windowSeconds,
  })

  if (error) {
    // If the limiter itself is broken, fail OPEN rather than taking the
    // whole assistant down — but log loudly so it gets noticed.
    console.error('ai_chat_rate_limit_check failed, allowing request:', error)
    return true
  }

  return data === true
}

export type RateLimitReason = 'per_minute' | 'per_day' | 'global'

export interface RateLimitResult {
  allowed: boolean
  reason?: RateLimitReason
  retryAfterSeconds?: number
}

/** Extracts the caller's IP from standard proxy headers. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Three layers of defense for the free LLM quota:
 *  1. per-IP per-minute  — stops a single client hammering the endpoint
 *  2. per-IP per-day     — stops slow-and-steady abuse from one client
 *  3. global per-day     — hard ceiling on the whole project's spend,
 *                          regardless of how many distinct IPs are involved
 */
export async function enforceRateLimits(clientIp: string): Promise<RateLimitResult> {
  const config = getConfig()

  if (!(await checkWindow(`ip:${clientIp}:minute`, config.perMinute))) {
    return { allowed: false, reason: 'per_minute', retryAfterSeconds: config.perMinute.windowSeconds }
  }
  if (!(await checkWindow(`ip:${clientIp}:day`, config.perDay))) {
    return { allowed: false, reason: 'per_day', retryAfterSeconds: config.perDay.windowSeconds }
  }
  if (!(await checkWindow('global:day', config.globalPerDay))) {
    return { allowed: false, reason: 'global', retryAfterSeconds: config.globalPerDay.windowSeconds }
  }

  return { allowed: true }
}
