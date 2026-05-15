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
  context: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';
    const moduleId = rawParams.moduleId ?? rawParams.moduleid ?? '';

    // Get module by ID
    const { data: module, error } = await supabase
      .from('course_groups')
      .select('*')
      .eq('id', moduleId)
      .eq('kind', 'MODULE')
      .single();

    if (error || !module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json(module);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';
    const moduleId = rawParams.moduleId ?? rawParams.moduleid ?? '';
    const body = await request.json();

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

    // Verify ownership
    const { data: module } = await supabase
      .from('course_groups')
      .select('owner_instructor_account_id')
      .eq('id', moduleId)
      .single();

    if (module?.owner_instructor_account_id !== instructor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update module
    const { data: updated, error: updateError } = await supabase
      .from('course_groups')
      .update(body)
      .eq('id', moduleId)
      .select();

    if (updateError) throw updateError;

    return NextResponse.json(updated[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';
    const moduleId = rawParams.moduleId ?? rawParams.moduleid ?? '';

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

    // Verify ownership
    const { data: module } = await supabase
      .from('course_groups')
      .select('owner_instructor_account_id')
      .eq('id', moduleId)
      .single();

    if (module?.owner_instructor_account_id !== instructor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete module
    const { error: deleteError } = await supabase
      .from('course_groups')
      .delete()
      .eq('id', moduleId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
