import { NextResponse } from "next/server";

type ReportRow = {
  id: string;
  public_id: string;
  reporter_student_account_id: string;
  reported_student_account_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by_admin_user_id: string | null;
  reviewed_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type StudentAccountRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
};

type SocialStudent = StudentAccountRow & {
  publicId: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseHeaders() {
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

function deriveStudentPublicId(studentId: string) {
  return `DAT-${studentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function normalizeStudent(account: StudentAccountRow): SocialStudent {
  return {
    ...account,
    publicId: deriveStudentPublicId(account.id),
  };
}

async function fetchRows<T>(supabaseUrl: string, path: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

async function patchRows(supabaseUrl: string, path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "PATCH",
    headers: getSupabaseHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response;
}

export async function GET() {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const reports = await fetchRows<ReportRow>(
      supabaseUrl,
      "friend_reports?select=id,public_id,reporter_student_account_id,reported_student_account_id,reason,details,status,admin_notes,reviewed_by_admin_user_id,reviewed_at,resolved_at,created_at,updated_at&order=created_at.desc&limit=300",
    );

    const accountIds = [...new Set(reports.flatMap((report) => [report.reporter_student_account_id, report.reported_student_account_id]))];
    const accounts = accountIds.length > 0
      ? await fetchRows<StudentAccountRow>(
          supabaseUrl,
          `student_accounts?select=id,email,full_name,avatar_url,status&id=in.(${accountIds.map((id) => encodeURIComponent(id)).join(",")})&limit=300`,
        ).catch(() => [] as StudentAccountRow[])
      : [];

    const accountMap = new Map(accounts.map((account) => [account.id, normalizeStudent(account)]));

    const items = reports.map((report) => ({
      id: report.id,
      publicId: report.public_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      adminNotes: report.admin_notes,
      reviewedAt: report.reviewed_at,
      resolvedAt: report.resolved_at,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      reporter: accountMap.get(report.reporter_student_account_id) ?? null,
      reported: accountMap.get(report.reported_student_account_id) ?? null,
    }));

    const counters = {
      total: items.length,
      open: items.filter((item) => item.status === "open").length,
      reviewing: items.filter((item) => item.status === "reviewing").length,
      resolved: items.filter((item) => item.status === "resolved").length,
      dismissed: items.filter((item) => item.status === "dismissed").length,
    };

    return NextResponse.json({ items, counters });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected admin report error." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const body = (await request.json()) as {
      reportId?: string;
      status?: string;
      adminNotes?: string;
      adminUserId?: string | null;
    };

    if (!body.reportId || !body.status) {
      return NextResponse.json({ message: "reportId and status are required." }, { status: 400 });
    }

    await patchRows(supabaseUrl, `friend_reports?id=eq.${encodeURIComponent(body.reportId)}`, {
      status: body.status,
      admin_notes: body.adminNotes ?? null,
      reviewed_by_admin_user_id: body.adminUserId ?? null,
      reviewed_at: new Date().toISOString(),
      resolved_at: body.status === "resolved" || body.status === "dismissed" ? new Date().toISOString() : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected admin report update error." },
      { status: 500 },
    );
  }
}
