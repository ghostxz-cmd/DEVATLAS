type InstructorSecuritySettingsRow = {
  instructor_account_id: string;
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

type InstructorBackupCodeRow = {
  id: string;
  instructor_account_id: string;
  code_hash: string;
  used_at: string | null;
  created_at: string;
};

type StoredInstructorSecurity = InstructorSecuritySettingsRow & {
  backup_codes: InstructorBackupCodeRow[];
  events: Array<{
    id: string;
    event_type: string;
    metadata_json: Record<string, unknown>;
    created_at: string;
  }>;
};

type AccountPreferencesRow = {
  id: string;
  auth_user_id: string;
  role: string;
  preferences: Record<string, unknown> | null;
};

const defaults = (instructorAccountId: string): StoredInstructorSecurity => ({
  instructor_account_id: instructorAccountId,
  pin_hash: null,
  pin_enabled: false,
  pin_failed_attempts: 0,
  pin_locked_until: null,
  pin_last_verified_at: null,
  pin_reset_code_hash: null,
  pin_reset_expires_at: null,
  pin_reset_attempts: 0,
  pin_reset_requested_at: null,
  totp_secret: null,
  totp_pending_secret: null,
  totp_enabled: false,
  totp_confirmed_at: null,
  totp_last_used_at: null,
  totp_last_used_counter: null,
  require_pin_for_sensitive_changes: true,
  backup_codes_generated_at: null,
  last_unlock_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  backup_codes: [],
  events: [],
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

async function upsertPreferencesRow(
  supabaseUrl: string,
  payload: {
    auth_user_id: string;
    role: string;
    preferences: Record<string, unknown>;
  },
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/account_preferences?on_conflict=auth_user_id`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as AccountPreferencesRow[];
}

async function fetchPreferencesRow(supabaseUrl: string, authUserId: string) {
  const rows = await fetchJson<AccountPreferencesRow[]>(
    `${supabaseUrl}/rest/v1/account_preferences?select=id,auth_user_id,role,preferences&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`,
  );

  return rows[0] ?? null;
}

function normalizeInstructorSecurity(
  value: unknown,
  instructorAccountId: string,
): StoredInstructorSecurity {
  const base = defaults(instructorAccountId);
  const source =
    value && typeof value === "object" ? (value as Partial<StoredInstructorSecurity>) : {};

  return {
    ...base,
    ...source,
    instructor_account_id: instructorAccountId,
    backup_codes: Array.isArray(source.backup_codes) ? source.backup_codes : base.backup_codes,
    events: Array.isArray(source.events) ? source.events : base.events,
    updated_at: source.updated_at ?? base.updated_at,
    created_at: source.created_at ?? base.created_at,
  };
}

async function saveInstructorSecurity(
  supabaseUrl: string,
  authUserId: string,
  role: string,
  preferences: Record<string, unknown> | null | undefined,
  security: StoredInstructorSecurity,
) {
  const nextPreferences = {
    ...(preferences ?? {}),
    instructorSecurity: {
      ...security,
      updated_at: new Date().toISOString(),
    },
  };

  await upsertPreferencesRow(supabaseUrl, {
    auth_user_id: authUserId,
    role,
    preferences: nextPreferences,
  });
}

export async function fetchInstructorSecuritySettings(
  supabaseUrl: string,
  authUserId: string,
  instructorAccountId: string,
) {
  const row = await fetchPreferencesRow(supabaseUrl, authUserId);
  const rawSecurity = row?.preferences?.instructorSecurity;
  return normalizeInstructorSecurity(rawSecurity, instructorAccountId);
}

export async function ensureInstructorSecuritySettings(
  supabaseUrl: string,
  authUserId: string,
  instructorAccountId: string,
  role = "INSTRUCTOR",
) {
  const row = await fetchPreferencesRow(supabaseUrl, authUserId);
  const current = normalizeInstructorSecurity(row?.preferences?.instructorSecurity, instructorAccountId);

  if (!row || !row.preferences || !("instructorSecurity" in row.preferences)) {
    await saveInstructorSecurity(supabaseUrl, authUserId, role, row?.preferences, current);
  }

  return current;
}

export async function updateInstructorSecuritySettings(
  supabaseUrl: string,
  authUserId: string,
  instructorAccountId: string,
  payload: Record<string, unknown>,
  role = "INSTRUCTOR",
) {
  const row = await fetchPreferencesRow(supabaseUrl, authUserId);
  const current = normalizeInstructorSecurity(row?.preferences?.instructorSecurity, instructorAccountId);

  await saveInstructorSecurity(supabaseUrl, authUserId, role, row?.preferences, {
    ...current,
    ...payload,
    instructor_account_id: instructorAccountId,
  });
}

export async function replaceInstructorBackupCodes(
  supabaseUrl: string,
  authUserId: string,
  instructorAccountId: string,
  codeHashes: string[],
  role = "INSTRUCTOR",
) {
  const row = await fetchPreferencesRow(supabaseUrl, authUserId);
  const current = normalizeInstructorSecurity(row?.preferences?.instructorSecurity, instructorAccountId);

  const now = new Date().toISOString();
  const backupCodes = codeHashes.map((codeHash) => ({
    id: crypto.randomUUID(),
    instructor_account_id: instructorAccountId,
    code_hash: codeHash,
    used_at: null,
    created_at: now,
  }));

  await saveInstructorSecurity(supabaseUrl, authUserId, role, row?.preferences, {
    ...current,
    backup_codes: backupCodes,
    backup_codes_generated_at: codeHashes.length > 0 ? now : current.backup_codes_generated_at,
  });
}

export async function countUnusedInstructorBackupCodes(
  supabaseUrl: string,
  authUserId: string,
  instructorAccountId: string,
) {
  const security = await fetchInstructorSecuritySettings(supabaseUrl, authUserId, instructorAccountId);
  return security.backup_codes.filter((code) => !code.used_at).length;
}

export async function logInstructorSecurityEvent(
  supabaseUrl: string,
  authUserId: string,
  instructorAccountId: string,
  eventType: string,
  metadataJson: Record<string, unknown> = {},
  role = "INSTRUCTOR",
) {
  const row = await fetchPreferencesRow(supabaseUrl, authUserId);
  const current = normalizeInstructorSecurity(row?.preferences?.instructorSecurity, instructorAccountId);

  const events = [
    {
      id: crypto.randomUUID(),
      event_type: eventType,
      metadata_json: metadataJson,
      created_at: new Date().toISOString(),
    },
    ...current.events,
  ].slice(0, 50);

  await saveInstructorSecurity(supabaseUrl, authUserId, role, row?.preferences, {
    ...current,
    events,
  });
}

export type { InstructorSecuritySettingsRow, InstructorBackupCodeRow };
