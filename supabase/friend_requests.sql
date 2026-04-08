-- DevAtlas Social Module
-- Stores friend requests, blocks and reports for the student social system.

create extension if not exists pgcrypto;

create or replace function generate_friend_report_public_id()
returns text
language plpgsql
as $$
begin
  return 'REP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'friend_request_status') then
    create type friend_request_status as enum (
      'pending',
      'accepted',
      'rejected',
      'canceled',
      'blocked'
    );
  end if;
end
$$;

create or replace function friends_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_student_account_id uuid not null references student_accounts(id) on delete cascade,
  addressee_student_account_id uuid not null references student_accounts(id) on delete cascade,
  status friend_request_status not null default 'pending',
  message text,
  responded_at timestamptz,
  accepted_at timestamptz,
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_pair_low uuid generated always as (least(requester_student_account_id, addressee_student_account_id)) stored,
  request_pair_high uuid generated always as (greatest(requester_student_account_id, addressee_student_account_id)) stored,
  constraint chk_friend_requests_no_self check (requester_student_account_id <> addressee_student_account_id),
  constraint uq_friend_requests_pair unique (request_pair_low, request_pair_high)
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'requester_user_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'requester_student_account_id'
  ) then
    execute 'alter table friend_requests rename column requester_user_id to requester_student_account_id';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'addressee_user_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'addressee_student_account_id'
  ) then
    execute 'alter table friend_requests rename column addressee_user_id to addressee_student_account_id';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'requester_student_account_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'request_pair_low'
  ) then
    execute 'alter table friend_requests add column request_pair_low uuid generated always as (least(requester_student_account_id, addressee_student_account_id)) stored';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'requester_student_account_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'friend_requests'
      and column_name = 'request_pair_high'
  ) then
    execute 'alter table friend_requests add column request_pair_high uuid generated always as (greatest(requester_student_account_id, addressee_student_account_id)) stored';
  end if;
end
$$;

create index if not exists idx_friend_requests_requester_user_id
  on friend_requests(requester_student_account_id);

create index if not exists idx_friend_requests_addressee_user_id
  on friend_requests(addressee_student_account_id);

create index if not exists idx_friend_requests_status
  on friend_requests(status);

create index if not exists idx_friend_requests_created_at
  on friend_requests(created_at desc);

drop trigger if exists trg_friend_requests_set_updated_at on friend_requests;
create trigger trg_friend_requests_set_updated_at
before update on friend_requests
for each row execute function friends_set_updated_at();

comment on table friend_requests is
  'Tracks friend requests and friendships for the student social system. Accepted rows represent friendships.';

create table if not exists friend_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_student_account_id uuid not null references student_accounts(id) on delete cascade,
  blocked_student_account_id uuid not null references student_accounts(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_friend_blocks_no_self check (blocker_student_account_id <> blocked_student_account_id),
  constraint uq_friend_blocks_pair unique (blocker_student_account_id, blocked_student_account_id)
);

drop trigger if exists trg_friend_blocks_set_updated_at on friend_blocks;
create trigger trg_friend_blocks_set_updated_at
before update on friend_blocks
for each row execute function friends_set_updated_at();

create index if not exists idx_friend_blocks_blocker_student_account_id
  on friend_blocks(blocker_student_account_id);

create index if not exists idx_friend_blocks_blocked_student_account_id
  on friend_blocks(blocked_student_account_id);

create table if not exists friend_reports (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default generate_friend_report_public_id(),
  reporter_student_account_id uuid not null references student_accounts(id) on delete cascade,
  reported_student_account_id uuid not null references student_accounts(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  admin_notes text,
  reviewed_by_admin_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_friend_reports_no_self check (reporter_student_account_id <> reported_student_account_id)
);

drop trigger if exists trg_friend_reports_set_updated_at on friend_reports;
create trigger trg_friend_reports_set_updated_at
before update on friend_reports
for each row execute function friends_set_updated_at();

create index if not exists idx_friend_reports_reporter_student_account_id
  on friend_reports(reporter_student_account_id);

create index if not exists idx_friend_reports_reported_student_account_id
  on friend_reports(reported_student_account_id);

create index if not exists idx_friend_reports_status
  on friend_reports(status);

comment on table friend_blocks is
  'Tracks one-directional blocks between student accounts.';

comment on table friend_reports is
  'Tracks student-submitted reports that are reviewed by administrators.';
