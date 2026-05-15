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

-- =========================
-- ADVANCED MODULE SYSTEM: LESSONS, QUIZZES, TASKS, CALENDAR EVENTS, LABORATOR
-- =========================

-- ENUMS for advanced features
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lesson_type') then
    create type lesson_type as enum ('MATERIAL', 'VIDEO', 'INTERACTIVE', 'READING');
  end if;

  if not exists (select 1 from pg_type where typname = 'quiz_question_type') then
    create type quiz_question_type as enum ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'CODE', 'ESSAY');
  end if;

  if not exists (select 1 from pg_type where typname = 'calendar_event_type') then
    create type calendar_event_type as enum ('LECTURE', 'EXAM', 'LABORATORY', 'SEMINAR', 'CONSULTATION', 'ASSIGNMENT_DUE');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  end if;

  if not exists (select 1 from pg_type where typname = 'laborator_type') then
    create type laborator_type as enum ('CODING', 'DRAWING', 'EXPERIMENTAL', 'PRACTICAL');
  end if;
end
$$;

-- Ensure enum labels exist (idempotent) in case type was created earlier with different labels
-- Note: enum value alterations must be executed in separate committed statements
-- to avoid "unsafe use of new value" errors. Run the ALTER TYPE statements
-- below manually (one per command) in your Supabase SQL editor or psql before
-- executing this migration file if your DB already has the type with fewer labels.

-- Example commands to run separately (one at a time):
-- ALTER TYPE lesson_type ADD VALUE 'MATERIAL';
-- ALTER TYPE lesson_type ADD VALUE 'VIDEO';
-- ALTER TYPE lesson_type ADD VALUE 'INTERACTIVE';
-- ALTER TYPE lesson_type ADD VALUE 'READING';

-- ALTER TYPE quiz_question_type ADD VALUE 'MULTIPLE_CHOICE';
-- ALTER TYPE quiz_question_type ADD VALUE 'TRUE_FALSE';
-- ALTER TYPE quiz_question_type ADD VALUE 'SHORT_ANSWER';
-- ALTER TYPE quiz_question_type ADD VALUE 'CODE';
-- ALTER TYPE quiz_question_type ADD VALUE 'ESSAY';

-- ALTER TYPE calendar_event_type ADD VALUE 'LECTURE';
-- ALTER TYPE calendar_event_type ADD VALUE 'EXAM';
-- ALTER TYPE calendar_event_type ADD VALUE 'LABORATORY';
-- ALTER TYPE calendar_event_type ADD VALUE 'SEMINAR';
-- ALTER TYPE calendar_event_type ADD VALUE 'CONSULTATION';
-- ALTER TYPE calendar_event_type ADD VALUE 'ASSIGNMENT_DUE';

-- ALTER TYPE task_status ADD VALUE 'DRAFT';
-- ALTER TYPE task_status ADD VALUE 'PUBLISHED';
-- ALTER TYPE task_status ADD VALUE 'ARCHIVED';

-- ALTER TYPE laborator_type ADD VALUE 'CODING';
-- ALTER TYPE laborator_type ADD VALUE 'DRAWING';
-- ALTER TYPE laborator_type ADD VALUE 'EXPERIMENTAL';
-- ALTER TYPE laborator_type ADD VALUE 'PRACTICAL';

-- Lessons/Materiale (part of course curriculum)
create table if not exists course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  lesson_type lesson_type,
  content text,
  content_html text,
  order_index integer not null default 0,
  estimated_duration_minutes integer,
  learning_objectives text[],
  key_concepts jsonb not null default '[]'::jsonb,
  cover_image_url text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quizzes (tests created by instructors)
create table if not exists course_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid references course_lessons(id) on delete set null,
  title text not null,
  description text,
  instructions text,
  passing_score_percentage integer not null default 60,
  time_limit_minutes integer,
  randomize_questions boolean default false,
  show_correct_answers_after_submit boolean default false,
  allow_retake boolean default true,
  max_attempts integer,
  order_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quiz Questions
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references course_quizzes(id) on delete cascade,
  question_type quiz_question_type not null,
  question_text text not null,
  question_html text,
  explanation text,
  order_index integer not null default 0,
  points integer not null default 1,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  code_template text,
  allowed_languages text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quiz Submissions (student quiz attempts)
create table if not exists quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references course_quizzes(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete set null,
  score_percentage integer,
  total_points integer,
  earned_points integer,
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Tasks (assignments, homework, projects)
create table if not exists course_tasks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid references course_lessons(id) on delete set null,
  title text not null,
  description text,
  description_html text,
  task_type text not null default 'ASSIGNMENT',
  status task_status,
  instructions text,
  instructions_html text,
  due_date timestamptz,
  estimated_hours integer,
  points_possible integer not null default 100,
  rubric jsonb,
  attachments jsonb not null default '[]'::jsonb,
  order_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Task Submissions (student task submissions)
create table if not exists task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references course_tasks(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete set null,
  submission_text text,
  submission_html text,
  attachments jsonb not null default '[]'::jsonb,
  score integer,
  feedback text,
  feedback_html text,
  status text not null default 'SUBMITTED',
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  graded_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Calendar Events (lectures, exams, lab sessions, seminars, etc.)
create table if not exists course_calendar_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  event_type calendar_event_type not null,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_online boolean default false,
  meeting_link text,
  room_number text,
  instructor_account_id uuid references instructor_accounts(id) on delete set null,
  recurrence text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Attendance (track who attended events)
create table if not exists event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references course_calendar_events(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  attendance_status text not null default 'ABSENT',
  marked_at timestamptz,
  marked_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  unique (event_id, student_id)
);

-- Laborator Sessions (coding labs, practical exercises, drawing exercises)
create table if not exists laborator_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  laborator_type laborator_type not null,
  instructions text,
  instructions_html text,
  difficulty_level text not null default 'BEGINNER',
  estimated_hours integer not null default 2,
  starter_code text,
  starter_files jsonb not null default '[]'::jsonb,
  expected_output text,
  test_cases jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  order_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Laborator Submissions (student lab work)
create table if not exists laborator_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references laborator_sessions(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete set null,
  code_solution text,
  drawing_content text,
  uploaded_files jsonb not null default '[]'::jsonb,
  test_results jsonb,
  score integer,
  feedback text,
  status text not null default 'IN_PROGRESS',
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drawing/Canvas Elements (for material design and course creation UI)
create table if not exists course_drawing_elements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid references course_lessons(id) on delete set null,
  canvas_data text not null,
  title text,
  description text,
  element_type text not null default 'DIAGRAM',
  tags text[],
  metadata jsonb not null default '{}'::jsonb,
  created_by_instructor_account_id uuid references instructor_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Grades (comprehensive grading)
create table if not exists course_grades (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete set null,
  grade_letter text,
  grade_percentage integer,
  final_score numeric(5,2),
  components jsonb not null default '{}'::jsonb,
  feedback text,
  graded_at timestamptz,
  calculated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);

-- Backfill missing columns when tables already existed from partial/older migrations
alter table if exists course_lessons
  add column if not exists order_index integer not null default 0;

alter table if exists course_quizzes
  add column if not exists order_index integer not null default 0;

alter table if exists quiz_questions
  add column if not exists order_index integer not null default 0;

alter table if exists course_tasks
  add column if not exists order_index integer not null default 0;

alter table if exists laborator_sessions
  add column if not exists order_index integer not null default 0;

-- =========================
-- INDEXES for new tables
-- =========================
create index if not exists idx_course_lessons_course_id on course_lessons(course_id);
create index if not exists idx_course_lessons_order on course_lessons(course_id, order_index);
create index if not exists idx_course_quizzes_course_id on course_quizzes(course_id);
create index if not exists idx_course_quizzes_lesson_id on course_quizzes(lesson_id);
create index if not exists idx_quiz_questions_quiz_id on quiz_questions(quiz_id);
create index if not exists idx_quiz_questions_order on quiz_questions(quiz_id, order_index);
create index if not exists idx_quiz_submissions_quiz_id on quiz_submissions(quiz_id);
create index if not exists idx_quiz_submissions_student_id on quiz_submissions(student_id);
create index if not exists idx_course_tasks_course_id on course_tasks(course_id);
create index if not exists idx_course_tasks_lesson_id on course_tasks(lesson_id);
create index if not exists idx_course_tasks_due_date on course_tasks(due_date);
create index if not exists idx_task_submissions_task_id on task_submissions(task_id);
create index if not exists idx_task_submissions_student_id on task_submissions(student_id);
create index if not exists idx_course_calendar_events_course_id on course_calendar_events(course_id);
create index if not exists idx_course_calendar_events_start_time on course_calendar_events(start_time);
create index if not exists idx_event_attendance_event_id on event_attendance(event_id);
create index if not exists idx_event_attendance_student_id on event_attendance(student_id);
create index if not exists idx_laborator_sessions_course_id on laborator_sessions(course_id);
create index if not exists idx_laborator_sessions_type on laborator_sessions(laborator_type);
create index if not exists idx_laborator_submissions_session_id on laborator_submissions(session_id);
create index if not exists idx_laborator_submissions_student_id on laborator_submissions(student_id);
create index if not exists idx_course_drawing_elements_course_id on course_drawing_elements(course_id);
create index if not exists idx_course_grades_course_id on course_grades(course_id);
create index if not exists idx_course_grades_student_id on course_grades(student_id);

-- =========================
-- TRIGGERS for new tables
-- =========================
drop trigger if exists trg_course_lessons_set_updated_at on course_lessons;
create trigger trg_course_lessons_set_updated_at
before update on course_lessons
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_course_quizzes_set_updated_at on course_quizzes;
create trigger trg_course_quizzes_set_updated_at
before update on course_quizzes
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_quiz_questions_set_updated_at on quiz_questions;
create trigger trg_quiz_questions_set_updated_at
before update on quiz_questions
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_course_tasks_set_updated_at on course_tasks;
create trigger trg_course_tasks_set_updated_at
before update on course_tasks
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_task_submissions_set_updated_at on task_submissions;
create trigger trg_task_submissions_set_updated_at
before update on task_submissions
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_course_calendar_events_set_updated_at on course_calendar_events;
create trigger trg_course_calendar_events_set_updated_at
before update on course_calendar_events
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_laborator_sessions_set_updated_at on laborator_sessions;
create trigger trg_laborator_sessions_set_updated_at
before update on laborator_sessions
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_laborator_submissions_set_updated_at on laborator_submissions;
create trigger trg_laborator_submissions_set_updated_at
before update on laborator_submissions
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_course_drawing_elements_set_updated_at on course_drawing_elements;
create trigger trg_course_drawing_elements_set_updated_at
before update on course_drawing_elements
for each row execute function course_system_set_updated_at();

drop trigger if exists trg_course_grades_set_updated_at on course_grades;
create trigger trg_course_grades_set_updated_at
before update on course_grades
for each row execute function course_system_set_updated_at();
