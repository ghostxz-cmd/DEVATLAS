-- DevAtlas Support Ticketing Module (Supabase/Postgres)
-- Safe to run multiple times (idempotent where practical).

create extension if not exists pgcrypto;

-- =========================
-- ENUMS
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'support_ticket_status') then
    create type support_ticket_status as enum (
      'open',
      'in_progress',
      'waiting_user',
      'resolved',
      'closed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'support_ticket_priority') then
    create type support_ticket_priority as enum (
      'low',
      'normal',
      'high',
      'critical'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'support_sender_type') then
    create type support_sender_type as enum (
      'user',
      'admin',
      'system'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'support_event_type') then
    create type support_event_type as enum (
      'ticket_created',
      'ticket_updated',
      'status_changed',
      'priority_changed',
      'assigned',
      'message_added',
      'attachment_added',
      'ticket_resolved',
      'ticket_closed',
      'ticket_reopened'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'support_email_status') then
    create type support_email_status as enum (
      'pending',
      'sent',
      'failed'
    );
  end if;
end
$$;

-- =========================
-- HELPERS
-- =========================
create or replace function support_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create sequence if not exists support_ticket_public_seq;

create or replace function support_generate_ticket_public_id()
returns trigger
language plpgsql
as $$
declare
  seq_num bigint;
begin
  if new.public_id is null or length(trim(new.public_id)) = 0 then
    seq_num := nextval('support_ticket_public_seq');
    new.public_id := 'DAT-' || to_char(now(), 'YYYY') || '-' || lpad(seq_num::text, 6, '0');
  end if;

  if new.last_message_at is null then
    new.last_message_at := now();
  end if;

  return new;
end;
$$;

create or replace function support_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() ->> 'role') = 'admin',
    false
  );
$$;

-- =========================
-- TABLES
-- =========================
create table if not exists support_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,

  requester_user_id uuid references auth.users(id) on delete set null,
  requester_email text not null,
  requester_name text,

  category_id uuid references support_categories(id) on delete set null,
  subject text not null,
  description text not null,

  status support_ticket_status not null default 'open',
  priority support_ticket_priority not null default 'normal',

  assigned_admin_user_id uuid references auth.users(id) on delete set null,

  source text not null default 'web_form',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,

  sender_type support_sender_type not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_email text,

  message text not null,
  is_internal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists support_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  message_id uuid references support_messages(id) on delete cascade,

  file_name text not null,
  storage_bucket text not null default 'support-attachments',
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text,

  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,

  event_type support_event_type not null,
  actor_user_id uuid references auth.users(id) on delete set null,

  old_value jsonb,
  new_value jsonb,
  note text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists support_email_outbox (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references support_tickets(id) on delete cascade,
  message_id uuid references support_messages(id) on delete cascade,

  recipient_email text not null,
  subject text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,

  status support_email_status not null default 'pending',
  attempts int not null default 0,
  last_error text,

  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_support_tickets_requester_user_id on support_tickets(requester_user_id);
create index if not exists idx_support_tickets_requester_email on support_tickets(requester_email);
create index if not exists idx_support_tickets_status_priority on support_tickets(status, priority);
create index if not exists idx_support_tickets_assigned_admin on support_tickets(assigned_admin_user_id);
create index if not exists idx_support_tickets_created_at on support_tickets(created_at desc);
create index if not exists idx_support_tickets_last_message_at on support_tickets(last_message_at desc);

create index if not exists idx_support_messages_ticket_id_created on support_messages(ticket_id, created_at);
create index if not exists idx_support_messages_sender_user_id on support_messages(sender_user_id);

create index if not exists idx_support_attachments_ticket_id on support_attachments(ticket_id);
create index if not exists idx_support_attachments_message_id on support_attachments(message_id);

create index if not exists idx_support_ticket_events_ticket_id_created on support_ticket_events(ticket_id, created_at);
create index if not exists idx_support_ticket_events_actor on support_ticket_events(actor_user_id);

create index if not exists idx_support_email_outbox_status_scheduled on support_email_outbox(status, scheduled_for);
create index if not exists idx_support_email_outbox_ticket_id on support_email_outbox(ticket_id);

-- =========================
-- TRIGGERS
-- =========================
drop trigger if exists trg_support_categories_set_updated_at on support_categories;
create trigger trg_support_categories_set_updated_at
before update on support_categories
for each row execute function support_set_updated_at();

drop trigger if exists trg_support_tickets_set_updated_at on support_tickets;
create trigger trg_support_tickets_set_updated_at
before update on support_tickets
for each row execute function support_set_updated_at();

drop trigger if exists trg_support_email_outbox_set_updated_at on support_email_outbox;
create trigger trg_support_email_outbox_set_updated_at
before update on support_email_outbox
for each row execute function support_set_updated_at();

drop trigger if exists trg_support_tickets_generate_public_id on support_tickets;
create trigger trg_support_tickets_generate_public_id
before insert on support_tickets
for each row execute function support_generate_ticket_public_id();

create or replace function support_touch_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update support_tickets
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_support_messages_touch_ticket on support_messages;
create trigger trg_support_messages_touch_ticket
after insert on support_messages
for each row execute function support_touch_last_message_at();

create or replace function support_log_ticket_event()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into support_ticket_events (ticket_id, event_type, actor_user_id, new_value, note)
    values (
      new.id,
      'ticket_created',
      auth.uid(),
      jsonb_build_object('status', new.status, 'priority', new.priority),
      'Ticket created'
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status then
      insert into support_ticket_events (ticket_id, event_type, actor_user_id, old_value, new_value, note)
      values (
        new.id,
        case
          when new.status = 'resolved' then 'ticket_resolved'
          when new.status = 'closed' then 'ticket_closed'
          when old.status in ('resolved', 'closed') and new.status = 'open' then 'ticket_reopened'
          else 'status_changed'
        end,
        auth.uid(),
        jsonb_build_object('status', old.status),
        jsonb_build_object('status', new.status),
        'Status updated'
      );
    end if;

    if old.priority is distinct from new.priority then
      insert into support_ticket_events (ticket_id, event_type, actor_user_id, old_value, new_value, note)
      values (
        new.id,
        'priority_changed',
        auth.uid(),
        jsonb_build_object('priority', old.priority),
        jsonb_build_object('priority', new.priority),
        'Priority updated'
      );
    end if;

    if old.assigned_admin_user_id is distinct from new.assigned_admin_user_id then
      insert into support_ticket_events (ticket_id, event_type, actor_user_id, old_value, new_value, note)
      values (
        new.id,
        'assigned',
        auth.uid(),
        jsonb_build_object('assigned_admin_user_id', old.assigned_admin_user_id),
        jsonb_build_object('assigned_admin_user_id', new.assigned_admin_user_id),
        'Assignment changed'
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_support_tickets_log_events on support_tickets;
create trigger trg_support_tickets_log_events
after insert or update on support_tickets
for each row execute function support_log_ticket_event();

create or replace function support_log_message_event()
returns trigger
language plpgsql
as $$
begin
  insert into support_ticket_events (ticket_id, event_type, actor_user_id, new_value, note)
  values (
    new.ticket_id,
    'message_added',
    coalesce(new.sender_user_id, auth.uid()),
    jsonb_build_object('message_id', new.id, 'sender_type', new.sender_type, 'is_internal', new.is_internal),
    'Message added'
  );

  return new;
end;
$$;

drop trigger if exists trg_support_messages_log_event on support_messages;
create trigger trg_support_messages_log_event
after insert on support_messages
for each row execute function support_log_message_event();

-- =========================
-- SEED CATEGORIES
-- =========================
insert into support_categories (slug, name, description)
values
  ('technical', 'Problema Tehnica', 'Erori aplicatie, bug-uri, functionalitati nefunctionale.'),
  ('billing', 'Facturare', 'Plati, facturi, abonamente, refund.'),
  ('account', 'Cont si Autentificare', 'Login, parola, acces cont, verificare email.'),
  ('course', 'Cursuri si Continut', 'Lectii, quiz-uri, progres, materiale.'),
  ('other', 'Altele', 'Orice alta solicitare.')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    is_active = true,
    updated_at = now();

-- =========================
-- RLS (SECURE BY DEFAULT)
-- =========================
alter table support_categories enable row level security;
alter table support_tickets enable row level security;
alter table support_messages enable row level security;
alter table support_attachments enable row level security;
alter table support_ticket_events enable row level security;
alter table support_email_outbox enable row level security;

-- Categories: everyone authenticated can read, only admin can change.
drop policy if exists support_categories_select_auth on support_categories;
create policy support_categories_select_auth
on support_categories
for select
to authenticated
using (is_active = true or support_is_admin());

drop policy if exists support_categories_admin_all on support_categories;
create policy support_categories_admin_all
on support_categories
for all
to authenticated
using (support_is_admin())
with check (support_is_admin());

-- Tickets: requester can create/read own; admin full access.
drop policy if exists support_tickets_insert_auth on support_tickets;
create policy support_tickets_insert_auth
on support_tickets
for insert
to authenticated
with check (
  requester_user_id = auth.uid()
  and requester_email = coalesce(auth.jwt() ->> 'email', requester_email)
);

drop policy if exists support_tickets_select_owner_or_admin on support_tickets;
create policy support_tickets_select_owner_or_admin
on support_tickets
for select
to authenticated
using (
  support_is_admin()
  or requester_user_id = auth.uid()
  or requester_email = auth.jwt() ->> 'email'
);

drop policy if exists support_tickets_update_admin_or_owner_limited on support_tickets;
create policy support_tickets_update_admin_or_owner_limited
on support_tickets
for update
to authenticated
using (
  support_is_admin()
  or requester_user_id = auth.uid()
)
with check (
  support_is_admin()
  or requester_user_id = auth.uid()
);

-- Messages: owner can add non-internal messages; admin all.
drop policy if exists support_messages_select_owner_or_admin on support_messages;
create policy support_messages_select_owner_or_admin
on support_messages
for select
to authenticated
using (
  support_is_admin()
  or exists (
    select 1
    from support_tickets t
    where t.id = support_messages.ticket_id
      and (t.requester_user_id = auth.uid() or t.requester_email = auth.jwt() ->> 'email')
  )
);

drop policy if exists support_messages_insert_owner_or_admin on support_messages;
create policy support_messages_insert_owner_or_admin
on support_messages
for insert
to authenticated
with check (
  (
    support_is_admin()
    and sender_type in ('admin', 'system')
  )
  or (
    sender_type = 'user'
    and is_internal = false
    and exists (
      select 1
      from support_tickets t
      where t.id = support_messages.ticket_id
        and (t.requester_user_id = auth.uid() or t.requester_email = auth.jwt() ->> 'email')
    )
  )
);

-- Attachments: owner/admin read; inserts only by owner/admin.
drop policy if exists support_attachments_select_owner_or_admin on support_attachments;
create policy support_attachments_select_owner_or_admin
on support_attachments
for select
to authenticated
using (
  support_is_admin()
  or exists (
    select 1
    from support_tickets t
    where t.id = support_attachments.ticket_id
      and (t.requester_user_id = auth.uid() or t.requester_email = auth.jwt() ->> 'email')
  )
);

drop policy if exists support_attachments_insert_owner_or_admin on support_attachments;
create policy support_attachments_insert_owner_or_admin
on support_attachments
for insert
to authenticated
with check (
  support_is_admin()
  or exists (
    select 1
    from support_tickets t
    where t.id = support_attachments.ticket_id
      and (t.requester_user_id = auth.uid() or t.requester_email = auth.jwt() ->> 'email')
  )
);

-- Ticket events/outbox: only admin can read and mutate.
drop policy if exists support_ticket_events_admin_all on support_ticket_events;
create policy support_ticket_events_admin_all
on support_ticket_events
for all
to authenticated
using (support_is_admin())
with check (support_is_admin());

drop policy if exists support_email_outbox_admin_all on support_email_outbox;
create policy support_email_outbox_admin_all
on support_email_outbox
for all
to authenticated
using (support_is_admin())
with check (support_is_admin());

-- =========================
-- OPTIONAL RPC FOR PUBLIC FORM (NO LOGIN)
-- Call this from backend only (recommended), or expose cautiously.
-- =========================
create or replace function support_create_ticket_public(
  p_requester_email text,
  p_requester_name text,
  p_category_slug text,
  p_subject text,
  p_description text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(ticket_id uuid, ticket_public_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_ticket_id uuid;
  v_ticket_public_id text;
begin
  if p_requester_email is null or length(trim(p_requester_email)) < 5 then
    raise exception 'Invalid email';
  end if;

  if p_subject is null or length(trim(p_subject)) < 3 then
    raise exception 'Invalid subject';
  end if;

  if p_description is null or length(trim(p_description)) < 10 then
    raise exception 'Invalid description';
  end if;

  select id
  into v_category_id
  from support_categories
  where slug = p_category_slug
    and is_active = true
  limit 1;

  if v_category_id is null then
    select id into v_category_id
    from support_categories
    where slug = 'other'
    limit 1;
  end if;

  insert into support_tickets (
    requester_email,
    requester_name,
    category_id,
    subject,
    description,
    source,
    metadata
  )
  values (
    lower(trim(p_requester_email)),
    nullif(trim(p_requester_name), ''),
    v_category_id,
    trim(p_subject),
    trim(p_description),
    'public_form',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id, public_id into v_ticket_id, v_ticket_public_id;

  insert into support_messages (
    ticket_id,
    sender_type,
    sender_email,
    message,
    is_internal
  )
  values (
    v_ticket_id,
    'user',
    lower(trim(p_requester_email)),
    trim(p_description),
    false
  );

  insert into support_email_outbox (
    ticket_id,
    recipient_email,
    subject,
    template_key,
    payload
  )
  values (
    v_ticket_id,
    lower(trim(p_requester_email)),
    'Ticket confirmat: ' || v_ticket_public_id,
    'ticket_created',
    jsonb_build_object(
      'ticket_public_id', v_ticket_public_id,
      'subject', trim(p_subject)
    )
  );

  return query select v_ticket_id, v_ticket_public_id;
end;
$$;

revoke all on function support_create_ticket_public(text, text, text, text, text, jsonb) from public;
grant execute on function support_create_ticket_public(text, text, text, text, text, jsonb) to service_role;

-- =========================
-- NOTES
-- 1) Keep inserts from anonymous users through backend/API only.
-- 2) Worker should process support_email_outbox and mark sent/failed.
-- 3) For attachments, create Supabase storage bucket "support-attachments"
--    with strict storage policies.
-- =========================
