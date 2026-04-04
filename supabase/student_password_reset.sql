-- DevAtlas student password reset codes
-- Run this in Supabase SQL editor before using the forgot-password flow.

create extension if not exists pgcrypto;

create or replace function student_password_resets_set_updated_at()
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

alter table if exists student_password_resets
  alter column auth_user_id drop not null;

drop trigger if exists trg_student_password_resets_set_updated_at on student_password_resets;
create trigger trg_student_password_resets_set_updated_at
before update on student_password_resets
for each row execute function student_password_resets_set_updated_at();

create index if not exists idx_student_password_resets_email on student_password_resets(email);
create index if not exists idx_student_password_resets_expires_at on student_password_resets(expires_at);