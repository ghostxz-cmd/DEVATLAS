import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentSessionCookieName, verifyStudentSessionToken } from "@/lib/student-session";

type StudentAccountRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string | null;
  status: string;
  created_at: string;
};

type SocialStudent = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string | null;
  status: string;
  createdAt: string;
  publicId: string;
};

type FriendRequestRow = {
  id: string;
  requester_student_account_id: string;
  addressee_student_account_id: string;
  status: "pending" | "accepted" | "rejected" | "canceled" | "blocked";
  message: string | null;
  responded_at: string | null;
  accepted_at: string | null;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
};

type FriendBlockRow = {
  id: string;
  blocker_student_account_id: string;
  blocked_student_account_id: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

type FriendReportRow = {
  id: string;
  public_id: string;
  reporter_student_account_id: string;
  reported_student_account_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type FriendRelation = {
  id: string;
  status: FriendRequestRow["status"];
  message: string | null;
  createdAt: string;
  updatedAt: string;
  other: SocialStudent | null;
};

type SearchResult =
  | {
      account: SocialStudent;
      relationship:
        | { type: "self" }
        | { type: "none" }
        | { type: "friends" }
        | { type: "incoming_request"; requestId: string }
        | { type: "outgoing_request"; requestId: string }
        | { type: "blocked_by_you"; reason: string | null }
        | { type: "blocked_you"; reason: string | null };
    }
  | null;

const actionSchema = z.object({
  action: z.enum(["request", "block", "report"]),
  targetPublicId: z.string().trim().min(4).max(64),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});

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

function normalizeStudentAccount(account: StudentAccountRow): SocialStudent {
  return {
    id: account.id,
    email: account.email,
    fullName: account.full_name,
    avatarUrl: account.avatar_url,
    timezone: account.timezone,
    status: account.status,
    createdAt: account.created_at,
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
    const error = new Error(await response.text()) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response;
}

async function postRows(supabaseUrl: string, path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = new Error(await response.text()) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response;
}

async function fetchStudentAccounts(supabaseUrl: string) {
  return fetchRows<StudentAccountRow>(
    supabaseUrl,
    "student_accounts?select=id,email,full_name,avatar_url,timezone,status,created_at&status=eq.ACTIVE&order=created_at.desc&limit=2000",
  ).catch(() => [] as StudentAccountRow[]);
}

async function fetchStudentAccountById(supabaseUrl: string, studentId: string) {
  const rows = await fetchRows<StudentAccountRow>(
    supabaseUrl,
    `student_accounts?select=id,email,full_name,avatar_url,timezone,status,created_at&id=eq.${encodeURIComponent(studentId)}&limit=1`,
  ).catch(() => [] as StudentAccountRow[]);

  return rows[0] ?? null;
}

function findStudentBySearchTerm(students: SocialStudent[], searchTerm: string) {
  const needle = searchTerm.trim().toLowerCase();
  if (!needle) {
    return null;
  }

  return students.find((student) => {
    return (
      student.publicId.toLowerCase().includes(needle) ||
      student.id.toLowerCase().includes(needle) ||
      student.email.toLowerCase().includes(needle) ||
      student.fullName.toLowerCase().includes(needle)
    );
  }) ?? null;
}

function buildPairQuery(firstId: string, secondId: string) {
  return `or=(and(requester_student_account_id.eq.${encodeURIComponent(firstId)},addressee_student_account_id.eq.${encodeURIComponent(secondId)}),and(requester_student_account_id.eq.${encodeURIComponent(secondId)},addressee_student_account_id.eq.${encodeURIComponent(firstId)}))`;
}

function buildBlockQuery(firstId: string, secondId: string) {
  return `or=(and(blocker_student_account_id.eq.${encodeURIComponent(firstId)},blocked_student_account_id.eq.${encodeURIComponent(secondId)}),and(blocker_student_account_id.eq.${encodeURIComponent(secondId)},blocked_student_account_id.eq.${encodeURIComponent(firstId)}))`;
}

function buildSearchResult(
  searchTerm: string | null,
  currentStudent: SocialStudent,
  allStudents: SocialStudent[],
  allFriendRows: FriendRequestRow[],
  allBlockRows: FriendBlockRow[],
): SearchResult {
  if (!searchTerm) {
    return null;
  }

  const account = findStudentBySearchTerm(allStudents, searchTerm);
  if (!account) {
    return null;
  }

  if (account.id === currentStudent.id) {
    return { account, relationship: { type: "self" } };
  }

  const pairRows = allFriendRows.filter((row) =>
    (row.requester_student_account_id === currentStudent.id && row.addressee_student_account_id === account.id) ||
    (row.requester_student_account_id === account.id && row.addressee_student_account_id === currentStudent.id)
  );

  const blockRows = allBlockRows.filter((row) =>
    (row.blocker_student_account_id === currentStudent.id && row.blocked_student_account_id === account.id) ||
    (row.blocker_student_account_id === account.id && row.blocked_student_account_id === currentStudent.id)
  );

  const outgoing = pairRows.find((row) => row.status === "pending" && row.requester_student_account_id === currentStudent.id);
  const incoming = pairRows.find((row) => row.status === "pending" && row.addressee_student_account_id === currentStudent.id);
  const accepted = pairRows.find((row) => row.status === "accepted");
  const blockByYou = blockRows.find((row) => row.blocker_student_account_id === currentStudent.id);
  const blockedYou = blockRows.find((row) => row.blocked_student_account_id === currentStudent.id);

  let relationship:
    | { type: "none" }
    | { type: "friends" }
    | { type: "incoming_request"; requestId: string }
    | { type: "outgoing_request"; requestId: string }
    | { type: "blocked_by_you"; reason: string | null }
    | { type: "blocked_you"; reason: string | null } = { type: "none" };

  if (blockByYou) {
    relationship = { type: "blocked_by_you", reason: blockByYou.reason };
  } else if (blockedYou) {
    relationship = { type: "blocked_you", reason: blockedYou.reason };
  } else if (accepted) {
    relationship = { type: "friends" };
  } else if (incoming) {
    relationship = { type: "incoming_request", requestId: incoming.id };
  } else if (outgoing) {
    relationship = { type: "outgoing_request", requestId: outgoing.id };
  }

  return { account, relationship };
}

async function buildOverview(supabaseUrl: string, currentStudent: SocialStudent, searchTerm: string | null) {
  const allStudents = (await fetchStudentAccounts(supabaseUrl)).map(normalizeStudentAccount);

  const reports = await fetchRows<FriendReportRow>(
    supabaseUrl,
    `friend_reports?select=id,public_id,reporter_student_account_id,reported_student_account_id,reason,details,status,admin_notes,created_at,updated_at&or=(reporter_student_account_id.eq.${encodeURIComponent(currentStudent.id)},reported_student_account_id.eq.${encodeURIComponent(currentStudent.id)})&order=created_at.desc&limit=50`,
  ).catch(() => [] as FriendReportRow[]);

  const allFriendRows = await fetchRows<FriendRequestRow>(
    supabaseUrl,
    `friend_requests?select=id,requester_student_account_id,addressee_student_account_id,status,message,responded_at,accepted_at,blocked_at,created_at,updated_at&or=(requester_student_account_id.eq.${encodeURIComponent(currentStudent.id)},addressee_student_account_id.eq.${encodeURIComponent(currentStudent.id)})&order=created_at.desc&limit=200`,
  ).catch(() => [] as FriendRequestRow[]);

  const allBlockRows = await fetchRows<FriendBlockRow>(
    supabaseUrl,
    `friend_blocks?select=id,blocker_student_account_id,blocked_student_account_id,reason,created_at,updated_at&or=(blocker_student_account_id.eq.${encodeURIComponent(currentStudent.id)},blocked_student_account_id.eq.${encodeURIComponent(currentStudent.id)})&order=created_at.desc&limit=200`,
  ).catch(() => [] as FriendBlockRow[]);

  const acceptedFriendIds = new Set<string>();
  const incomingIds = new Set<string>();
  const outgoingIds = new Set<string>();
  const blockedIds = new Set<string>();

  for (const row of allFriendRows) {
    if (row.status === "accepted") {
      acceptedFriendIds.add(row.requester_student_account_id === currentStudent.id ? row.addressee_student_account_id : row.requester_student_account_id);
    }

    if (row.status === "pending") {
      if (row.requester_student_account_id === currentStudent.id) {
        outgoingIds.add(row.addressee_student_account_id);
      } else if (row.addressee_student_account_id === currentStudent.id) {
        incomingIds.add(row.requester_student_account_id);
      }
    }

    if (row.status === "blocked") {
      blockedIds.add(row.requester_student_account_id === currentStudent.id ? row.addressee_student_account_id : row.requester_student_account_id);
    }
  }

  for (const row of allBlockRows) {
    if (row.blocker_student_account_id === currentStudent.id) {
      blockedIds.add(row.blocked_student_account_id);
    }
  }

  const relatedIds = new Set<string>([
    ...acceptedFriendIds,
    ...incomingIds,
    ...outgoingIds,
    ...blockedIds,
    ...reports.flatMap((report) => [report.reported_student_account_id, report.reporter_student_account_id]),
  ]);

  const relatedAccounts = [...relatedIds]
    .map((id) => allStudents.find((student) => student.id === id) ?? null)
    .filter(Boolean) as SocialStudent[];

  const accountMap = new Map(relatedAccounts.map((account) => [account.id, account]));

  const mapRelation = (row: FriendRequestRow): FriendRelation => {
    const otherId = row.requester_student_account_id === currentStudent.id ? row.addressee_student_account_id : row.requester_student_account_id;
    return {
      id: row.id,
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      other: accountMap.get(otherId) ?? null,
    };
  };

  const searchResult = buildSearchResult(searchTerm, currentStudent, allStudents, allFriendRows, allBlockRows);

  return {
    profile: {
      id: currentStudent.id,
      publicId: currentStudent.publicId,
      fullName: currentStudent.fullName,
      email: currentStudent.email,
      avatarUrl: currentStudent.avatarUrl,
      timezone: currentStudent.timezone,
    },
    summary: {
      friends: acceptedFriendIds.size,
      incomingRequests: incomingIds.size,
      outgoingRequests: outgoingIds.size,
      blocked: blockedIds.size,
      reports: reports.length,
    },
    friends: [...acceptedFriendIds].map((id) => accountMap.get(id)).filter(Boolean),
    incomingRequests: allFriendRows.filter((row) => row.status === "pending" && row.addressee_student_account_id === currentStudent.id).map(mapRelation),
    outgoingRequests: allFriendRows.filter((row) => row.status === "pending" && row.requester_student_account_id === currentStudent.id).map(mapRelation),
    blocked: [...blockedIds].map((id) => accountMap.get(id)).filter(Boolean),
    reports: reports.map((report) => ({
      id: report.id,
      publicId: report.public_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      adminNotes: report.admin_notes,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      reporter: accountMap.get(report.reporter_student_account_id) ?? null,
      reported: accountMap.get(report.reported_student_account_id) ?? null,
    })),
    searchResult,
    notices: [
      "ID-ul de cont este generat din UUID-ul elevului și poate fi căutat direct aici.",
      "Blocările opresc cererile și apar în lista separată.",
      "Raportările merg în zona de admin pentru revizuire.",
    ],
  };
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const cookieStore = await cookies();
    const token = cookieStore.get(getStudentSessionCookieName())?.value;
    const session = verifyStudentSessionToken(token);

    if (!session) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const studentRow = await fetchStudentAccountById(supabaseUrl, session.studentId);
    if (!studentRow || studentRow.status !== "ACTIVE") {
      return NextResponse.json({ message: "Student account not found." }, { status: 404 });
    }

    const currentStudent = normalizeStudentAccount(studentRow);
    const url = new URL(request.url);
    const q = url.searchParams.get("q");

    const payload = await buildOverview(supabaseUrl, currentStudent, q);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected friends API error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const cookieStore = await cookies();
    const token = cookieStore.get(getStudentSessionCookieName())?.value;
    const session = verifyStudentSessionToken(token);

    if (!session) {
      return NextResponse.json({ message: "Missing valid student session." }, { status: 401 });
    }

    const studentRow = await fetchStudentAccountById(supabaseUrl, session.studentId);
    if (!studentRow || studentRow.status !== "ACTIVE") {
      return NextResponse.json({ message: "Student account not found." }, { status: 404 });
    }

    const currentStudent = normalizeStudentAccount(studentRow);
    const body = actionSchema.parse(await request.json());
    const allStudents = (await fetchStudentAccounts(supabaseUrl)).map(normalizeStudentAccount);
    const targetAccount = findStudentBySearchTerm(allStudents, body.targetPublicId);

    if (!targetAccount) {
      return NextResponse.json({ message: "Contul căutat nu există." }, { status: 404 });
    }

    if (targetAccount.id === currentStudent.id) {
      return NextResponse.json({ message: "Nu poți acționa asupra propriului cont." }, { status: 400 });
    }

    if (body.action === "report") {
      const reportResponse = await postRows(supabaseUrl, "friend_reports", {
        reporter_student_account_id: currentStudent.id,
        reported_student_account_id: targetAccount.id,
        reason: body.reason?.trim() || "Raport social",
        details: body.details?.trim() || null,
      });

      const report = (await reportResponse.json()) as FriendReportRow[];
      return NextResponse.json({ ok: true, report: report[0] ?? null });
    }

    const pairRows = await fetchRows<FriendRequestRow>(
      supabaseUrl,
      `friend_requests?select=id,requester_student_account_id,addressee_student_account_id,status,message,responded_at,accepted_at,blocked_at,created_at,updated_at&${buildPairQuery(currentStudent.id, targetAccount.id)}&limit=10`,
    ).catch(() => [] as FriendRequestRow[]);

    const blockRows = await fetchRows<FriendBlockRow>(
      supabaseUrl,
      `friend_blocks?select=id,blocker_student_account_id,blocked_student_account_id,reason,created_at,updated_at&${buildBlockQuery(currentStudent.id, targetAccount.id)}&limit=10`,
    ).catch(() => [] as FriendBlockRow[]);

    const blockedByYou = blockRows.find((row) => row.blocker_student_account_id === currentStudent.id);
    const blockedYou = blockRows.find((row) => row.blocked_student_account_id === currentStudent.id);

    if (blockedByYou || blockedYou) {
      return NextResponse.json({
        message: blockedByYou ? "Ai blocat deja acest cont." : "Acest cont te-a blocat deja.",
        relationship: blockedByYou ? "blocked_by_you" : "blocked_you",
      }, { status: 409 });
    }

    const accepted = pairRows.find((row) => row.status === "accepted");
    if (accepted) {
      return NextResponse.json({ ok: true, relationship: "friends" });
    }

    const incoming = pairRows.find((row) => row.status === "pending" && row.requester_student_account_id === targetAccount.id && row.addressee_student_account_id === currentStudent.id);
    const outgoing = pairRows.find((row) => row.status === "pending" && row.requester_student_account_id === currentStudent.id && row.addressee_student_account_id === targetAccount.id);

    if (body.action === "request") {
      if (incoming) {
        await patchRows(supabaseUrl, `friend_requests?id=eq.${encodeURIComponent(incoming.id)}`, {
          status: "accepted",
          accepted_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
        });

        return NextResponse.json({ ok: true, relationship: "friends" });
      }

      if (outgoing) {
        return NextResponse.json({ ok: true, relationship: "outgoing_request" });
      }

      const insertResponse = await postRows(supabaseUrl, "friend_requests", {
        requester_student_account_id: currentStudent.id,
        addressee_student_account_id: targetAccount.id,
        status: "pending",
        message: null,
      });

      const created = (await insertResponse.json()) as FriendRequestRow[];
      return NextResponse.json({ ok: true, relationship: "outgoing_request", request: created[0] ?? null });
    }

    if (body.action === "block") {
      await postRows(supabaseUrl, "friend_blocks", {
        blocker_student_account_id: currentStudent.id,
        blocked_student_account_id: targetAccount.id,
        reason: body.reason?.trim() || null,
      }).catch(async (error) => {
        if (error instanceof Error && (error as Error & { status?: number }).status === 409) {
          return null;
        }
        throw error;
      });

      if (pairRows.length > 0) {
        await patchRows(supabaseUrl, `friend_requests?${buildPairQuery(currentStudent.id, targetAccount.id)}`, {
          status: "blocked",
          blocked_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ ok: true, relationship: "blocked_by_you" });
    }

    return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message || "Invalid payload." }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected friends action error." },
      { status: 500 },
    );
  }
}
