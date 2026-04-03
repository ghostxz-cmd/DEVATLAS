import { NextResponse } from "next/server";

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

export async function GET(_request: Request, { params }: { params: Promise<{ instructorId: string }> }) {
  try {
    const { instructorId } = await params;
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const response = await fetch(
      `${supabaseUrl}/rest/v1/instructor_activity_logs?select=*&instructor_account_id=eq.${encodeURIComponent(instructorId)}&order=created_at.desc&limit=300`,
      {
        headers: getSupabaseHeaders(),
      },
    );

    if (!response.ok) {
      return NextResponse.json({ message: await response.text() }, { status: 502 });
    }

    const items = await response.json();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected instructor activity error." },
      { status: 500 },
    );
  }
}