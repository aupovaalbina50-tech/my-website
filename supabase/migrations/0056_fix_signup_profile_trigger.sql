-- =============================================================
-- Sign-up: a profile problem must never reject the account.
--
-- handle_new_user() runs inside the transaction that creates the auth.users
-- row; any error in it rolls the sign-up back and Supabase Auth answers only
-- «Database error saving new user». With 0001 + 0018 three cases did exactly
-- that (reproduced on these migrations):
--   * the username is taken and has 12+ characters — the 0018 fallback
--     «<12 chars>_<8 chars>» is 21 characters, over the 4–20 username_format;
--   * preferred_language other than 'kk' / 'ru' (profiles check constraint);
--   * a username with characters outside [A-Za-z0-9_] (a direct API call).
--
-- Now the values are made valid before the insert (username cleaned to the
-- allowed characters and length, language limited to kk/ru, names trimmed),
-- a taken username falls back to «u_» + 18 characters of the user id (20
-- characters, valid, unique per user), and if the profile still cannot be
-- written the account is created anyway — the profile is then created by
-- public.ensure_profile() at the user's first sign-in.
--
-- Also: ensure_profile() (called by the site after sign-in when the profile
-- is missing) and a one-time backfill for accounts that already exist
-- without a profile.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0056_fix_signup_profile_trigger.sql
-- =============================================================

begin;

-- The profile values for a user, always within the table's constraints.
create or replace function public.profile_values_for(u_id uuid, meta jsonb)
returns table (first_name text, last_name text, username text, preferred_language text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  wanted text := regexp_replace(coalesce(meta ->> 'username', ''), '[^A-Za-z0-9_]', '', 'g');
begin
  first_name := left(btrim(coalesce(meta ->> 'first_name', '')), 100);
  last_name := left(btrim(coalesce(meta ->> 'last_name', '')), 100);
  username := case when length(wanted) between 4 and 20 then wanted
                   when length(wanted) > 20 then left(wanted, 20)
                   else 'user_' || substr(u_id::text, 1, 8) end;
  preferred_language := case when meta ->> 'preferred_language' in ('kk', 'ru') then meta ->> 'preferred_language' else 'kk' end;
  return next;
end;
$$;

-- «u_» + the first 18 hex characters of the id: 20 characters, matches username_format.
create or replace function public.fallback_username(u_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$ select 'u_' || left(replace(u_id::text, '-', ''), 18) $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select * into v from public.profile_values_for(new.id, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  begin
    insert into public.profiles (id, first_name, last_name, username, preferred_language)
    values (new.id, v.first_name, v.last_name, v.username, v.preferred_language);
  exception
    when unique_violation then
      -- The username was taken between the availability check and now.
      begin
        insert into public.profiles (id, first_name, last_name, username, preferred_language)
        values (new.id, v.first_name, v.last_name, public.fallback_username(new.id), v.preferred_language)
        on conflict (id) do nothing;
      exception when others then
        raise warning 'handle_new_user: profile for % not created: %', new.id, sqlerrm;
      end;
    when others then
      -- Never block the account; ensure_profile() completes it at first sign-in.
      raise warning 'handle_new_user: profile for % not created: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

-- Creates the profile of the signed-in user if it is missing; returns it.
create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  meta jsonb;
  v record;
  result public.profiles;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into result from public.profiles where id = me;
  if found then
    return result;
  end if;
  select coalesce(raw_user_meta_data, '{}'::jsonb) into meta from auth.users where id = me;
  select * into v from public.profile_values_for(me, meta);
  begin
    insert into public.profiles (id, first_name, last_name, username, preferred_language)
    values (me, v.first_name, v.last_name, v.username, v.preferred_language);
  exception when unique_violation then
    insert into public.profiles (id, first_name, last_name, username, preferred_language)
    values (me, v.first_name, v.last_name, public.fallback_username(me), v.preferred_language)
    on conflict (id) do nothing;
  end;
  select * into result from public.profiles where id = me;
  return result;
end;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

-- One-time repair: accounts created while the old trigger could not write a profile.
do $$
declare
  u record;
  v record;
begin
  for u in select au.id, coalesce(au.raw_user_meta_data, '{}'::jsonb) as meta, au.email_confirmed_at
           from auth.users au left join public.profiles p on p.id = au.id
           where p.id is null
  loop
    select * into v from public.profile_values_for(u.id, u.meta);
    begin
      insert into public.profiles (id, first_name, last_name, username, preferred_language, email_verified)
      values (u.id, v.first_name, v.last_name, v.username, v.preferred_language, u.email_confirmed_at is not null);
    exception when unique_violation then
      insert into public.profiles (id, first_name, last_name, username, preferred_language, email_verified)
      values (u.id, v.first_name, v.last_name, public.fallback_username(u.id), v.preferred_language, u.email_confirmed_at is not null)
      on conflict (id) do nothing;
    end;
  end loop;
end;
$$;

commit;
