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

    const [{ data: enrollments }, { data: grades }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('user_id,status')
        .eq('course_id', courseId)
        .in('status', ['ACTIVE', 'ENROLLED']),
      supabase
        .from('course_grades')
        .select('*')
        .eq('course_id', courseId),
    ]);

    const studentIds = Array.from(new Set((enrollments ?? []).map((item) => item.user_id).filter(Boolean)));
    const { data: students } = studentIds.length > 0
      ? await supabase
          .from('users')
          .select('id,full_name,email')
          .in('id', studentIds)
      : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> };

    const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
    const gradeMap = new Map((grades ?? []).map((grade) => [grade.student_id, grade]));

    const rows = studentIds.map((studentId) => {
      const student = studentMap.get(studentId);
      const grade = gradeMap.get(studentId);
      return {
        studentId,
        studentName: student?.full_name ?? 'Student',
        studentEmail: student?.email ?? '-',
        gradeId: grade?.id ?? null,
        gradePercentage: grade?.grade_percentage ?? null,
        gradeLetter: grade?.grade_letter ?? null,
        finalScore: grade?.final_score ?? null,
        feedback: grade?.feedback ?? null,
        updatedAt: grade?.updated_at ?? null,
      };
    });

    return NextResponse.json(rows);
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

    const { studentId, gradePercentage, gradeLetter, finalScore, feedback } = body as {
      studentId: string;
      gradePercentage?: number;
      gradeLetter?: string;
      finalScore?: number;
      feedback?: string;
    };

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const payload = {
      course_id: courseId,
      student_id: studentId,
      grade_percentage: Number.isFinite(gradePercentage) ? gradePercentage : null,
      grade_letter: gradeLetter?.trim() ? gradeLetter.trim() : null,
      final_score: Number.isFinite(finalScore) ? finalScore : null,
      feedback: feedback ?? null,
      graded_at: new Date().toISOString(),
      calculated_at: new Date().toISOString(),
      metadata: {
        gradedByInstructorAccountId: auth.instructorId,
      },
    };

    const { data, error } = await supabase
      .from('course_grades')
      .upsert(payload, {
        onConflict: 'course_id,student_id',
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
