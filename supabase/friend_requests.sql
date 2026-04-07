-- DevAtlas Friend Requests Module
-- Stores friend requests and accepted friendships in a single table.

create extension if not exists pgcrypto;

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
  requester_user_id uuid not null references users(id) on delete cascade,
  addressee_user_id uuid not null references users(id) on delete cascade,
  status friend_request_status not null default 'pending',
  message text,
  responded_at timestamptz,
  accepted_at timestamptz,
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_pair_low uuid generated always as (least(requester_user_id, addressee_user_id)) stored,
  request_pair_high uuid generated always as (greatest(requester_user_id, addressee_user_id)) stored,
  constraint chk_friend_requests_no_self check (requester_user_id <> addressee_user_id),
  constraint uq_friend_requests_pair unique (request_pair_low, request_pair_high)
);

create index if not exists idx_friend_requests_requester_user_id
  on friend_requests(requester_user_id);

create index if not exists idx_friend_requests_addressee_user_id
  on friend_requests(addressee_user_id);

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
