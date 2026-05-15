import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getEnv(name: string, ...fallbacks: Array<string | undefined>) {
  const value = [process.env[name], ...fallbacks].find((item) => Boolean(item));
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function getOptionalEnv(name: string, ...fallbacks: Array<string | undefined>) {
  return [process.env[name], ...fallbacks].find((item) => Boolean(item));
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

async function resolveInstructor(supabase: ReturnType<typeof createClient>, request: NextRequest) {
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
    .select('id,full_name')
    .eq('auth_user_id', sessionData.user.id)
    .eq('status', 'ACTIVE')
    .single();

  if (!instructor) {
    return { error: NextResponse.json({ error: 'Not an instructor' }, { status: 403 }) };
  }

  return { instructor };
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ro-RO', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

async function sendEventEmail(input: {
  to: string;
  studentName: string;
  courseTitle: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  meetingLink?: string | null;
}) {
  const apiKey = getOptionalEnv('RESEND_API_KEY');
  if (!apiKey) {
    return;
  }

  const from = process.env.EMAIL_FROM ?? 'notifications@devatlas.website';
  const subject = `Eveniment nou la curs: ${input.eventTitle}`;

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;background:#050816;color:#e6edf5;padding:20px;">
      <div style="max-width:620px;margin:0 auto;border:1px solid #1f2a4d;border-radius:14px;background:#0b1024;padding:20px;">
        <h2 style="margin-top:0;color:#22d3ee;">Eveniment nou adaugat</h2>
        <p>Salut ${input.studentName || 'student'},</p>
        <p>Profesorul a adaugat un eveniment nou pentru cursul <strong>${input.courseTitle}</strong>.</p>
        <ul>
          <li><strong>Titlu:</strong> ${input.eventTitle}</li>
          <li><strong>Tip:</strong> ${input.eventType}</li>
          <li><strong>Incepe:</strong> ${formatDateTime(input.startTime)}</li>
          <li><strong>Se termina:</strong> ${formatDateTime(input.endTime)}</li>
          ${input.location ? `<li><strong>Locatie:</strong> ${input.location}</li>` : ''}
          ${input.meetingLink ? `<li><strong>Link online:</strong> <a style="color:#22d3ee;" href="${input.meetingLink}">${input.meetingLink}</a></li>` : ''}
        </ul>
      </div>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      html,
    }),
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const supabase = createAdminClient();
    const rawParams = (await context.params) as Record<string, string | undefined>;
    const courseId = rawParams.courseId ?? rawParams.courseid ?? '';
    const moduleId = request.nextUrl.searchParams.get('moduleId');

    let query = supabase
      .from('course_calendar_events')
      .select('*')
      .eq('course_id', courseId)
      .order('start_time', { ascending: true });

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

    const auth = await resolveInstructor(supabase, request);
    if (auth.error) {
      return auth.error;
    }

    const {
      title,
      description,
      eventType,
      startTime,
      endTime,
      location,
      isOnline,
      meetingLink,
      moduleId,
    } = body as {
      title: string;
      description?: string;
      eventType: string;
      startTime: string;
      endTime: string;
      location?: string;
      isOnline?: boolean;
      meetingLink?: string;
      moduleId?: string;
    };

    if (!title?.trim() || !eventType || !startTime || !endTime) {
      return NextResponse.json({ error: 'Title, event type, start and end are required.' }, { status: 400 });
    }

    const { data: event, error } = await supabase
      .from('course_calendar_events')
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description ?? null,
        event_type: eventType,
        start_time: startTime,
        end_time: endTime,
        location: location ?? null,
        is_online: Boolean(isOnline),
        meeting_link: meetingLink ?? null,
        created_by_instructor_account_id: auth.instructor.id,
        instructor_account_id: auth.instructor.id,
        metadata: moduleId ? { moduleId } : {},
      })
      .select()
      .single();

    if (error) throw error;

    const [{ data: course }, { data: enrollments }] = await Promise.all([
      supabase.from('courses').select('title').eq('id', courseId).maybeSingle(),
      supabase
        .from('enrollments')
        .select('user_id,status')
        .eq('course_id', courseId)
        .in('status', ['ACTIVE', 'ENROLLED']),
    ]);

    const studentIds = Array.from(new Set((enrollments ?? []).map((item) => item.user_id).filter(Boolean)));
    if (studentIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id,full_name,email')
        .in('id', studentIds);

      const emailJobs = (users ?? [])
        .filter((user) => Boolean(user.email))
        .map((user) =>
          sendEventEmail({
            to: String(user.email),
            studentName: String(user.full_name ?? 'student'),
            courseTitle: String(course?.title ?? 'Curs DevAtlas'),
            eventTitle: String(event.title),
            eventType: String(event.event_type),
            startTime: String(event.start_time),
            endTime: String(event.end_time),
            location: event.location,
            meetingLink: event.meeting_link,
          }),
        );

      await Promise.allSettled(emailJobs);
    }

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
