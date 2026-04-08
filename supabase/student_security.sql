-- DevAtlas Student Security Module
-- Adds PIN + TOTP 2FA storage for student accounts.
-- Run after the main DevAtlas schema that creates student_accounts.

create extension if not exists pgcrypto;

-- =========================
-- ENUMS
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'student_security_event_type') then
    create type student_security_event_type as enum (
      'pin_set',
      'pin_changed',
      'pin_verified',
      'pin_disabled',
      'pin_locked',
      'totp_setup_started',
      'totp_enabled',
      'totp_disabled',
      'totp_verified',
      'totp_backup_codes_generated',
      'totp_backup_code_used',
      'unlock_granted'
    );
  end if;
end
$$;

-- =========================
-- HELPERS
-- =========================
create or replace function student_security_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- TABLES
-- =========================
create table if not exists student_account_security_settings (
  student_account_id uuid primary key references student_accounts(id) on delete cascade,
  pin_hash text,
  pin_enabled boolean not null default false,
  pin_failed_attempts integer not null default 0,
  pin_locked_until timestamptz,
  pin_last_verified_at timestamptz,
  pin_reset_code_hash text,
  pin_reset_expires_at timestamptz,
  pin_reset_attempts integer not null default 0,
  pin_reset_requested_at timestamptz,
  totp_secret text,
  totp_pending_secret text,
  totp_enabled boolean not null default false,
  totp_confirmed_at timestamptz,
  totp_last_used_at timestamptz,
  totp_last_used_counter bigint,
  require_pin_for_sensitive_changes boolean not null default true,
  backup_codes_generated_at timestamptz,
  last_unlock_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists student_account_security_settings
  add column if not exists pin_reset_code_hash text,
  add column if not exists pin_reset_expires_at timestamptz,
  add column if not exists pin_reset_attempts integer not null default 0,
  add column if not exists pin_reset_requested_at timestamptz;

create table if not exists student_security_backup_codes (
  id uuid primary key default gen_random_uuid(),
  student_account_id uuid not null references student_accounts(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_account_id, code_hash)
);

create table if not exists student_security_events (
  id uuid primary key default gen_random_uuid(),
  student_account_id uuid not null references student_accounts(id) on delete cascade,
  event_type student_security_event_type not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_student_account_security_settings_totp_enabled
  on student_account_security_settings(totp_enabled);

create index if not exists idx_student_account_security_settings_pin_enabled
  on student_account_security_settings(pin_enabled);

create index if not exists idx_student_account_security_settings_pin_locked_until
  on student_account_security_settings(pin_locked_until);

create index if not exists idx_student_security_backup_codes_student_account_id
  on student_security_backup_codes(student_account_id);

create index if not exists idx_student_security_backup_codes_used_at
  on student_security_backup_codes(used_at);

create index if not exists idx_student_security_events_student_account_id_created_at
  on student_security_events(student_account_id, created_at desc);

-- =========================
-- TRIGGERS
-- =========================
drop trigger if exists trg_student_account_security_settings_set_updated_at on student_account_security_settings;
create trigger trg_student_account_security_settings_set_updated_at
before update on student_account_security_settings
for each row execute function student_security_set_updated_at();

-- =========================
-- COMMENTS
-- =========================
comment on table student_account_security_settings is
  'Stores PIN and TOTP state for student accounts. Sensitive data is managed by backend routes only.';

comment on table student_security_backup_codes is
  'Hashed one-time backup codes for student 2FA recovery.';

comment on table student_security_events is
  'Security audit log for student PIN and 2FA actions.';
