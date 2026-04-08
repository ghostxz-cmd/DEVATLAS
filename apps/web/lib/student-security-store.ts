type StudentSecuritySettingsRow = {
  student_account_id: string;
  pin_hash: string | null;
  pin_enabled: boolean;
  pin_failed_attempts: number;
  pin_locked_until: string | null;
  pin_last_verified_at: string | null;
  pin_reset_code_hash: string | null;
  pin_reset_expires_at: string | null;
  pin_reset_attempts: number;
  pin_reset_requested_at: string | null;
  totp_secret: string | null;
  totp_pending_secret: string | null;
  totp_enabled: boolean;
  totp_confirmed_at: string | null;
  totp_last_used_at: string | null;
  totp_last_used_counter: number | null;
  require_pin_for_sensitive_changes: boolean;
  backup_codes_generated_at: string | null;
  last_unlock_at: string | null;
  created_at: string;
  updated_at: string;
};

type BackupCodeRow = {
  id: string;
  student_account_id: string;
  code_hash: string;
  used_at: string | null;
  created_at: string;
};

type SecurityEventRow = {
  id: string;
  student_account_id: string;
  event_type: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
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

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...getSupabaseHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

async function patchNoReturn(url: string, payload: Record<string, unknown>) {
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

async function deleteNoReturn(url: string) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function fetchStudentSecuritySettings(supabaseUrl: string, studentAccountId: string) {
  const rows = await fetchJson<StudentSecuritySettingsRow[]>(
    `${supabaseUrl}/rest/v1/student_account_security_settings?select=*&student_account_id=eq.${encodeURIComponent(studentAccountId)}&limit=1`,
  );

  return rows[0] ?? null;
}

export async function ensureStudentSecuritySettings(supabaseUrl: string, studentAccountId: string) {
  const existing = await fetchStudentSecuritySettings(supabaseUrl, studentAccountId);
  if (existing) {
    return existing;
  }

  const rows = await fetchJson<StudentSecuritySettingsRow[]>(`${supabaseUrl}/rest/v1/student_account_security_settings`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      student_account_id: studentAccountId,
      pin_enabled: false,
      pin_failed_attempts: 0,
      totp_enabled: false,
      require_pin_for_sensitive_changes: true,
    }),
  });

  return rows[0] ?? null;
}

export async function updateStudentSecuritySettings(
  supabaseUrl: string,
  studentAccountId: string,
  payload: Record<string, unknown>,
) {
  await patchNoReturn(
    `${supabaseUrl}/rest/v1/student_account_security_settings?student_account_id=eq.${encodeURIComponent(studentAccountId)}`,
    payload,
  );
}

export async function replaceStudentBackupCodes(supabaseUrl: string, studentAccountId: string, codeHashes: string[]) {
  await deleteNoReturn(
    `${supabaseUrl}/rest/v1/student_security_backup_codes?student_account_id=eq.${encodeURIComponent(studentAccountId)}`,
  );

  if (codeHashes.length === 0) {
    return;
  }

  const rows = codeHashes.map((codeHash) => ({
    student_account_id: studentAccountId,
    code_hash: codeHash,
  }));

  const response = await fetch(`${supabaseUrl}/rest/v1/student_security_backup_codes`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function countUnusedBackupCodes(supabaseUrl: string, studentAccountId: string) {
  const rows = await fetchJson<BackupCodeRow[]>(
    `${supabaseUrl}/rest/v1/student_security_backup_codes?select=id&student_account_id=eq.${encodeURIComponent(studentAccountId)}&used_at=is.null`,
  );

  return rows.length;
}

export async function markBackupCodeUsed(supabaseUrl: string, studentAccountId: string, codeHash: string) {
  await patchNoReturn(
    `${supabaseUrl}/rest/v1/student_security_backup_codes?student_account_id=eq.${encodeURIComponent(studentAccountId)}&code_hash=eq.${encodeURIComponent(codeHash)}&used_at=is.null`,
    { used_at: new Date().toISOString() },
  );
}

export async function fetchUnusedBackupCodes(supabaseUrl: string, studentAccountId: string) {
  return fetchJson<BackupCodeRow[]>(
    `${supabaseUrl}/rest/v1/student_security_backup_codes?select=*&student_account_id=eq.${encodeURIComponent(studentAccountId)}&used_at=is.null&order=created_at.desc`,
  );
}

export async function logStudentSecurityEvent(
  supabaseUrl: string,
  studentAccountId: string,
  eventType: string,
  metadataJson: Record<string, unknown> = {},
) {
  await fetch(`${supabaseUrl}/rest/v1/student_security_events`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      student_account_id: studentAccountId,
      event_type: eventType,
      metadata_json: metadataJson,
    }),
  });
}

export type { StudentSecuritySettingsRow, BackupCodeRow, SecurityEventRow };
