-- =============================================================
-- AI Assistant rate limiting: per-IP and global request counters
-- backing the ai-chat Edge Function, so it never blows through the
-- free LLM quota.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
--   Safe to re-run: create-if-not-exists / create-or-replace throughout.
-- =============================================================

create table if not exists public.ai_rate_limits (
  identifier text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0
);

comment on table public.ai_rate_limits is
  'Fixed-window request counters for the ai-chat Edge Function, keyed by scope '
  '(e.g. "ip:1.2.3.4:minute", "ip:1.2.3.4:day", "global:day"). Only ever written '
  'through ai_chat_rate_limit_check() — never exposed to the browser.';

alter table public.ai_rate_limits enable row level security;
-- Intentionally no policies: anon/authenticated get zero direct access.
-- The Edge Function talks to this table only via the SECURITY DEFINER
-- function below, called with the service-role key (server-side only).

create or replace function public.ai_chat_rate_limit_check(
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  select window_start, request_count into v_window_start, v_count
  from public.ai_rate_limits
  where identifier = p_identifier
  for update;

  if not found then
    insert into public.ai_rate_limits (identifier, window_start, request_count)
    values (p_identifier, now(), 1);
    return true;
  end if;

  -- window expired: start a fresh one
  if now() - v_window_start >= make_interval(secs => p_window_seconds) then
    update public.ai_rate_limits
    set window_start = now(), request_count = 1
    where identifier = p_identifier;
    return true;
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update public.ai_rate_limits
  set request_count = request_count + 1
  where identifier = p_identifier;
  return true;
end;
$$;

-- Only the Edge Function (using the service-role key) may call this —
-- deliberately NOT granted to anon/authenticated, otherwise any visitor
-- could call it directly to reset or manipulate counters.
grant execute on function public.ai_chat_rate_limit_check(text, integer, integer) to service_role;

-- Housekeeping so the table doesn't grow forever; safe to call repeatedly
-- (e.g. from a periodic pg_cron job, or just left to grow slowly — rows
-- are tiny and bounded by distinct IPs seen per day).
create or replace function public.ai_rate_limits_cleanup()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ai_rate_limits where window_start < now() - interval '2 days';
$$;

grant execute on function public.ai_rate_limits_cleanup() to service_role;
