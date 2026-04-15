-- DevAtlas Course System v1
-- Additive migration for course groups (folder/module), course grouping, and secure instructor-managed assets.
-- Run this after init_devatlas.sql and instructor_management.sql.

create extension if not exists pgcrypto;

-- =========================
-- ENUMS
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'course_group_kind') then
    create type course_group_kind as enum ('FOLDER', 'MODULE');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_asset_scope') then
    create type course_asset_scope as enum ('GROUP', 'COURSE', 'LESSON');
  end if;
end
$$;

-- =========================
-- HELPERS
-- =========================
create or replace function course_system_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function course_system_instructor_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ia.id
  from instructor_accounts ia
  where ia.auth_user_id = auth.uid()
    and ia.status = 'ACTIVE'
  limit 1;
$$;

-- =========================
-- TABLES
-- =========================
create table if not exists course_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  kind course_group_kind not null default 'FOLDER',
  cover_image_url text,
  level_required course_level,
  visibility course_visibility not null default 'DRAFT',
  owner_instructor_account_id uuid not null references instructor_accounts(id) on delete cascade,
  coordinator_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references course_groups(id) on delete cascade,
  instructor_account_id uuid not null references instructor_accounts(id) on delete cascade,
  role text not null default 'MEMBER',
  created_at timestamptz not null default now(),
  unique (group_id, instructor_account_id)
);

create table if not exists course_assets (
  id uuid primary key default gen_random_uuid(),
  scope course_asset_scope not null,
  group_id uuid references course_groups(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  title text not null,
  description text,
  file_name text,
  storage_bucket text not null default 'course-assets',
  storage_path text,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'GROUP' and group_id is not null and course_id is null and lesson_id is null)
    or
    (scope = 'COURSE' and course_id is not null and group_id is null and lesson_id is null)
    or
    (scope = 'LESSON' and lesson_id is not null and group_id is null and course_id is null)
  )
);

alter table if exists courses
  add column if not exists group_id uuid references course_groups(id) on delete set null,
  add column if not exists required_level course_level,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists published_at timestamptz;

create or replace function course_system_is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from instructor_accounts ia
    where ia.auth_user_id = auth.uid()
      and ia.status = 'ACTIVE'
  );
$$;

create or replace function course_system_is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from course_groups cg
    where cg.id = p_group_id
      and cg.owner_instructor_account_id = course_system_instructor_account_id()
  );
$$;

create or replace function course_system_is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from course_group_members cgm
    where cgm.group_id = p_group_id
      and cgm.instructor_account_id = course_system_instructor_account_id()
  );
$$;

create or replace function course_system_can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select course_system_is_group_owner(p_group_id)
      or course_system_is_group_member(p_group_id);
$$;

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_course_groups_owner on course_groups(owner_instructor_account_id);
create index if not exists idx_course_groups_coordinator on course_groups(coordinator_instructor_account_id);
create index if not exists idx_course_groups_visibility on course_groups(visibility);
create index if not exists idx_course_group_members_group on course_group_members(group_id);
create index if not exists idx_course_group_members_instructor on course_group_members(instructor_account_id);
create index if not exists idx_course_assets_scope on course_assets(scope);
create index if not exists idx_course_assets_group_id on course_assets(group_id);
create index if not exists idx_course_assets_course_id on course_assets(course_id);
create index if not exists idx_course_assets_lesson_id on course_assets(lesson_id);
create index if not exists idx_courses_group_id on courses(group_id);
create index if not exists idx_courses_required_level on courses(required_level);

-- =========================
-- TRIGGERS
-- =========================
drop trigger if exists trg_course_groups_set_updated_at on course_groups;
create trigger trg_course_groups_set_updated_at
before update on course_groups
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_course_assets_set_updated_at on course_assets;
create trigger trg_course_assets_set_updated_at
before update on course_assets
for each row execute function course_system_set_updated_at();

-- =========================
-- RLS
-- =========================
alter table course_groups enable row level security;
alter table course_group_members enable row level security;
alter table course_assets enable row level security;

-- Course groups: members can read their own groups; public published groups are visible to authenticated users.
drop policy if exists course_groups_select_auth on course_groups;
create policy course_groups_select_auth
on course_groups
for select
to authenticated
using (
  visibility = 'PUBLISHED'
  or course_system_can_manage_group(id)
);

drop policy if exists course_groups_insert_instructor on course_groups;
create policy course_groups_insert_instructor
on course_groups
for insert
to authenticated
with check (
  course_system_is_instructor()
  and owner_instructor_account_id = course_system_instructor_account_id()
);

drop policy if exists course_groups_update_owner_or_coordinator on course_groups;
create policy course_groups_update_owner_or_coordinator
on course_groups
for update
to authenticated
using (
  course_system_can_manage_group(id)
)
with check (
  course_system_can_manage_group(id)
);

drop policy if exists course_groups_delete_owner on course_groups;
create policy course_groups_delete_owner
on course_groups
for delete
to authenticated
using (
  course_system_is_group_owner(id)
);

-- Group members: only group owners/coordinators can manage membership.
drop policy if exists course_group_members_select_manage on course_group_members;
create policy course_group_members_select_manage
on course_group_members
for select
to authenticated
using (
  course_system_can_manage_group(group_id)
);

drop policy if exists course_group_members_insert_manage on course_group_members;
create policy course_group_members_insert_manage
on course_group_members
for insert
to authenticated
with check (
  course_system_can_manage_group(group_id)
);

drop policy if exists course_group_members_update_manage on course_group_members;
create policy course_group_members_update_manage
on course_group_members
for update
to authenticated
using (
  course_system_can_manage_group(group_id)
)
with check (
  course_system_can_manage_group(group_id)
);

drop policy if exists course_group_members_delete_manage on course_group_members;
create policy course_group_members_delete_manage
on course_group_members
for delete
to authenticated
using (
  course_system_can_manage_group(group_id)
);

-- Assets: visible if linked to a published group/course or if the user can manage the scope.
drop policy if exists course_assets_select_scope on course_assets;
create policy course_assets_select_scope
on course_assets
for select
to authenticated
using (
  (
    scope = 'GROUP'
    and exists (
      select 1
      from course_groups cg
      where cg.id = course_assets.group_id
        and (cg.visibility = 'PUBLISHED' or course_system_can_manage_group(cg.id))
    )
  )
  or (
    scope = 'COURSE'
    and exists (
      select 1
      from courses c
      where c.id = course_assets.course_id
        and (
          c.visibility = 'PUBLISHED'
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
  or (
    scope = 'LESSON'
    and exists (
      select 1
      from lessons l
      join courses c on c.id = l.course_id
      where l.id = course_assets.lesson_id
        and (
          c.visibility = 'PUBLISHED'
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
);

drop policy if exists course_assets_insert_manage on course_assets;
create policy course_assets_insert_manage
on course_assets
for insert
to authenticated
with check (
  (
    scope = 'GROUP'
    and group_id is not null
    and course_system_can_manage_group(group_id)
  )
  or (
    scope = 'COURSE'
    and course_id is not null
    and exists (
      select 1
      from courses c
      where c.id = course_assets.course_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
  or (
    scope = 'LESSON'
    and lesson_id is not null
    and exists (
      select 1
      from lessons l
      join courses c on c.id = l.course_id
      where l.id = course_assets.lesson_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
);

drop policy if exists course_assets_update_manage on course_assets;
create policy course_assets_update_manage
on course_assets
for update
to authenticated
using (
  (
    scope = 'GROUP'
    and group_id is not null
    and course_system_can_manage_group(group_id)
  )
  or (
    scope = 'COURSE'
    and course_id is not null
    and exists (
      select 1
      from courses c
      where c.id = course_assets.course_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
  or (
    scope = 'LESSON'
    and lesson_id is not null
    and exists (
      select 1
      from lessons l
      join courses c on c.id = l.course_id
      where l.id = course_assets.lesson_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
)
with check (
  (
    scope = 'GROUP'
    and group_id is not null
    and course_system_can_manage_group(group_id)
  )
  or (
    scope = 'COURSE'
    and course_id is not null
    and exists (
      select 1
      from courses c
      where c.id = course_assets.course_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
  or (
    scope = 'LESSON'
    and lesson_id is not null
    and exists (
      select 1
      from lessons l
      join courses c on c.id = l.course_id
      where l.id = course_assets.lesson_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
);

drop policy if exists course_assets_delete_manage on course_assets;
create policy course_assets_delete_manage
on course_assets
for delete
to authenticated
using (
  (
    scope = 'GROUP'
    and group_id is not null
    and course_system_can_manage_group(group_id)
  )
  or (
    scope = 'COURSE'
    and course_id is not null
    and exists (
      select 1
      from courses c
      where c.id = course_assets.course_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
  or (
    scope = 'LESSON'
    and lesson_id is not null
    and exists (
      select 1
      from lessons l
      join courses c on c.id = l.course_id
      where l.id = course_assets.lesson_id
        and (
          c.created_by = course_system_instructor_account_id()
          or exists (
            select 1
            from course_groups cg
            where cg.id = c.group_id
              and course_system_can_manage_group(cg.id)
          )
        )
    )
  )
);

-- Optional: make course links visible to the same audience as the parent course/group.
drop policy if exists courses_select_group_safe on courses;
create policy courses_select_group_safe
on courses
for select
to authenticated
using (
  visibility = 'PUBLISHED'
  or created_by = course_system_instructor_account_id()
  or exists (
    select 1
    from course_groups cg
    where cg.id = courses.group_id
      and course_system_can_manage_group(cg.id)
  )
);

drop policy if exists courses_insert_instructor on courses;
create policy courses_insert_instructor
on courses
for insert
to authenticated
with check (
  course_system_is_instructor()
  and (
    created_by = course_system_instructor_account_id()
    or exists (
      select 1
      from course_groups cg
      where cg.id = courses.group_id
        and course_system_can_manage_group(cg.id)
    )
  )
);

drop policy if exists courses_update_owner_or_group on courses;
create policy courses_update_owner_or_group
on courses
for update
to authenticated
using (
  created_by = course_system_instructor_account_id()
  or exists (
    select 1
    from course_groups cg
    where cg.id = courses.group_id
      and course_system_can_manage_group(cg.id)
  )
)
with check (
  created_by = course_system_instructor_account_id()
  or exists (
    select 1
    from course_groups cg
    where cg.id = courses.group_id
      and course_system_can_manage_group(cg.id)
  )
);

drop policy if exists courses_delete_owner_or_group on courses;
create policy courses_delete_owner_or_group
on courses
for delete
to authenticated
using (
  created_by = course_system_instructor_account_id()
  or exists (
    select 1
    from course_groups cg
    where cg.id = courses.group_id
      and course_system_can_manage_group(cg.id)
  )
);

-- =========================
-- COMMENTS
-- =========================
comment on table course_groups is
  'Top-level container for a course folder or module. A group can contain multiple courses and later its own coordinator dashboard.';

comment on table course_group_members is
  'Instructor membership for course folders/modules. Use this to grant coordinators or collaborators access.';

comment on table course_assets is
  'Reusable attachments for folders, courses, or lessons. Store only metadata here; actual files live in Storage.';
