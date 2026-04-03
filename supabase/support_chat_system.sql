-- DevAtlas Support Chat System (MVP v1)
-- Add this in Supabase SQL Editor.
-- This schema is enough for:
-- - admin creating a shareable chat link
-- - storing live messages
-- - tracking last activity
-- - API/server using service role to read/write anonymous customer chats

create extension if not exists pgcrypto;

-- =========================
-- ENUMS
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'support_chat_sender_type') then
    create type support_chat_sender_type as enum (
      'admin',
      'customer',
      'system'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'support_chat_status') then
    create type support_chat_status as enum (
      'active',
      'closed'
    );
  end if;
end
$$;

-- =========================
-- HELPERS
-- =========================
create or replace function support_generate_chat_share_token()
returns trigger
language plpgsql
as $$
begin
  if new.share_token is null or length(trim(new.share_token)) = 0 then
    new.share_token := encode(gen_random_bytes(24), 'hex');
  end if;

  return new;
end;
$$;

create or replace function support_chat_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function support_chat_touch_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update support_chats
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.chat_id;

  return new;
end;
$$;

-- =========================
-- TABLES
-- =========================
create table if not exists support_chats (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  share_token text not null unique,
  customer_email text not null,
  customer_name text,
  created_by_admin_user_id uuid references auth.users(id) on delete set null,
  assigned_admin_user_id uuid references auth.users(id) on delete set null,
  status support_chat_status not null default 'active',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references support_chats(id) on delete cascade,
  sender_type support_chat_sender_type not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_email text,
  message text not null,
  attachments jsonb not null default '[]'::jsonb,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_support_chats_ticket_id on support_chats(ticket_id);
create index if not exists idx_support_chats_share_token on support_chats(share_token);
create index if not exists idx_support_chats_status_updated_at on support_chats(status, updated_at desc);
create index if not exists idx_support_chat_messages_chat_id_created_at on support_chat_messages(chat_id, created_at asc);
create index if not exists idx_support_chat_messages_sender_user_id on support_chat_messages(sender_user_id);

-- =========================
-- TRIGGERS
-- =========================
drop trigger if exists trg_support_chats_generate_share_token on support_chats;
create trigger trg_support_chats_generate_share_token
before insert on support_chats
for each row execute function support_generate_chat_share_token();

drop trigger if exists trg_support_chats_set_updated_at on support_chats;
create trigger trg_support_chats_set_updated_at
before update on support_chats
for each row execute function support_chat_touch_updated_at();

drop trigger if exists trg_support_chat_messages_touch_chat on support_chat_messages;
create trigger trg_support_chat_messages_touch_chat
after insert on support_chat_messages
for each row execute function support_chat_touch_last_message_at();

-- =========================
-- RLS
-- =========================
alter table support_chats enable row level security;
alter table support_chat_messages enable row level security;

-- Admin access only by default.
-- Public/customer access will be handled by the API using service role.
drop policy if exists support_chats_admin_all on support_chats;
create policy support_chats_admin_all
on support_chats
for all
using (support_is_admin())
with check (support_is_admin());

drop policy if exists support_chat_messages_admin_all on support_chat_messages;
create policy support_chat_messages_admin_all
on support_chat_messages
for all
using (support_is_admin())
with check (support_is_admin());
