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

async function resolveInstructorId(supabase: ReturnType<typeof createClient>, request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const authClient = createClient(getSupabaseUrl(), getAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: sessionData } = await authClient.auth.getUser();
  if (!sessionData.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: instructor } = await supabase
    .from('instructor_accounts')
    .select('id')
    .eq('auth_user_id', sessionData.user.id)
    .eq('status', 'ACTIVE')
    .single();

  if (!instructor) {
    return { error: NextResponse.json({ error: 'Not an instructor' }, { status: 403 }) };
  }

  return { instructorId: instructor.id };
}

export async function GET(request: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';
    const moduleId = request.nextUrl.searchParams.get('moduleId');

    let query = supabase
      .from('course_tasks')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (moduleId) {
      query = query.contains('metadata', { moduleId });
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';
    const body = await request.json();

    const auth = await resolveInstructorId(supabase, request);
    if (auth.error) {
      return auth.error;
    }

    const {
      title,
      description,
      instructions,
      dueDate,
      pointsPossible,
      moduleId,
    } = body as {
      title: string;
      description?: string;
      instructions?: string;
      dueDate?: string;
      pointsPossible?: number;
      moduleId?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('course_tasks')
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description ?? null,
        instructions: instructions ?? null,
        due_date: dueDate || null,
        points_possible: Number.isFinite(pointsPossible) ? pointsPossible : 100,
        status: 'PUBLISHED',
        created_by_instructor_account_id: auth.instructorId,
        metadata: moduleId ? { moduleId } : {},
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
