-- DevAtlas Course Group Chat (real backend persistence)
-- Run after init_devatlas.sql

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'course_group_chat_channel') then
    create type course_group_chat_channel as enum ('general', 'announcements', 'qa', 'students-only');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_group_chat_sender_role') then
    create type course_group_chat_sender_role as enum ('profesor', 'elev', 'asistent', 'sistem');
  end if;
end
$$;

create or replace function course_group_chat_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists course_group_chats (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references courses(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references course_group_chats(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  sender_user_id uuid references users(id) on delete set null,
  sender_name text not null,
  sender_role course_group_chat_sender_role not null,
  channel course_group_chat_channel not null default 'general',
  message text not null,
  is_pinned boolean not null default false,
  reactions jsonb not null default '{"like":0,"fire":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_group_chats_course_id on course_group_chats(course_id);
create index if not exists idx_course_group_chat_messages_course_id on course_group_chat_messages(course_id);
create index if not exists idx_course_group_chat_messages_chat_channel_created on course_group_chat_messages(chat_id, channel, created_at);
create index if not exists idx_course_group_chat_messages_sender_user_id on course_group_chat_messages(sender_user_id);
create index if not exists idx_course_group_chat_messages_pinned on course_group_chat_messages(chat_id, is_pinned);

drop trigger if exists trg_course_group_chats_set_updated_at on course_group_chats;
create trigger trg_course_group_chats_set_updated_at
before update on course_group_chats
for each row execute function course_group_chat_set_updated_at();

drop trigger if exists trg_course_group_chat_messages_set_updated_at on course_group_chat_messages;
create trigger trg_course_group_chat_messages_set_updated_at
before update on course_group_chat_messages
for each row execute function course_group_chat_set_updated_at();
