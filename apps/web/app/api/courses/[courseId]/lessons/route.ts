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
    const moduleId = request.nextUrl.searchParams.get('moduleId');

    // Get all lessons for a course
    let query = supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (moduleId) {
      query = query.contains('metadata', { moduleId });
    }

    const { data: lessons, error } = await query;

    if (error) throw error;

    return NextResponse.json(lessons);
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

    const {
      title,
      description,
      lessonType,
      content,
      contentHtml,
      estimatedDurationMinutes,
      moduleId,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const normalizedLessonType = typeof lessonType === 'string' && lessonType.trim()
      ? lessonType.trim().toUpperCase()
      : 'MATERIAL';
    const allowedLessonTypes = new Set(['MATERIAL', 'VIDEO', 'INTERACTIVE', 'READING']);

    if (!allowedLessonTypes.has(normalizedLessonType)) {
      return NextResponse.json({ error: 'Invalid lesson type' }, { status: 400 });
    }

    // Verify instructor is authenticated
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

    // Create lesson
    const { data: lesson, error: createError } = await supabase
      .from('course_lessons')
      .insert({
        course_id: courseId,
        title: title.trim(),
        description,
        lesson_type: normalizedLessonType,
        content,
        content_html: contentHtml ?? null,
        estimated_duration_minutes: estimatedDurationMinutes,
        created_by_instructor_account_id: instructor.id,
        published_at: new Date().toISOString(),
        order_index: 0,
        metadata: moduleId ? { moduleId } : {},
      })
      .select();

    if (createError) throw createError;

    return NextResponse.json(lesson[0], { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
