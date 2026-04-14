"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const QRCode = require("qrcode") as {
  toDataURL: (text: string, options?: Record<string, unknown>) => Promise<string>;
};

type AccountSettings = {
  profile: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    role: string;
  };
  preferences: {
    theme: string;
    language: string;
    accentColor: string;
    density: string;
    reducedMotion: boolean;
    highContrast: boolean;
    emailNotifications: boolean;
    weeklyDigest: boolean;
    securityAlerts: boolean;
    productUpdates: boolean;
    profileVisibility: string;
    learningMode: string;
    autoSave: boolean;
    compactNavigation: boolean;
    showHints: boolean;
    sessionTimeoutMinutes: number;
    dashboardCards: string;
    smartSummaries: boolean;
    focusMode: boolean;
  };
};

type SecuritySettings = {
  profile: {
    studentId: string;
    email: string;
    fullName: string;
  };
  security: {
    pinEnabled: boolean;
    pinLockedUntil: string | null;
    pinFailedAttempts: number;
    pinLastVerifiedAt: string | null;
    totpEnabled: boolean;
    totpConfirmedAt: string | null;
    totpLastUsedAt: string | null;
    totpPending: boolean;
    requirePinForSensitiveChanges: boolean;
    backupCodesRemaining: number;
    hasBackupCodes: boolean;
    lastUnlockAt: string | null;
  };
};

type TotpSetupPayload = {
  secret: string;
  issuer: string;
  otpauthUrl: string;
};

type Preferences = AccountSettings["preferences"];

const preferenceDefaults: Preferences = {
  theme: "dark",
  language: "ro",
  accentColor: "cyan",
  density: "comfortable",
  reducedMotion: false,
  highContrast: false,
  emailNotifications: true,
  weeklyDigest: true,
  securityAlerts: true,
  productUpdates: false,
  profileVisibility: "private",
  learningMode: "balanced",
  autoSave: true,
  compactNavigation: false,
  showHints: true,
  sessionTimeoutMinutes: 60,
  dashboardCards: "all",
  smartSummaries: true,
  focusMode: false,
};

const accentOptions = ["cyan", "emerald", "amber", "rose", "violet"] as const;
const densityOptions = [
  { value: "comfortable", label: "Comfortabil" },
  { value: "compact", label: "Compact" },
  { value: "spacious", label: "Spațios" },
] as const;
const visibilityOptions = [
  { value: "private", label: "Privat" },
  { value: "public", label: "Public" },
] as const;
const learningModeOptions = [
  { value: "balanced", label: "Echilibrat" },
  { value: "focused", label: "Focus maxim" },
  { value: "accelerated", label: "Accelerat" },
] as const;
const dashboardCardOptions = [
  { value: "all", label: "Toate cardurile" },
  { value: "compact", label: "Carduri compacte" },
] as const;

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-[#f1f5f9]">
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-gray-300">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 rounded-full border transition ${checked ? "border-cyan-400/40 bg-cyan-400/25" : "border-white/10 bg-[#030712]"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#030712] shadow transition ${checked ? "left-5" : "left-0.5"}`} />
      </button>
    </label>
  );
}

type SecurityModal = "totp-setup" | "pin-set" | "pin-verify" | "pin-disable" | "pin-reset" | "totp-manage" | "totp-disable" | null;
type AccountModal = "profile" | null;
type SettingsModal = "appearance" | "notifications" | "privacy" | "productivity" | null;
type SecurityGateAction = Exclude<SecurityModal, "pin-verify" | null>;

const SECURITY_UNLOCK_TTL_MS = 5 * 60 * 1000;

function booleanLabel(value: boolean) {
  return value ? "Activ" : "Inactiv";
}

function statusColor(value: boolean) {
  return value ? "bg-[#22c55e]" : "bg-[#94a3b8]";
}

async function apiFetch(input: string, init: RequestInit = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const headers = new Headers(init.headers ?? undefined);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export default function StudentDashboardAccountPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [data, setData] = useState<AccountSettings | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [activeAccountModal, setActiveAccountModal] = useState<AccountModal>(null);
  const [activeSettingsModal, setActiveSettingsModal] = useState<SettingsModal>(null);
  const [profileDraftFullName, setProfileDraftFullName] = useState("");
  const [profileDraftTimezone, setProfileDraftTimezone] = useState("");
  const [profileDraftAvatarFile, setProfileDraftAvatarFile] = useState<File | null>(null);
  const [profileDraftAvatarPreview, setProfileDraftAvatarPreview] = useState<string | null>(null);
  const [totpSetup, setTotpSetup] = useState<TotpSetupPayload | null>(null);
  const [totpQrCodeUrl, setTotpQrCodeUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpPin, setTotpPin] = useState("");
  const [totpDisablePin, setTotpDisablePin] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinCurrentValue, setPinCurrentValue] = useState("");
  const [pinVerifyValue, setPinVerifyValue] = useState("");
  const [pinResetCode, setPinResetCode] = useState("");
  const [pinResetNewPin, setPinResetNewPin] = useState("");
  const [pinResetRequested, setPinResetRequested] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [activeModal, setActiveModal] = useState<SecurityModal>(null);
  const [pendingSecurityAction, setPendingSecurityAction] = useState<SecurityGateAction | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsResponse, securityResponse] = await Promise.all([
          apiFetch("/api/account/settings", { cache: "no-store" }),
          apiFetch("/api/account/security", { cache: "no-store" }),
        ]);

        if (!settingsResponse.ok) {
          const payload = (await settingsResponse.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca setările contului.");
        }

        if (!securityResponse.ok) {
          const payload = (await securityResponse.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca securitatea contului.");
        }

        setData((await settingsResponse.json()) as AccountSettings);
        setSecurity((await securityResponse.json()) as SecuritySettings);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca setările contului.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    setProfileDraftFullName(data.profile.fullName);
    setProfileDraftTimezone(data.profile.timezone ?? "");
    setProfileDraftAvatarPreview(data.profile.avatarUrl);
  }, [data]);

  const profileInitial = useMemo(() => (data?.profile.fullName.trim().charAt(0) || "E").toUpperCase(), [data]);
  const settings: AccountSettings = data ?? {
    profile: {
      fullName: "",
      email: "",
      avatarUrl: null,
      timezone: null,
      role: "STUDENT",
    },
    preferences: preferenceDefaults,
  };
  const inputClass = "w-full rounded-2xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400";
  const securityUnlockExpiresAt = useMemo(() => {
    const lastUnlockAt = security?.security.lastUnlockAt;
    if (!lastUnlockAt) {
      return 0;
    }

    const unlockTime = new Date(lastUnlockAt).getTime();
    if (Number.isNaN(unlockTime)) {
      return 0;
    }

    return unlockTime + SECURITY_UNLOCK_TTL_MS;
  }, [security?.security.lastUnlockAt]);
  const hasRecentSecurityUnlock = securityUnlockExpiresAt > Date.now();
  const shouldGateSecurityAction = Boolean(security?.security.pinEnabled && security?.security.requirePinForSensitiveChanges && !hasRecentSecurityUnlock);

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        preferences: {
          ...current.preferences,
          [key]: value,
        },
      };
    });
  };

  useEffect(() => {
    let active = true;

    const buildQrCode = async () => {
      if (!totpSetup?.otpauthUrl) {
        setTotpQrCodeUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(totpSetup.otpauthUrl, {
          margin: 1,
          width: 240,
          errorCorrectionLevel: "M",
          color: {
            dark: "#111827",
            light: "#ffffff",
          },
        });

        if (active) {
          setTotpQrCodeUrl(dataUrl);
        }
      } catch {
        if (active) {
          setTotpQrCodeUrl(null);
        }
      }
    };

    void buildQrCode();

    return () => {
      active = false;
    };
  }, [totpSetup]);

  useEffect(() => {
    return () => {
      if (profileDraftAvatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(profileDraftAvatarPreview);
      }
    };
  }, [profileDraftAvatarPreview]);

  const refreshSecurity = async () => {
    const response = await apiFetch("/api/account/security", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message || "Nu am putut reîncărca securitatea contului.");
    }

    setSecurity((await response.json()) as SecuritySettings);
  };

  const refreshAccountSettings = async () => {
    const response = await apiFetch("/api/account/settings", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message || "Nu am putut reîncărca setările contului.");
    }

    setData((await response.json()) as AccountSettings);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSecurityError(null);
    setSecurityMessage(null);

    try {
      const response = await apiFetch("/api/account/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: settings.profile.fullName.trim(),
          avatarUrl: settings.profile.avatarUrl?.trim() ? settings.profile.avatarUrl.trim() : null,
          timezone: settings.profile.timezone?.trim() ? settings.profile.timezone.trim() : null,
          preferences: settings.preferences,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut salva setările.");
      }

      await refreshAccountSettings();
      setSecurityMessage("Setările au fost salvate și sincronizate.");
      setActiveSettingsModal(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nu am putut salva setările.");
    } finally {
      setIsSaving(false);
    }
  };

  const runSecurityAction = async (action: () => Promise<void>) => {
    setSecurityError(null);
    setSecurityMessage(null);
    setSecurityLoading(true);

    try {
      await action();
    } catch (actionError) {
      setSecurityError(actionError instanceof Error ? actionError.message : "A apărut o eroare.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const closeSecurityModal = () => {
    setActiveModal(null);
    setPendingSecurityAction(null);
    setSecurityError(null);
    setSecurityMessage(null);
    setTotpSetup(null);
    setTotpQrCodeUrl(null);
    setTotpCode("");
    setTotpPin("");
    setTotpDisablePin("");
    setPinValue("");
    setPinCurrentValue("");
    setPinVerifyValue("");
    setPinResetCode("");
    setPinResetNewPin("");
    setPinResetRequested(false);
  };

  const openProfileModal = () => {
    setSecurityError(null);
    setSecurityMessage(null);
    setActiveAccountModal("profile");
    setProfileDraftFullName(data?.profile.fullName ?? "");
    setProfileDraftTimezone(data?.profile.timezone ?? "");
    setProfileDraftAvatarFile(null);
    setProfileDraftAvatarPreview(data?.profile.avatarUrl ?? null);
  };

  const openSettingsModal = (modal: Exclude<SettingsModal, null>) => {
    setSecurityError(null);
    setSecurityMessage(null);
    setActiveSettingsModal(modal);
  };

  const openProtectedSecurityAction = (action: SecurityGateAction) => {
    setSecurityError(null);
    setSecurityMessage(null);

    if (!shouldGateSecurityAction) {
      setActiveModal(action);
      return;
    }

    setPendingSecurityAction(action);
    openPinModal("pin-verify");
  };

  const finishSecurityUnlock = () => {
    const nextAction = pendingSecurityAction;
    setPendingSecurityAction(null);

    if (nextAction) {
      setActiveModal(nextAction);
      return;
    }

    closeSecurityModal();
  };

  const closeSettingsModal = () => {
    setActiveSettingsModal(null);
  };

  const handleProfileAvatarChange = (file: File | null) => {
    if (profileDraftAvatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(profileDraftAvatarPreview);
    }

    setProfileDraftAvatarFile(file);
    if (!file) {
      setProfileDraftAvatarPreview(data?.profile.avatarUrl ?? null);
      return;
    }

    setProfileDraftAvatarPreview(URL.createObjectURL(file));
  };

  const closeProfileModal = () => {
    setActiveAccountModal(null);
    setProfileDraftAvatarFile(null);
    setProfileDraftFullName(data?.profile.fullName ?? "");
    setProfileDraftTimezone(data?.profile.timezone ?? "");
    setProfileDraftAvatarPreview(data?.profile.avatarUrl ?? null);
  };

  const saveProfileChanges = async () => {
    if (!profileDraftFullName.trim()) {
      setSecurityError("Numele nu poate fi gol.");
      return;
    }

    await runSecurityAction(async () => {
      let uploadedAvatarUrl = data?.profile.avatarUrl ?? null;

      if (profileDraftAvatarFile) {
        const formData = new FormData();
        formData.append("file", profileDraftAvatarFile);

        const avatarResponse = await apiFetch("/api/account/avatar", {
          method: "POST",
          body: formData,
        });

        const avatarPayload = (await avatarResponse.json().catch(() => null)) as { message?: string; avatarUrl?: string } | null;
        if (!avatarResponse.ok) {
          throw new Error(avatarPayload?.message || "Nu am putut încărca avatarul.");
        }

        uploadedAvatarUrl = avatarPayload?.avatarUrl ?? uploadedAvatarUrl;
      }

      const response = await apiFetch("/api/account/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profileDraftFullName,
          avatarUrl: uploadedAvatarUrl,
          timezone: profileDraftTimezone || null,
          preferences: data?.preferences,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut salva profilul.");
      }

      await refreshAccountSettings();
      setSecurityMessage("Profilul a fost actualizat.");
      setActiveAccountModal(null);
    });
  };

  const configureTotp = async () => {
    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: totpPin || undefined }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string; totp?: TotpSetupPayload } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut porni configurarea 2FA.");
      }

      setTotpSetup(payload?.totp ?? null);
      setSecurityMessage("2FA a fost pornită. Scanează secretul din aplicația Authenticator și confirmă codul.");
    });
  };

  const confirmTotp = async () => {
    if (!totpCode.trim()) {
      setSecurityError("Introdu codul din aplicația Authenticator.");
      return;
    }

    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/totp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string; backupCodes?: string[] } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut confirma 2FA.");
      }

      setBackupCodes(payload?.backupCodes ?? []);
      setTotpSetup(null);
      setTotpCode("");
      await refreshSecurity();
      setSecurityMessage("2FA este activă. Salvează codurile de rezervă afișate mai jos.");
    });
  };

  const setPin = async () => {
    if (!pinValue.trim()) {
      setSecurityError("Introdu PIN-ul nou.");
      return;
    }

    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue, currentPin: pinCurrentValue || undefined }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut salva PIN-ul.");
      }

      setPinValue("");
      setPinCurrentValue("");
      await refreshSecurity();
      setSecurityMessage("PIN-ul a fost salvat și deblocarea pentru schimbări sensibile este activă.");
    });
  };

  const verifyPin = async () => {
    if (!pinVerifyValue.trim()) {
      setSecurityError("Introdu PIN-ul pentru verificare.");
      return;
    }

    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinVerifyValue }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut verifica PIN-ul.");
      }

      setPinVerifyValue("");
      await refreshSecurity();
      setSecurityMessage("PIN-ul a fost verificat. Acum poți face schimbări sensibile.");
      finishSecurityUnlock();
    });
  };

  const disablePin = async () => {
    if (!pinCurrentValue.trim()) {
      setSecurityError("Introdu PIN-ul curent pentru dezactivare.");
      return;
    }

    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/pin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: pinCurrentValue }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut dezactiva PIN-ul.");
      }

      setPinCurrentValue("");
      setPinValue("");
      await refreshSecurity();
      setSecurityMessage("PIN-ul a fost dezactivat.");
    });
  };

  const disableTotp = async () => {
    if (security?.security.pinEnabled && !totpDisablePin.trim()) {
      setSecurityError("Introdu PIN-ul pentru dezactivarea 2FA.");
      return;
    }

    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/totp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: totpDisablePin || undefined }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut dezactiva 2FA.");
      }

      setTotpDisablePin("");
      setBackupCodes([]);
      await refreshSecurity();
      setSecurityMessage("2FA a fost dezactivată.");
      setActiveModal(null);
    });
  };

  const openTotpSetup = () => {
    setSecurityError(null);
    setSecurityMessage(null);
    setTotpSetup(null);
    setTotpQrCodeUrl(null);
    setTotpCode("");
    setTotpPin("");
    setTotpDisablePin("");
    setActiveModal("totp-setup");
  };

  const openPinModal = (mode: Exclude<SecurityModal, "totp-setup" | "totp-manage" | null>) => {
    setSecurityError(null);
    setSecurityMessage(null);
    setPinValue("");
    setPinCurrentValue("");
    setPinVerifyValue("");
    setPinResetCode("");
    setPinResetNewPin("");
    setPinResetRequested(false);
    setActiveModal(mode);
  };

  const openPinResetModal = () => {
    setSecurityError(null);
    setSecurityMessage(null);
    setPinResetCode("");
    setPinResetNewPin("");
    setPinResetRequested(false);
    setActiveModal("pin-reset");
  };

  const requestPinResetCode = async () => {
    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/pin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut trimite codul PIN.");
      }

      setPinResetRequested(true);
      setSecurityMessage(`Am trimis codul de resetare la ${data?.profile.email ?? "emailul tău"}.`);
    });
  };

  const confirmPinReset = async () => {
    if (!pinResetCode.trim()) {
      setSecurityError("Introdu codul primit pe email.");
      return;
    }

    if (!pinResetNewPin.trim()) {
      setSecurityError("Introdu noul PIN.");
      return;
    }

    await runSecurityAction(async () => {
      const response = await apiFetch("/api/account/security/pin/reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pinResetCode, newPin: pinResetNewPin }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Nu am putut reseta PIN-ul.");
      }

      setPinResetCode("");
      setPinResetNewPin("");
      setPinResetRequested(false);
      await refreshSecurity();
      closeSecurityModal();
      setSecurityMessage("PIN-ul a fost resetat. Poți folosi noul PIN imediat.");
    });
  };

  if (error) {
    return (
      <section className="space-y-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-[#030712] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <h1 className="text-2xl font-bold tracking-tight">Contul meu</h1>
          <p className="mt-2 text-sm text-gray-300">Nu am putut încărca datele contului.</p>
          <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Contul meu</h1>
          <p className="mt-1 text-sm text-gray-300">Profil, securitate avansată, preferințe și protecție pentru modificările sensibile.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className={`h-2 w-2 rounded-full ${loading ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`} />
          {loading ? "syncing" : "active"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Profil</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={openProfileModal}
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-sm font-black text-white transition hover:scale-[1.02]"
            >
              {data?.profile.avatarUrl ? (
                <img src={data.profile.avatarUrl} alt="Avatar profil" className="h-full w-full object-cover" />
              ) : (
                <img src="/logos/Alb.png" alt="Logo DevAtlas" className="h-full w-full object-contain p-1.5" />
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{data?.profile.fullName ?? "Elev"}</p>
              <p className="truncate text-sm text-gray-300">{data?.profile.email ?? "-"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-gray-200">Rol: {data?.profile.role ?? "STUDENT"}</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-gray-200">Timezone: {data?.profile.timezone || "nesetat"}</div>
          </div>
          <button type="button" onClick={openProfileModal} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
            Editează profilul și avatarul
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Apariție</p>
          <div className="mt-2 text-[30px] font-bold leading-none capitalize">{data?.preferences.theme ?? "dark"}</div>
          <p className="mt-1 text-xs text-gray-300">Tema, accentul și densitatea interfeței.</p>
          <button type="button" onClick={() => openSettingsModal("appearance")} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
            Editează apariția
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Securitate</p>
          <div className="mt-2 text-[30px] font-bold leading-none">Protecție</div>
          <p className="mt-1 text-xs text-gray-300">PIN, 2FA și confirmări suplimentare pentru date sensibile.</p>
          <button type="button" onClick={() => openProtectedSecurityAction("totp-manage")} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
            Deschide securitatea
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Notificări</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{booleanLabel(data?.preferences.emailNotifications ?? false)}</div>
          <p className="mt-1 text-xs text-gray-300">Email, security alerts și digest.</p>
          <button type="button" onClick={() => openSettingsModal("notifications")} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
            Editează notificările
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Privacy</p>
          <div className="mt-2 text-[30px] font-bold leading-none capitalize">{data?.preferences.profileVisibility ?? "private"}</div>
          <p className="mt-1 text-xs text-gray-300">Vizibilitate profil și focus mode.</p>
          <button type="button" onClick={() => openSettingsModal("privacy")} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
            Editează privacy
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Productivitate</p>
          <div className="mt-2 text-[30px] font-bold leading-none capitalize">{data?.preferences.learningMode ?? "balanced"}</div>
          <p className="mt-1 text-xs text-gray-300">Mod de lucru, carduri și focus mode.</p>
          <button type="button" onClick={() => openSettingsModal("productivity")} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
            Editează productivitatea
          </button>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Setări avansate de cont</h3>
            <span className="text-xs text-gray-300">real settings</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              ["Tema", data?.preferences.theme ?? "dark"],
              ["Limbă", data?.preferences.language ?? "ro"],
              ["Accent", data?.preferences.accentColor ?? "cyan"],
              ["Densitate", data?.preferences.density ?? "comfortable"],
              ["Mod învățare", data?.preferences.learningMode ?? "balanced"],
              ["Ses. timeout", `${data?.preferences.sessionTimeoutMinutes ?? 60} min`],
              ["Dashboard cards", data?.preferences.dashboardCards ?? "all"],
              ["Smart summaries", booleanLabel(data?.preferences.smartSummaries ?? false)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-gray-300">{label}</p>
                <p className="mt-1 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/15 to-transparent p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Ce se salvează acum</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-200">
              <li>• nume, avatar și timezone</li>
              <li>• preferințe de interfață și notificări</li>
              <li>• opțiuni de accesibilitate și focus</li>
            </ul>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Securitate avansată</h3>
            <span className="text-xs text-gray-300">prepared</span>
          </div>

          <div className="mt-4 space-y-3">
            {(securityError || securityMessage) && (
              <div className={`rounded-2xl border p-4 text-sm ${securityError ? "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"}`}>
                {securityError ?? securityMessage}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">2FA cu Authenticator</p>
                  <p className="mt-1 text-xs text-gray-300">{security?.security.totpEnabled ? "2FA este activă." : "Pornește configurarea, apoi confirmă codul din aplicație."}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(Boolean(security?.security.totpEnabled))} bg-opacity-10 text-gray-200`}>
                  {security?.security.totpEnabled ? "Activ" : "Nu e activ"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {security?.security.totpEnabled ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openPinModal("pin-verify")}
                      className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm font-semibold text-white"
                    >
                      Vezi protecția PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => openProtectedSecurityAction("totp-manage")}
                      className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm font-semibold text-white"
                    >
                      Gestionează 2FA
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openProtectedSecurityAction("totp-setup")}
                    className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm font-semibold text-white"
                  >
                    Configurează 2FA
                    <span className="mt-1 block text-xs font-normal text-gray-300">QR + aplicația Authenticator</span>
                  </button>
                )}
              </div>

              {backupCodes.length > 0 && (
                <div className="mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#92400e]">Coduri backup</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {backupCodes.map((code) => (
                      <div key={code} className="rounded-2xl border border-[#fcd34d] bg-[#030712] px-3 py-2 font-mono text-sm text-white">{code}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">PIN de protecție</p>
                  <p className="mt-1 text-xs text-gray-300">{security?.security.pinEnabled ? "PIN-ul este activ și cerut la schimbări sensibile." : "Setează un PIN separat pentru protecția schimbărilor."}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(Boolean(security?.security.pinEnabled))} bg-opacity-10 text-gray-200`}>
                  {security?.security.pinEnabled ? "Activ" : "Nepus"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {security?.security.pinEnabled ? (
                  <>
                    <button type="button" onClick={() => openPinModal("pin-verify")} className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm font-semibold text-white">
                      Verifică PIN
                    </button>
                    <button type="button" onClick={() => openProtectedSecurityAction("pin-set")} className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm font-semibold text-white">
                      Schimbă PIN
                    </button>
                    <button type="button" onClick={openPinResetModal} className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-3 text-sm font-semibold text-[#1d4ed8]">
                      Am uitat PIN-ul
                    </button>
                    <button type="button" onClick={() => openProtectedSecurityAction("pin-disable")} className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-3 py-3 text-sm font-semibold text-[#991b1b]">
                      Dezactivează PIN
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => openProtectedSecurityAction("pin-set")} className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm font-semibold text-white">
                    Setează PIN
                    <span className="mt-1 block text-xs font-normal text-gray-300">4-6 cifre, separat de parola contului</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>

      {activeAccountModal === "profile" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#030712] shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">Contul meu</p>
                <h3 className="mt-1 text-xl font-bold text-white">Editează profilul</h3>
              </div>
              <button type="button" onClick={closeProfileModal} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-200">
                Închide
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="border-b border-white/10 bg-white/5 p-5 lg:border-b-0 lg:border-r">
                <div className="rounded-[24px] border border-white/10 bg-[#030712] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">Previzualizare</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-2xl font-black text-white">
                      {profileDraftAvatarPreview ? <img src={profileDraftAvatarPreview ?? undefined} alt="Avatar curent" className="h-full w-full object-cover" /> : <img src="/logos/Alb.png" alt="Logo DevAtlas" className="h-full w-full object-contain p-2" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{profileDraftFullName || data?.profile.fullName || "Elev"}</p>
                      <p className="text-sm text-gray-300">{data?.profile.email ?? "-"}</p>
                      <p className="mt-2 text-xs text-gray-300">Schimbările se salvează imediat în cont.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Nume și timezone</p>
                    <div className="mt-3 grid gap-3">
                      <input
                        value={profileDraftFullName}
                        onChange={(event) => setProfileDraftFullName(event.target.value)}
                        placeholder="Nume complet"
                        className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm outline-none focus:border-cyan-400"
                      />
                      <input
                        value={profileDraftTimezone}
                        onChange={(event) => setProfileDraftTimezone(event.target.value)}
                        placeholder="Timezone, de exemplu Europe/Bucharest"
                        className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Avatar</p>
                    <p className="mt-1 text-sm text-gray-300">Poți încărca o imagine nouă. Serverul o salvează și actualizează profilul.</p>
                    <div className="mt-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleProfileAvatarChange(event.target.files?.[0] ?? null)}
                        className="block w-full rounded-2xl border border-dashed border-white/20 bg-[#030712] px-3 py-3 text-sm text-gray-200 file:mr-4 file:rounded-xl file:border-0 file:bg-[#111827] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={saveProfileChanges} disabled={securityLoading} className="rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                      Salvează profilul
                    </button>
                    <button type="button" onClick={() => setActiveModal("pin-verify")} className="rounded-2xl border border-white/10 bg-[#030712] px-4 py-3 text-sm font-semibold text-white">
                      Deblochează cu PIN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#030712] shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">Setări cont</p>
                <h3 className="mt-1 text-xl font-bold text-white">
                  {activeSettingsModal === "appearance" && "Editează apariția"}
                  {activeSettingsModal === "notifications" && "Editează notificările"}
                  {activeSettingsModal === "privacy" && "Editează privacy"}
                  {activeSettingsModal === "productivity" && "Editează productivitatea"}
                </h3>
              </div>
              <button type="button" onClick={closeSettingsModal} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-200">
                Închide
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="border-b border-white/10 bg-white/5 p-5 lg:border-b-0 lg:border-r">
                <div className="rounded-[24px] border border-white/10 bg-[#030712] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">Rezumat</p>
                  <div className="mt-3 space-y-3 text-sm text-gray-200">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span>Tema</span>
                      <span className="font-semibold text-white capitalize">{data?.preferences.theme}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span>Limbă</span>
                      <span className="font-semibold text-white uppercase">{data?.preferences.language}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span>Focus</span>
                      <span className="font-semibold text-white">{booleanLabel(data?.preferences.focusMode ?? false)}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-300">Aici modifici doar secțiunea aleasă; salvarea folosește același endpoint al contului.</p>
                </div>
              </div>

              <div className="p-5">
                {activeSettingsModal === "appearance" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">Temă</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button type="button" onClick={() => updatePreference("theme", "dark")} className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold ${settings.preferences.theme === "dark" ? "border-cyan-400/50 bg-cyan-400/15" : "border-white/10 bg-[#030712]"}`}>
                          Întunecată
                        </button>
                        <button type="button" onClick={() => updatePreference("theme", "light")} className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold ${settings.preferences.theme === "light" ? "border-cyan-400/50 bg-cyan-400/15" : "border-white/10 bg-[#030712]"}`}>
                          Luminoasă
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Accent</span>
                        <select value={settings.preferences.accentColor} onChange={(event) => updatePreference("accentColor", event.target.value as Preferences["accentColor"])} className={inputClass}>
                          {accentOptions.map((accent) => <option key={accent} value={accent}>{accent}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Densitate</span>
                        <select value={settings.preferences.density} onChange={(event) => updatePreference("density", event.target.value as Preferences["density"])} className={inputClass}>
                          {densityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {activeSettingsModal === "notifications" && (
                  <div className="space-y-3">
                    <ToggleRow title="Notificări prin email" description="Primești alerte pentru activități importante ale contului." checked={settings.preferences.emailNotifications} onChange={(checked) => updatePreference("emailNotifications", checked)} />
                    <ToggleRow title="Digest săptămânal" description="Rezumatul săptămânal al activității și progresului." checked={settings.preferences.weeklyDigest} onChange={(checked) => updatePreference("weeklyDigest", checked)} />
                    <ToggleRow title="Alerte de securitate" description="Schimbări de parolă, sesiuni și acțiuni sensibile." checked={settings.preferences.securityAlerts} onChange={(checked) => updatePreference("securityAlerts", checked)} />
                    <ToggleRow title="Noutăți despre produs" description="Actualizări despre funcții noi și zone noi din platformă." checked={settings.preferences.productUpdates} onChange={(checked) => updatePreference("productUpdates", checked)} />
                  </div>
                )}

                {activeSettingsModal === "privacy" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Vizibilitate profil</span>
                        <select value={settings.preferences.profileVisibility} onChange={(event) => updatePreference("profileVisibility", event.target.value as Preferences["profileVisibility"])} className={inputClass}>
                          {visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Timeout sesiune</span>
                        <input type="number" min={5} max={240} value={settings.preferences.sessionTimeoutMinutes} onChange={(event) => updatePreference("sessionTimeoutMinutes", Number(event.target.value))} className={inputClass} />
                      </label>
                    </div>
                    <ToggleRow title="Auto-save" description="Salvează modificările pe măsură ce lucrezi în cont." checked={settings.preferences.autoSave} onChange={(checked) => updatePreference("autoSave", checked)} />
                    <ToggleRow title="Contrast ridicat" description="Mai multă claritate pentru texte, separatoare și butoane." checked={settings.preferences.highContrast} onChange={(checked) => updatePreference("highContrast", checked)} />
                    <ToggleRow title="Reducere mișcare" description="Animații mai line și mai puține efecte pentru confort vizual." checked={settings.preferences.reducedMotion} onChange={(checked) => updatePreference("reducedMotion", checked)} />
                  </div>
                )}

                {activeSettingsModal === "productivity" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Mod de lucru</span>
                        <select value={settings.preferences.learningMode} onChange={(event) => updatePreference("learningMode", event.target.value as Preferences["learningMode"])} className={inputClass}>
                          {learningModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">Carduri dashboard</span>
                        <select value={settings.preferences.dashboardCards} onChange={(event) => updatePreference("dashboardCards", event.target.value as Preferences["dashboardCards"])} className={inputClass}>
                          {dashboardCardOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <ToggleRow title="Prezentare inteligentă" description="Grupează recomandările și rezumatele într-un mod mai clar." checked={settings.preferences.smartSummaries} onChange={(checked) => updatePreference("smartSummaries", checked)} />
                    <ToggleRow title="Navigare compactă" description="Mai mult conținut pe ecran, spațiere redusă în navigație." checked={settings.preferences.compactNavigation} onChange={(checked) => updatePreference("compactNavigation", checked)} />
                    <ToggleRow title="Sugestii contextuale" description="Afișează indicii utile și explicații în platformă." checked={settings.preferences.showHints} onChange={(checked) => updatePreference("showHints", checked)} />
                    <ToggleRow title="Focus mode" description="Ascunde elementele care pot distrage atenția." checked={settings.preferences.focusMode} onChange={(checked) => updatePreference("focusMode", checked)} />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void saveSettings()} disabled={isSaving || isUploadingAvatar} className="rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? "Se salvează..." : "Salvează secțiunea"}
                  </button>
                  <button type="button" onClick={closeSettingsModal} className="rounded-2xl border border-white/10 bg-[#030712] px-4 py-3 text-sm font-semibold text-white">
                    Renunță
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#030712] shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">Securitate cont</p>
                <h3 className="mt-1 text-xl font-bold text-white">
                  {activeModal === "totp-setup" && "Configurare 2FA"}
                  {activeModal === "totp-manage" && "Gestionare 2FA"}
                  {activeModal === "pin-set" && (security?.security.pinEnabled ? "Schimbă PIN" : "Setează PIN")}
                  {activeModal === "pin-verify" && "Verifică PIN"}
                  {activeModal === "pin-disable" && "Dezactivează PIN"}
                  {activeModal === "pin-reset" && "Resetare PIN prin email"}
                  {activeModal === "totp-disable" && "Dezactivează 2FA"}
                </h3>
              </div>
              <button type="button" onClick={closeSecurityModal} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-200">
                Închide
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-white/10 bg-white/5 p-5 lg:border-b-0 lg:border-r">
                <div className="rounded-[24px] border border-white/10 bg-[#030712] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-300">Stare curentă</p>
                  <div className="mt-3 space-y-3 text-sm text-gray-200">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span>2FA</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${security?.security.totpEnabled ? "bg-[#dcfce7] text-[#166534]" : "bg-[#f1f5f9] text-gray-300"}`}>
                        {security?.security.totpEnabled ? "activă" : "inactivă"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span>PIN</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${security?.security.pinEnabled ? "bg-[#dcfce7] text-[#166534]" : "bg-[#f1f5f9] text-gray-300"}`}>
                        {security?.security.pinEnabled ? "activ" : "inactiv"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <span>Backup codes</span>
                      <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-[#1d4ed8]">{security?.security.backupCodesRemaining ?? 0} rămase</span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-cyan-500/10 p-4 text-xs text-gray-200">
                    Pentru Google Authenticator, scanează QR-ul din partea dreaptă. Secretul apare doar o singură dată.
                  </div>
                </div>
              </div>

              <div className="p-5">
                {activeModal === "totp-setup" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">Pasul 1: pornește setup-ul</p>
                      <p className="mt-1 text-sm text-gray-300">Dacă ai deja PIN, îl poți folosi aici. După asta primești QR-ul și codul de confirmare.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input value={totpPin} onChange={(event) => setTotpPin(event.target.value)} placeholder="PIN pentru pornire" className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm outline-none focus:border-cyan-400" />
                        <button type="button" onClick={configureTotp} disabled={securityLoading} className="rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                          Generează QR
                        </button>
                      </div>
                    </div>

                    {totpSetup && (
                      <div className="space-y-4 rounded-[24px] border border-[#bfdbfe] bg-[#030712] p-4">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3">
                            {totpQrCodeUrl ? (
                              <img src={totpQrCodeUrl ?? undefined} alt="QR code pentru configurarea 2FA" className="h-[220px] w-[220px] rounded-xl bg-[#030712]" />
                            ) : (
                              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-[#030712] text-center text-xs text-gray-300">
                                QR code-ul se generează după pornire.
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Secret TOTP</p>
                            <p className="break-all font-mono text-xs text-gray-200">{totpSetup?.secret ?? ""}</p>
                            <p className="pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">otpauth URI</p>
                            <p className="break-all font-mono text-[11px] text-gray-200">{totpSetup?.otpauthUrl ?? ""}</p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm font-semibold text-white">Pasul 2: confirmă codul</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input value={totpCode} onChange={(event) => setTotpCode(event.target.value)} placeholder="Codul de 6 cifre" className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm outline-none focus:border-cyan-400" />
                            <button type="button" onClick={confirmTotp} disabled={securityLoading} className="rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                              Confirmă și salvează
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeModal === "totp-manage" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">2FA este deja activă</p>
                      <p className="mt-1 text-sm text-gray-300">Aici poți regenera coduri de rezervă sau opri protecția 2FA.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => openProtectedSecurityAction("totp-setup")} className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm font-semibold text-white">
                          Reconfigurează QR
                        </button>
                        <button type="button" onClick={() => setActiveModal("totp-disable")} className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-3 py-3 text-sm font-semibold text-[#991b1b]">
                          Dezactivează 2FA
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#fde68a] bg-[#fffbeb] p-4">
                      <p className="text-sm font-semibold text-[#92400e]">Coduri backup</p>
                      <p className="mt-1 text-sm text-[#854d0e]">Ai {security?.security.backupCodesRemaining ?? 0} coduri rămase. După activare, codurile afișate aici pot fi folosite la login.</p>
                      {backupCodes.length > 0 ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {backupCodes.map((code) => (
                            <div key={code} className="rounded-2xl border border-[#fcd34d] bg-[#030712] px-3 py-2 font-mono text-sm text-white">{code}</div>
                          ))}
                        </div>
                      ) : (
                        <button type="button" onClick={() => openProtectedSecurityAction("totp-setup")} className="mt-3 rounded-2xl border border-[#fcd34d] bg-[#030712] px-3 py-3 text-sm font-semibold text-[#92400e]">
                          Regenerează backup codes
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeModal === "pin-set" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">Alege un PIN nou</p>
                      <p className="mt-1 text-sm text-gray-300">PIN-ul va fi cerut la schimbări sensibile și la deblocări rapide.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input value={pinValue} onChange={(event) => setPinValue(event.target.value)} placeholder="PIN nou" className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm outline-none focus:border-cyan-400" />
                        <input value={pinCurrentValue} onChange={(event) => setPinCurrentValue(event.target.value)} placeholder="PIN curent dacă schimbi" className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm outline-none focus:border-cyan-400" />
                      </div>
                      <button type="button" onClick={setPin} disabled={securityLoading} className="mt-3 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                        Salvează PIN-ul
                      </button>
                    </div>
                  </div>
                )}

                {activeModal === "pin-verify" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">Deblochează schimbările sensibile</p>
                      <p className="mt-1 text-sm text-gray-300">După verificare, backend-ul îți pune un unlock token temporar valabil 5 minute pentru acțiunile de securitate.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input value={pinVerifyValue} onChange={(event) => setPinVerifyValue(event.target.value)} placeholder="PIN curent" className="rounded-2xl border border-white/10 bg-[#030712] px-3 py-3 text-sm outline-none focus:border-cyan-400" />
                        <button type="button" onClick={verifyPin} disabled={securityLoading} className="rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                          Verifică
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === "pin-disable" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] p-4">
                      <p className="text-sm font-semibold text-[#991b1b]">Dezactivare PIN</p>
                      <p className="mt-1 text-sm text-[#7f1d1d]">Odată dezactivat, schimbările sensibile nu vor mai cere deblocarea PIN.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input value={pinCurrentValue} onChange={(event) => setPinCurrentValue(event.target.value)} placeholder="PIN curent" className="rounded-2xl border border-[#fca5a5] bg-[#030712] px-3 py-3 text-sm outline-none focus:border-[#fb7185]" />
                        <button type="button" onClick={disablePin} disabled={securityLoading} className="rounded-2xl bg-[#b91c1c] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                          Confirmă dezactivarea
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === "pin-reset" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-[#bfdbfe] bg-cyan-500/10 p-4">
                      <p className="text-sm font-semibold text-[#1d4ed8]">Forgot PIN</p>
                      <p className="mt-1 text-sm text-[#1e3a8a]">Trimitem automat un cod pe emailul contului. După confirmare poți seta un PIN nou fără PIN-ul vechi.</p>
                      {!pinResetRequested ? (
                        <button type="button" onClick={requestPinResetCode} disabled={securityLoading} className="mt-3 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                          Trimite codul pe email
                        </button>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <input
                            value={pinResetCode}
                            onChange={(event) => setPinResetCode(event.target.value)}
                            placeholder="Codul primit pe email"
                            className="w-full rounded-2xl border border-[#93c5fd] bg-[#030712] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
                          />
                          <input
                            value={pinResetNewPin}
                            onChange={(event) => setPinResetNewPin(event.target.value)}
                            placeholder="Noul PIN"
                            className="w-full rounded-2xl border border-[#93c5fd] bg-[#030712] px-3 py-3 text-sm outline-none focus:border-[#2563eb]"
                          />
                          <button type="button" onClick={confirmPinReset} disabled={securityLoading} className="rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                            Resetează PIN-ul
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeModal === "totp-disable" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] p-4">
                      <p className="text-sm font-semibold text-[#991b1b]">Dezactivare 2FA</p>
                      <p className="mt-1 text-sm text-[#7f1d1d]">După oprire, login-ul va reveni la parolă și la PIN, dacă PIN-ul este activ.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input
                          value={totpDisablePin}
                          onChange={(event) => setTotpDisablePin(event.target.value)}
                          placeholder={security?.security.pinEnabled ? "PIN curent" : "Nu este necesar"}
                          className="rounded-2xl border border-[#fca5a5] bg-[#030712] px-3 py-3 text-sm outline-none focus:border-[#fb7185]"
                        />
                        <button type="button" onClick={disableTotp} disabled={securityLoading} className="rounded-2xl bg-[#b91c1c] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                          Confirmă oprirea
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

