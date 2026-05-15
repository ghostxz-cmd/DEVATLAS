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

async function resolveStudentId(supabase: ReturnType<typeof createClient>, request: NextRequest) {
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

  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_auth_id', sessionData.user.id)
    .single();

  if (!userRow) {
    return { error: NextResponse.json({ error: 'Student record not found' }, { status: 403 }) };
  }

  return { studentId: userRow.id };
}

export async function GET(request: NextRequest, context: { params: Promise<{ courseId: string; taskId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const taskId = rawParams.taskId ?? rawParams.taskid ?? '';

    const auth = await resolveInstructorId(supabase, request);
    if (auth.error) return auth.error;

    const { data, error } = await supabase
      .from('task_submissions')
      .select('*, users:users(id,full_name,email),graded_by:instructor_accounts(id,full_name)')
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Create signed urls for attachments for instructor
    const withUrls = [] as any[];
    for (const row of (data ?? []) as any[]) {
      const attachments = Array.isArray(row.attachments) ? row.attachments : [];
      const signed = [] as any[];
      for (const att of attachments) {
        try {
          const { data: signedData, error: signErr } = await supabase.storage.from(att.bucket ?? 'course-assets').createSignedUrl(att.path, 60 * 60 * 24 * 7);
          if (signErr) {
            signed.push({ ...att, signedUrl: null });
          } else {
            signed.push({ ...att, signedUrl: signedData.signedUrl });
          }
        } catch {
          signed.push({ ...att, signedUrl: null });
        }
      }

      withUrls.push({ ...row, attachments: signed });
    }

    return NextResponse.json(withUrls ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ courseId: string; taskId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const taskId = rawParams.taskId ?? rawParams.taskid ?? '';
    const body = await request.json();

    const auth = await resolveStudentId(supabase, request);
    if (auth.error) return auth.error;

    const { studentId } = auth as { studentId: string };
    const { file_path, file_name, file_size, mime_type, submission_text } = body as any;

    if (!file_path && !submission_text) {
      return NextResponse.json({ error: 'file_path or submission_text is required' }, { status: 400 });
    }

    const attachments = file_path
      ? [
          {
            bucket: 'course-assets',
            path: file_path,
            file_name: file_name ?? null,
            file_size: file_size ?? null,
            mime_type: mime_type ?? null,
          },
        ]
      : [];

    // Enforce server-side file size limit (10GB)
    const maxBytes = 10 * 1024 * 1024 * 1024;
    if (file_size && Number(file_size) > maxBytes) {
      return NextResponse.json({ error: 'Fișierul depășește limita de 10GB' }, { status: 400 });
    }

    const payload = {
      task_id: taskId,
      student_id: studentId,
      submission_text: submission_text ?? null,
      attachments,
      status: 'SUBMITTED',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    const { data, error } = await supabase.from('task_submissions').insert(payload).select().single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ courseId: string; taskId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const taskId = rawParams.taskId ?? rawParams.taskid ?? '';
    const body = await request.json();

    const auth = await resolveInstructorId(supabase, request);
    if (auth.error) return auth.error;

    const { instructorId } = auth as { instructorId: string };
    const { submissionId, score, feedback } = body as any;

    if (!submissionId) return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });

    const updates: any = {
      graded_at: new Date().toISOString(),
      graded_by_instructor_account_id: instructorId,
      updated_at: new Date().toISOString(),
    };
    if (typeof score === 'number') updates.score = score;
    if (typeof feedback === 'string') updates.feedback = feedback;
    updates.status = 'GRADED';

    const { data, error } = await supabase.from('task_submissions').update(updates).eq('id', submissionId).select().single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
