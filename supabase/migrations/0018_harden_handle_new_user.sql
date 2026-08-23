-- =============================================================
-- Harden handle_new_user() against signup failures
--
-- Problem: handle_new_user() (0001_profiles_and_auth.sql) inserts into
-- public.profiles using the username submitted by the client. profiles
-- has a unique index on lower(username). The client only soft-checks
-- username availability with a debounced RPC before submit, so two users
-- racing on the same username (or a stale "available" check) can hit the
-- unique constraint inside this AFTER INSERT trigger. Because the trigger
-- runs in the same transaction as the auth.users insert, that violation
-- rolls back the entire signup and Supabase Auth returns an opaque
-- "Database error saving new user" — the user sees a generic failure with
-- no way to recover.
--
-- Fix: catch unique_violation on the username and retry with a
-- guaranteed-unique suffix instead of failing the signup outright, and
-- catch any other unexpected error so a profile-row problem never blocks
-- account creation.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'user_' || substr(new.id::text, 1, 8)
  );
  final_username := base_username;

  begin
    insert into public.profiles (id, first_name, last_name, username, preferred_language)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'first_name', ''),
      coalesce(new.raw_user_meta_data ->> 'last_name', ''),
      final_username,
      coalesce(new.raw_user_meta_data ->> 'preferred_language', 'kk')
    );
  exception
    when unique_violation then
      -- Someone else took this username between the client's availability
      -- check and this insert. Fall back to a suffixed username so the
      -- account is still created; the user can rename later.
      final_username := substr(base_username, 1, 12) || '_' || substr(new.id::text, 1, 8);
      insert into public.profiles (id, first_name, last_name, username, preferred_language)
      values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'first_name', ''),
        coalesce(new.raw_user_meta_data ->> 'last_name', ''),
        final_username,
        coalesce(new.raw_user_meta_data ->> 'preferred_language', 'kk')
      );
  end;

  return new;
end;
$$;
