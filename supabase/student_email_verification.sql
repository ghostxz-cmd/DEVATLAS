-- DevAtlas student email verification codes
-- Run this in the Supabase SQL editor before enabling the new signup flow.

create extension if not exists pgcrypto;

create or replace function student_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists student_email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_student_email_verifications_set_updated_at on student_email_verifications;
create trigger trg_student_email_verifications_set_updated_at
before update on student_email_verifications
for each row execute function student_set_updated_at();

create index if not exists idx_student_email_verifications_email on student_email_verifications(email);
create index if not exists idx_student_email_verifications_expires_at on student_email_verifications(expires_at);