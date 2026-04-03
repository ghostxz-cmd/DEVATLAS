-- DevAtlas instructor management
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create or replace function role_accounts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists student_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  status text not null default 'ACTIVE',
  avatar_url text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_student_accounts_set_updated_at on student_accounts;
create trigger trg_student_accounts_set_updated_at
before update on student_accounts
for each row execute function role_accounts_set_updated_at();

create table if not exists instructor_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  status text not null default 'ACTIVE',
  avatar_url text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_instructor_accounts_set_updated_at on instructor_accounts;
create trigger trg_instructor_accounts_set_updated_at
before update on instructor_accounts
for each row execute function role_accounts_set_updated_at();

create or replace function instructor_profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists instructor_profiles (
  id uuid primary key default gen_random_uuid(),
  instructor_account_id uuid not null unique references instructor_accounts(id) on delete cascade,
  phone text,
  title text,
  bio text,
  expertise text[] not null default '{}'::text[],
  can_manage_courses boolean not null default true,
  can_manage_content boolean not null default false,
  can_review_submissions boolean not null default true,
  can_manage_students boolean not null default false,
  can_view_support boolean not null default false,
  is_supervisor boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure column exists even when instructor_profiles was created in a legacy schema.
alter table if exists instructor_profiles
  add column if not exists instructor_account_id uuid;

drop trigger if exists trg_instructor_profiles_set_updated_at on instructor_profiles;
create trigger trg_instructor_profiles_set_updated_at
before update on instructor_profiles
for each row execute function instructor_profiles_set_updated_at();

create table if not exists instructor_activity_logs (
  id uuid primary key default gen_random_uuid(),
  instructor_account_id uuid not null references instructor_accounts(id) on delete cascade,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  activity_type text not null,
  activity_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Ensure columns exist even when instructor_activity_logs was created in a legacy schema.
alter table if exists instructor_activity_logs
  add column if not exists instructor_account_id uuid,
  add column if not exists actor_auth_user_id uuid;

-- Backward-compatible migration from old schema variants
alter table instructor_profiles
  add column if not exists instructor_account_id uuid;

alter table instructor_activity_logs
  add column if not exists instructor_account_id uuid,
  add column if not exists actor_auth_user_id uuid;

-- If legacy user_id column exists with NOT NULL, make it nullable to allow new flow.
do $$
declare
  col_nullable text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_profiles'
      and column_name = 'user_id'
  ) then
    select is_nullable into col_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_profiles'
      and column_name = 'user_id'
    limit 1;

    if col_nullable = 'NO' then
      alter table instructor_profiles
        alter column user_id drop not null;
    end if;
  end if;
end
$$;

-- If legacy users table exists, sync instructor_accounts from it.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    insert into instructor_accounts (auth_user_id, email, full_name, status)
    select
      u.supabase_auth_id,
      lower(u.email),
      u.full_name,
      case when u.status is null then 'ACTIVE' else u.status::text end
    from users u
    where u.role::text = 'INSTRUCTOR'
      and u.supabase_auth_id is not null
    on conflict (auth_user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        status = excluded.status,
        updated_at = now();
  end if;
end
$$;

-- Backfill instructor_profiles.instructor_account_id from legacy instructor_profiles.user_id.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_profiles'
      and column_name = 'user_id'
  ) then
    update instructor_profiles p
    set instructor_account_id = ia.id
    from users u
    join instructor_accounts ia on ia.auth_user_id = u.supabase_auth_id
    where p.instructor_account_id is null
      and p.user_id = u.id
      and u.supabase_auth_id is not null;

    -- Also, backfill user_id from instructor_account if user_id is null but instructor_account_id exists.
    -- This ensures legacy columns stay in sync for backward compatibility.
    update instructor_profiles p
    set user_id = u.id
    from users u
    join instructor_accounts ia on ia.auth_user_id = u.supabase_auth_id
    where p.user_id is null
      and ia.id = p.instructor_account_id;
  end if;
end
$$;

-- Backfill instructor_activity_logs.* from legacy columns.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_activity_logs'
      and column_name = 'instructor_user_id'
  ) then
    update instructor_activity_logs l
    set instructor_account_id = ia.id
    from users iu
    join instructor_accounts ia on ia.auth_user_id = iu.supabase_auth_id
    where l.instructor_account_id is null
      and l.instructor_user_id = iu.id
      and iu.supabase_auth_id is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_activity_logs'
      and column_name = 'actor_user_id'
  ) then
    update instructor_activity_logs l
    set actor_auth_user_id = au.supabase_auth_id
    from users au
    where l.actor_auth_user_id is null
      and l.actor_user_id = au.id
      and au.supabase_auth_id is not null;
  end if;
end
$$;

-- Add FK constraints safely if missing.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_instructor_profiles_account'
  ) then
    alter table instructor_profiles
      add constraint fk_instructor_profiles_account
      foreign key (instructor_account_id)
      references instructor_accounts(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_instructor_activity_account'
  ) then
    alter table instructor_activity_logs
      add constraint fk_instructor_activity_account
      foreign key (instructor_account_id)
      references instructor_accounts(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_instructor_activity_actor_auth'
  ) then
    alter table instructor_activity_logs
      add constraint fk_instructor_activity_actor_auth
      foreign key (actor_auth_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_student_accounts_email on student_accounts(email);
create index if not exists idx_student_accounts_auth_user_id on student_accounts(auth_user_id);
create index if not exists idx_instructor_accounts_email on instructor_accounts(email);
create index if not exists idx_instructor_accounts_auth_user_id on instructor_accounts(auth_user_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_profiles'
      and column_name = 'instructor_account_id'
  ) then
    create index if not exists idx_instructor_profiles_account_id
      on instructor_profiles(instructor_account_id);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instructor_activity_logs'
      and column_name = 'instructor_account_id'
  ) then
    create index if not exists idx_instructor_activity_logs_instructor
      on instructor_activity_logs(instructor_account_id, created_at desc);
  end if;
end
$$;

-- Student and instructor password reset tables for code-based resets.
create or replace function password_resets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists student_password_resets (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_student_password_resets_set_updated_at on student_password_resets;
create trigger trg_student_password_resets_set_updated_at
before update on student_password_resets
for each row execute function password_resets_set_updated_at();

create table if not exists instructor_password_resets (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_instructor_password_resets_set_updated_at on instructor_password_resets;
create trigger trg_instructor_password_resets_set_updated_at
before update on instructor_password_resets
for each row execute function password_resets_set_updated_at();

create index if not exists idx_student_password_resets_email on student_password_resets(email);
create index if not exists idx_student_password_resets_expires_at on student_password_resets(expires_at);
create index if not exists idx_instructor_password_resets_email on instructor_password_resets(email);
create index if not exists idx_instructor_password_resets_expires_at on instructor_password_resets(expires_at);