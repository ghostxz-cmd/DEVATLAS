
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('STUDENT', 'INSTRUCTOR', 'ADMIN');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type user_status as enum ('ACTIVE', 'PENDING_EMAIL_VERIFICATION', 'SUSPENDED', 'DELETED');
  end if;

  if not exists (select 1 from pg_type where typname = 'auth_provider_type') then
    create type auth_provider_type as enum ('EMAIL', 'GOOGLE', 'GITHUB', 'MICROSOFT');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_visibility') then
    create type course_visibility as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_level') then
    create type course_level as enum ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
  end if;

  if not exists (select 1 from pg_type where typname = 'lesson_type') then
    create type lesson_type as enum ('TEXT', 'VIDEO', 'CODE', 'SIMULATION', 'QUIZ', 'HYBRID');
  end if;

  if not exists (select 1 from pg_type where typname = 'lesson_block_type') then
    create type lesson_block_type as enum ('RICH_TEXT', 'VIDEO_EMBED', 'CODE_PLAYGROUND', 'QUIZ', 'SIMULATION_3D', 'RESOURCE', 'DOWNLOADABLE_RESOURCE');
  end if;

  if not exists (select 1 from pg_type where typname = 'quiz_question_type') then
    create type quiz_question_type as enum ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'CODE_OUTPUT', 'SHORT_ANSWER');
  end if;

  if not exists (select 1 from pg_type where typname = 'enrollment_status') then
    create type enrollment_status as enum ('ACTIVE', 'COMPLETED', 'PAUSED', 'DROPPED');
  end if;

  if not exists (select 1 from pg_type where typname = 'submission_type') then
    create type submission_type as enum ('QUIZ', 'CODE', 'TASK');
  end if;

  if not exists (select 1 from pg_type where typname = 'submission_verdict') then
    create type submission_verdict as enum ('PENDING', 'PASSED', 'FAILED', 'ERROR');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type notification_type as enum ('SYSTEM', 'COURSE', 'QUIZ', 'ACHIEVEMENT');
  end if;
end
$$;

create or replace function set_updated_at()
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

create table if not exists auth_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider auth_provider_type not null,
  provider_user_id text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_user_id)
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_token_hash text not null,
  user_agent text,
  ip_address text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists course_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  level course_level not null default 'BEGINNER',
  language text not null default 'en',
  category_id uuid references course_categories(id) on delete set null,
  visibility course_visibility not null default 'DRAFT',
  thumbnail_url text,
  created_by uuid not null references users(id),
  estimated_mins integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  section_id uuid references course_sections(id) on delete set null,
  title text not null,
  slug text not null unique,
  lesson_type lesson_type not null,
  estimated_minutes integer not null default 5,
  position integer not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table if not exists lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  block_type lesson_block_type not null,
  config_json jsonb not null,
  position integer not null,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, position)
);

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references lessons(id) on delete cascade,
  title text not null,
  passing_score integer not null default 70,
  attempts_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  type quiz_question_type not null,
  prompt text not null,
  points integer not null default 1,
  position integer not null,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, position)
);

create table if not exists quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status enrollment_status not null default 'ACTIVE',
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  status text not null default 'not_started',
  last_activity_at timestamptz,
  time_spent_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  submission_type submission_type not null,
  payload_json jsonb not null,
  score integer,
  verdict submission_verdict not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table if not exists code_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  language text not null,
  source_hash text not null,
  runtime text,
  cpu_ms integer,
  memory_kb integer,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  xp_reward integer not null default 0,
  badge_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table if not exists xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  action_type text not null,
  points integer not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  file_key text not null unique,
  mime_type text not null,
  size_bytes integer not null,
  duration_seconds integer,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  payload_json jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);


create index if not exists idx_users_role on users(role);
create index if not exists idx_users_status on users(status);

create index if not exists idx_auth_providers_user_id on auth_providers(user_id);
create index if not exists idx_user_sessions_user_id on user_sessions(user_id);
create index if not exists idx_user_sessions_expires_at on user_sessions(expires_at);

create index if not exists idx_email_verification_tokens_user_id on email_verification_tokens(user_id);
create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens(user_id);

create index if not exists idx_courses_category_id on courses(category_id);
create index if not exists idx_courses_created_by on courses(created_by);
create index if not exists idx_courses_visibility on courses(visibility);

create index if not exists idx_course_sections_course_id on course_sections(course_id);
create index if not exists idx_lessons_course_id on lessons(course_id);
create index if not exists idx_lessons_section_id on lessons(section_id);
create index if not exists idx_lesson_blocks_lesson_id on lesson_blocks(lesson_id);

create index if not exists idx_quiz_questions_quiz_id on quiz_questions(quiz_id);
create index if not exists idx_quiz_answers_question_id on quiz_answers(question_id);

create index if not exists idx_enrollments_user_id on enrollments(user_id);
create index if not exists idx_enrollments_course_id on enrollments(course_id);

create index if not exists idx_progress_user_course on progress(user_id, course_id);
create index if not exists idx_progress_course_id on progress(course_id);
create index if not exists idx_progress_lesson_id on progress(lesson_id);

create index if not exists idx_submissions_user_lesson on submissions(user_id, lesson_id);
create index if not exists idx_submissions_lesson_id on submissions(lesson_id);

create index if not exists idx_code_executions_user_lesson on code_executions(user_id, lesson_id);
create index if not exists idx_code_executions_created_at on code_executions(created_at);

create index if not exists idx_user_achievements_user_id on user_achievements(user_id);
create index if not exists idx_xp_ledger_user_created on xp_ledger(user_id, created_at);

create index if not exists idx_media_assets_owner_id on media_assets(owner_id);

create index if not exists idx_audit_logs_actor_user_id on audit_logs(actor_user_id);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);

create index if not exists idx_notifications_user_created on notifications(user_id, created_at);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists trg_course_categories_updated_at on course_categories;
create trigger trg_course_categories_updated_at
before update on course_categories
for each row execute function set_updated_at();

drop trigger if exists trg_courses_updated_at on courses;
create trigger trg_courses_updated_at
before update on courses
for each row execute function set_updated_at();

drop trigger if exists trg_course_sections_updated_at on course_sections;
create trigger trg_course_sections_updated_at
before update on course_sections
for each row execute function set_updated_at();

drop trigger if exists trg_lessons_updated_at on lessons;
create trigger trg_lessons_updated_at
before update on lessons
for each row execute function set_updated_at();

drop trigger if exists trg_lesson_blocks_updated_at on lesson_blocks;
create trigger trg_lesson_blocks_updated_at
before update on lesson_blocks
for each row execute function set_updated_at();

drop trigger if exists trg_quizzes_updated_at on quizzes;
create trigger trg_quizzes_updated_at
before update on quizzes
for each row execute function set_updated_at();

drop trigger if exists trg_quiz_questions_updated_at on quiz_questions;
create trigger trg_quiz_questions_updated_at
before update on quiz_questions
for each row execute function set_updated_at();

drop trigger if exists trg_quiz_answers_updated_at on quiz_answers;
create trigger trg_quiz_answers_updated_at
before update on quiz_answers
for each row execute function set_updated_at();

drop trigger if exists trg_enrollments_updated_at on enrollments;
create trigger trg_enrollments_updated_at
before update on enrollments
for each row execute function set_updated_at();

drop trigger if exists trg_progress_updated_at on progress;
create trigger trg_progress_updated_at
before update on progress
for each row execute function set_updated_at();

drop trigger if exists trg_achievements_updated_at on achievements;
create trigger trg_achievements_updated_at
before update on achievements
for each row execute function set_updated_at();

create or replace view leaderboard as
select
  u.id as user_id,
  u.full_name,
  coalesce(sum(x.points), 0)::int as total_xp
from users u
left join xp_ledger x on x.user_id = u.id
group by u.id, u.full_name
order by total_xp desc;
