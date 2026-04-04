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

function normalizeRole(role: string | undefined) {
  return (role ?? "STUDENT").trim().toUpperCase();
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "avatar";
}

async function getAuthedUser(request: Request) {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing authorization header.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      ...getSupabaseHeaders(),
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    id: string;
    email: string | null;
    user_metadata?: { role?: string };
  }>;
}

async function patchRows(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const authedUser = await getAuthedUser(request);
    const role = normalizeRole(authedUser.user_metadata?.role);
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ message: "Missing avatar file." }, { status: 400 });
    }

    if (!fileEntry.type.startsWith("image/")) {
      return NextResponse.json({ message: "Avatarul trebuie să fie o imagine." }, { status: 400 });
    }

    if (fileEntry.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "Imaginea trebuie să aibă sub 5MB." }, { status: 413 });
    }

    const safeName = safeFileName(fileEntry.name);
    const objectPath = `${authedUser.id}/${Date.now()}-${safeName}`;
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/account-avatars/${encodeURI(objectPath)}`, {
      method: "PUT",
      headers: {
        apikey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        Authorization: `Bearer ${getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": fileEntry.type,
        "x-upsert": "true",
      },
      body: Buffer.from(await fileEntry.arrayBuffer()),
    });

    if (!uploadResponse.ok) {
      throw new Error(await uploadResponse.text());
    }

    const avatarUrl = `${supabaseUrl}/storage/v1/object/public/account-avatars/${encodeURI(objectPath)}`;

    await patchRows(`${supabaseUrl}/rest/v1/account_preferences?auth_user_id=eq.${encodeURIComponent(authedUser.id)}`, {
      avatar_url: avatarUrl,
    });

    if (role === "STUDENT") {
      await patchRows(`${supabaseUrl}/rest/v1/student_accounts?auth_user_id=eq.${encodeURIComponent(authedUser.id)}`, {
        avatar_url: avatarUrl,
      });
    }

    if (role === "INSTRUCTOR") {
      await patchRows(`${supabaseUrl}/rest/v1/instructor_accounts?auth_user_id=eq.${encodeURIComponent(authedUser.id)}`, {
        avatar_url: avatarUrl,
      });
    }

    const authUpdateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authedUser.id}`, {
      method: "PUT",
      headers: {
        ...getSupabaseHeaders(),
      },
      body: JSON.stringify({
        user_metadata: {
          avatar_url: avatarUrl,
        },
      }),
    });

    if (!authUpdateResponse.ok) {
      throw new Error(await authUpdateResponse.text());
    }

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to upload avatar." },
      { status: 500 },
    );
  }
}
