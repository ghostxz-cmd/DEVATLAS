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

export async function GET(request: NextRequest, context: { params: Promise<{ courseId: string; quizId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const quizId = rawParams.quizId ?? rawParams.quizid ?? '';

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ courseId: string; quizId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const quizId = rawParams.quizId ?? rawParams.quizid ?? '';
    const body = await request.json();

    const auth = await resolveInstructorId(supabase, request);
    if (auth.error) return auth.error;

    const {
      question_type,
      question_text,
      options,
      correct_answer,
      points,
      order_index,
    } = body as {
      question_type: string;
      question_text: string;
      options?: unknown;
      correct_answer?: string | null;
      points?: number;
      order_index?: number;
    };

    if (!question_text?.trim()) {
      return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }

    const allowed = new Set(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'CODE', 'ESSAY']);
    const qtype = String(question_type ?? 'SHORT_ANSWER').toUpperCase();
    if (!allowed.has(qtype)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    const payload: any = {
      quiz_id: quizId,
      question_type: qtype,
      question_text: question_text.trim(),
      explanation: null,
      order_index: Number.isFinite(order_index) ? order_index : 0,
      points: Number.isFinite(points) ? points : 1,
      options: null,
      correct_answer: correct_answer ?? null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (Array.isArray(options) && options.length > 0) {
      payload.options = options;
    }

    const { data, error } = await supabase.from('quiz_questions').insert(payload).select().single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
