-- =============================================================
-- Personal Account: profiles table + Supabase Auth wiring
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

-- ---- profiles table ---------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  username text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  preferred_language text not null default 'kk' check (preferred_language in ('kk', 'ru')),
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  email_verified boolean not null default false,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{4,20}$')
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

comment on table public.profiles is 'Extended user profile data for the Personal Account, one row per auth.users row.';

-- ---- row level security -------------------------------------------------

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy for the client: rows are created only by the
-- on_auth_user_created trigger below (runs as SECURITY DEFINER).

-- Prevent a signed-in user from promoting themselves to admin, unsuspending
-- their own account, or faking email verification through the update
-- policy above. Admins changing these fields directly in the SQL editor
-- should temporarily `alter table public.profiles disable trigger profiles_protect_fields;`.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    new.role := old.role;
  end if;
  if new.account_status is distinct from old.account_status then
    new.account_status := old.account_status;
  end if;
  if new.email_verified is distinct from old.email_verified then
    new.email_verified := old.email_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---- auto-create a profile row on signup ---------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, username, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'kk')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- keep profiles.email_verified in sync with Supabase's own record ----

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- ---- username / email availability checks (no direct table access needed) ----

create or replace function public.is_username_available(check_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(check_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.is_email_available(check_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select not exists (
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

grant execute on function public.is_email_available(text) to anon, authenticated;

-- Resolve a username to its email so users can sign in with either.
-- Returns null if the username doesn't exist (client shows "User not found").
create or replace function public.email_for_username(check_username text)
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(check_username)
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;
