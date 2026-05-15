import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getEnv(name: string, ...fallbacks: Array<string | undefined>) {
  const value = [process.env[name], ...fallbacks].find((item) => Boolean(item));
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function getSupabaseUrl() {
  return getEnv('SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function getServiceRoleKey() {
  return getEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE,
    process.env.SUPABASE_SERVICE_KEY,
  );
}

function getAnonKey() {
  return getEnv(
    'SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function createAdminClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey());
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';

    // Get all modules for a course
    const { data: modules, error } = await supabase
      .from('course_groups')
      .select('*')
      .eq('metadata->>courseId', courseId)
      .eq('kind', 'MODULE');

    if (error) throw error;

    // Enhance each module with content counts
    const enhanced = await Promise.all(
      (modules ?? []).map(async (mod: any) => {
        const [{ data: lessons }, { data: tasks }, { data: quizzes }] = await Promise.all([
          supabase
            .from('course_lessons')
            .select('id', { count: 'exact' })
            .eq('course_group_id', mod.id),
          supabase
            .from('course_tasks')
            .select('id', { count: 'exact' })
            .eq('course_group_id', mod.id),
          supabase
            .from('course_quizzes')
            .select('id', { count: 'exact' })
            .eq('course_group_id', mod.id),
        ]);

        return {
          ...mod,
          lesson_count: lessons?.length ?? 0,
          task_count: tasks?.length ?? 0,
          quiz_count: quizzes?.length ?? 0,
        };
      })
    );

    return NextResponse.json(enhanced);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';
    const body = await request.json();

    const { title, description, coverImageUrl, minPassingScore } = body;

    // Verify instructor is authenticated via Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const authClient = createClient(
      getSupabaseUrl(),
      getAnonKey(),
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: sessionData } = await authClient.auth.getUser();
    if (!sessionData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get instructor account
    const { data: instructor } = await supabase
      .from('instructor_accounts')
      .select('id')
      .eq('auth_user_id', sessionData.user.id)
      .eq('status', 'ACTIVE')
      .single();

    if (!instructor) {
      return NextResponse.json({ error: 'Not an instructor' }, { status: 403 });
    }

    // Resolve app-level user id mapping used by courses.created_by in many flows
    const normalizedEmail = (sessionData.user.email ?? '').trim().toLowerCase();
    let appUserId: string | null = null;

    const { data: appUserByAuth } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_auth_id', sessionData.user.id)
      .maybeSingle();

    if (appUserByAuth?.id) {
      appUserId = appUserByAuth.id;
    } else if (normalizedEmail) {
      const { data: appUserByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();
      appUserId = appUserByEmail?.id ?? null;
    }

    // Verify course exists and is manageable by this instructor identity
    const { data: course } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const canManageCourse =
      course.created_by === instructor.id ||
      course.created_by === sessionData.user.id ||
      (appUserId !== null && course.created_by === appUserId);

    if (!canManageCourse) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create module
    const { data: module, error: createError } = await supabase
      .from('course_groups')
      .insert({
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        description,
        kind: 'MODULE',
        cover_image_url: coverImageUrl,
        owner_instructor_account_id: instructor.id,
        visibility: 'DRAFT',
        metadata: {
          courseId,
          minPassingScore: minPassingScore || 60,
        },
      })
      .select();

    if (createError) throw createError;

    return NextResponse.json(module[0], { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
