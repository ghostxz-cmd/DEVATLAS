-- Ensure student credential storage model for DevAtlas
-- Credential secret (password hash) is managed by Supabase Auth in auth.users.
-- This script ensures local profile linkage in public.users.

create extension if not exists pgcrypto;

do $$
begin
	if not exists (select 1 from pg_type where typname = 'user_role') then
		create type user_role as enum ('STUDENT', 'INSTRUCTOR', 'ADMIN');
	end if;

	if not exists (select 1 from pg_type where typname = 'user_status') then
		create type user_status as enum ('ACTIVE', 'PENDING_EMAIL_VERIFICATION', 'SUSPENDED', 'DELETED');
	end if;
end
$$;

create or replace function ensure_student_users_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create table if not exists users (
	id uuid primary key default gen_random_uuid(),
	supabase_auth_id uuid unique references auth.users(id) on delete set null,
	email text not null unique,
	password_hash text,
	full_name text not null,
	role user_role not null default 'STUDENT',
	status user_status not null default 'PENDING_EMAIL_VERIFICATION',
	avatar_url text,
	timezone text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz
);

create index if not exists idx_users_supabase_auth_id on users(supabase_auth_id);
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_status on users(status);

drop trigger if exists trg_users_set_updated_at on users;
create trigger trg_users_set_updated_at
before update on users
for each row execute function ensure_student_users_updated_at();

-- Optional guardrail: for auth-managed users, do not persist local password hashes.
update users
set password_hash = null
where supabase_auth_id is not null;
