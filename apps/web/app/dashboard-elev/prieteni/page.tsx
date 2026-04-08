"use client";

import { useEffect, useMemo, useState } from "react";

type AccountItem = {
  id: string;
  publicId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  timezone: string | null;
  status: string;
  createdAt: string;
};

type RelationItem = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  other: AccountItem | null;
};

type ReportItem = {
  id: string;
  publicId: string;
  reason: string;
  details: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: AccountItem | null;
  reported: AccountItem | null;
};

type SearchResult =
  | {
      account: AccountItem;
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

type SearchRelationship =
  | { type: "self" }
  | { type: "none" }
  | { type: "friends" }
  | { type: "incoming_request"; requestId: string }
  | { type: "outgoing_request"; requestId: string }
  | { type: "blocked_by_you"; reason: string | null }
  | { type: "blocked_you"; reason: string | null };

type FriendsResponse = {
  profile: {
    id: string;
    publicId: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
  };
  summary: {
    friends: number;
    incomingRequests: number;
    outgoingRequests: number;
    blocked: number;
    reports: number;
  };
  friends: AccountItem[];
  incomingRequests: RelationItem[];
  outgoingRequests: RelationItem[];
  blocked: AccountItem[];
  reports: ReportItem[];
  searchResult: SearchResult;
  notices: string[];
};

type ReportDraft = {
  publicId: string;
  fullName: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function avatarFallback(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function relationLabel(value: SearchRelationship | undefined) {
  switch (value?.type) {
    case "self":
      return "Acesta este contul tău";
    case "friends":
      return "Sunteți deja prieteni";
    case "incoming_request":
      return "Ai o cerere primită";
    case "outgoing_request":
      return "Cerere trimisă deja";
    case "blocked_by_you":
      return "Blocat de tine";
    case "blocked_you":
      return "Te-a blocat";
    default:
      return "Nicio relație activă";
  }
}

export default function StudentDashboardFriendsPage() {
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [activeSearch, setActiveSearch] = useState<SearchResult>(null);
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [reportReason, setReportReason] = useState("Comportament abuziv");
  const [reportDetails, setReportDetails] = useState("");
  const [blockTarget, setBlockTarget] = useState<ReportDraft | null>(null);

  const refreshOverview = async (query?: string | null) => {
    const response = await fetch(`/api/dashboard/student/friends${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message || "Nu am putut încărca zona de prieteni.");
    }

    return (await response.json()) as FriendsResponse;
  };

  const loadOverview = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await refreshOverview();
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nu am putut încărca zona de prieteni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Prieteni", value: data?.summary.friends ?? 0 },
      { label: "Cereri primite", value: data?.summary.incomingRequests ?? 0 },
      { label: "Cereri trimise", value: data?.summary.outgoingRequests ?? 0 },
      { label: "Blocate", value: data?.summary.blocked ?? 0 },
    ],
    [data],
  );

  const submitSearch = async () => {
    const query = searchValue.trim();
    if (!query) {
      return;
    }

    setSearchLoading(true);
    setError(null);

    try {
      const payload = await refreshOverview(query);
      setData(payload);
      setActiveSearch(payload.searchResult);

      if (!payload.searchResult) {
        setMessage("Nu am găsit niciun cont cu acest ID.");
      } else {
        setMessage(null);
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Nu am putut căuta contul.");
    } finally {
      setSearchLoading(false);
    }
  };

  const performAction = async (action: "request" | "block" | "report", targetPublicId: string, reason?: string, details?: string) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/student/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          targetPublicId,
          reason,
          details,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Nu am putut completa acțiunea.");
      }

      let query: string | null = null;
      if (activeSearch?.account.publicId) {
        query = activeSearch.account.publicId;
      } else if (searchValue.trim()) {
        query = searchValue.trim();
      }
      const nextData = await refreshOverview(query);
      setData(nextData);
      setActiveSearch(nextData.searchResult);
      setMessage(action === "report" ? "Raportul a fost trimis către administratori." : "Acțiunea a fost salvată.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nu am putut completa acțiunea.");
    } finally {
      setSaving(false);
    }
  };

  const closeSearchModal = () => setActiveSearch(null);

  return (
    <section className="space-y-5 text-[#111827]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-1 py-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Community</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-[38px]">Prieteni</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#64748b]">
            Caută un cont după ID, trimite cereri, blochează sau raportează din popup-uri rapide.
          </p>
        </div>
        <div className="rounded-full border border-[#d5daea] bg-[#f8faff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">
          {loading ? "syncing" : "active"}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-[#fca5a5] bg-[#fff1f2] px-4 py-3 text-sm text-[#991b1b]">{error}</div>}
      {message && <div className="rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] px-4 py-3 text-sm text-[#075985]">{message}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">{item.label}</p>
            <div className="mt-2 text-[30px] font-bold leading-none text-[#0f172a]">{item.value}</div>
          </article>
        ))}
      </div>

      <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">Căutare cont</h2>
            <p className="mt-1 text-sm text-[#64748b]">ID-ul public este afișat pe profil și poate fi căutat direct aici.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d5daea] bg-[#f8faff] px-3 py-1 text-xs text-[#475569]">
            <span className="font-semibold">ID-ul tău:</span>
            <span>{data?.profile.publicId ?? "--"}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex h-12 flex-1 items-center rounded-2xl border border-[#d5daea] bg-[#f8fafc] px-4">
            <svg className="h-4 w-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
            </svg>
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void submitSearch();
                }
              }}
              placeholder="Caută după ID public, de exemplu DAT-1A2B3C4D"
              className="ml-3 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void submitSearch()}
            disabled={searchLoading}
            className="h-12 rounded-2xl bg-[#111827] px-5 text-sm font-semibold text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searchLoading ? "Caut..." : "Caută contul"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(data?.notices ?? []).map((notice) => (
            <div key={notice} className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-3 text-sm text-[#64748b]">
              {notice}
            </div>
          ))}
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Lista prieteni</h3>
            <span className="text-xs text-[#64748b]">{data?.friends.length ?? 0} conturi</span>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.friends ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Nu ai încă prieteni conectați.
              </div>
            ) : (
              data!.friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#dbeafe] text-sm font-bold text-[#1d4ed8]">
                      {avatarFallback(friend.fullName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">{friend.fullName}</p>
                      <p className="text-xs text-[#64748b]">{friend.publicId} • {friend.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#166534]">Friend</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Cereri și blocări</h3>
            <span className="text-xs text-[#64748b]">live</span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Cereri primite</p>
              <div className="mt-2 space-y-2">
                {(data?.incomingRequests ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-3 text-sm text-[#64748b]">Nicio cerere primită.</div>
                ) : (
                  data!.incomingRequests.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#0f172a]">{item.other?.fullName ?? "Unknown"}</p>
                          <p className="text-xs text-[#64748b]">{item.other?.publicId ?? "-"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchValue(item.other?.publicId ?? "");
                            setActiveSearch(item.other ? { account: item.other, relationship: { type: "incoming_request", requestId: item.id } } : null);
                          }}
                          className="rounded-xl border border-[#d5daea] px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-white"
                        >
                          Vezi
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Cereri trimise</p>
              <div className="mt-2 space-y-2">
                {(data?.outgoingRequests ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-3 text-sm text-[#64748b]">Nicio cerere trimisă.</div>
                ) : (
                  data!.outgoingRequests.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                      <p className="text-sm font-semibold text-[#0f172a]">{item.other?.fullName ?? "Unknown"}</p>
                      <p className="text-xs text-[#64748b]">{item.other?.publicId ?? "-"} • trimisă la {formatDate(item.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Conturi blocate</p>
              <div className="mt-2 space-y-2">
                {(data?.blocked ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-3 text-sm text-[#64748b]">Nu ai blocat niciun cont.</div>
                ) : (
                  data!.blocked.map((account) => (
                    <div key={account.id} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                      <p className="text-sm font-semibold text-[#0f172a]">{account.fullName}</p>
                      <p className="text-xs text-[#64748b]">{account.publicId}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#111827]">Raportări trimise de tine</h3>
          <span className="text-xs text-[#64748b]">{data?.reports.length ?? 0} rapoarte</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {(data?.reports ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
              Nu ai trimis raportări încă.
            </div>
          ) : (
            data!.reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0f172a]">{report.reason}</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#475569]">{report.status}</span>
                </div>
                <p className="mt-2 text-xs text-[#64748b]">
                  {report.reporter?.publicId ?? "-"} → {report.reported?.publicId ?? "-"}
                </p>
                <p className="mt-2 text-xs leading-6 text-[#475569]">{report.details || "Fără detalii suplimentare."}</p>
              </div>
            ))
          )}
        </div>
      </article>

      {activeSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] bg-gradient-to-r from-[#f8fafc] to-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Profile popup</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f172a]">{activeSearch.account.fullName}</h2>
                <p className="mt-1 text-sm text-[#64748b]">{activeSearch.account.publicId} • {activeSearch.account.email}</p>
              </div>
              <button
                type="button"
                onClick={closeSearchModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] text-[#64748b] transition hover:bg-[#f8fafc]"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4 px-6 py-6">
                <div className="flex items-center gap-4 rounded-3xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[#dbeafe] text-xl font-bold text-[#1d4ed8]">
                    {avatarFallback(activeSearch.account.fullName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{activeSearch.account.status}</p>
                    <p className="text-xs text-[#64748b]">Timezone: {activeSearch.account.timezone || "-"}</p>
                    <p className="text-xs text-[#64748b]">Creat la {formatDate(activeSearch.account.createdAt)}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#e5e7eb] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Relație curentă</p>
                  <p className="mt-2 text-sm text-[#334155]">{relationLabel(activeSearch.relationship)}</p>
                </div>

                <div className="rounded-3xl border border-[#e5e7eb] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Email</p>
                  <p className="mt-2 text-sm text-[#0f172a]">{activeSearch.account.email}</p>
                </div>
              </div>

              <div className="border-t border-[#e5e7eb] bg-[#f8fafc] px-6 py-6 lg:border-l lg:border-t-0">
                <div className="space-y-3">
                  {activeSearch.relationship.type === "self" ? (
                    <div className="rounded-3xl border border-dashed border-[#d5daea] bg-white p-4 text-sm text-[#64748b]">
                      Acesta este propriul tău cont.
                    </div>
                  ) : activeSearch.relationship.type === "blocked_you" ? (
                    <div className="rounded-3xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">
                      Acest cont te-a blocat deja.
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={saving || activeSearch.relationship.type === "friends" || activeSearch.relationship.type === "outgoing_request" || activeSearch.relationship.type === "blocked_by_you"}
                        onClick={() => void performAction("request", activeSearch.account.publicId)}
                        className="w-full rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {activeSearch.relationship.type === "incoming_request" ? "Acceptă cererea" : "Adaugă prieten"}
                      </button>
                      <button
                        type="button"
                        disabled={saving || activeSearch.relationship.type === "blocked_by_you"}
                        onClick={() => setBlockTarget({ publicId: activeSearch.account.publicId, fullName: activeSearch.account.fullName })}
                        className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Blochează contul
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportDraft({ publicId: activeSearch.account.publicId, fullName: activeSearch.account.fullName })}
                        className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
                      >
                        Raportează contul
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-4 rounded-3xl border border-dashed border-[#d5daea] bg-white p-4 text-xs text-[#64748b]">
                  După fiecare acțiune, contul este refăcut din backend și popup-ul își schimbă starea.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Report popup</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">Raportează {reportDraft.fullName}</h3>
            <p className="mt-1 text-sm text-[#64748b]">Raportul ajunge în zona de admin pentru revizuire separată.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Motiv</label>
                <input
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#1a73e8]"
                  placeholder="Motivul raportării"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Detalii</label>
                <textarea
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#1a73e8]"
                  placeholder="Descrie pe scurt ce s-a întâmplat"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportDraft(null)}
                className="rounded-2xl border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                Renunță
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void performAction("report", reportDraft.publicId, reportReason, reportDetails)}
                className="rounded-2xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trimite raportul
              </button>
            </div>
          </div>
        </div>
      )}

      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Block popup</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">Blochezi {blockTarget.fullName}?</h3>
            <p className="mt-1 text-sm text-[#64748b]">Contul va fi mutat în lista de blocări și cererile existente vor fi oprite.</p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                className="rounded-2xl border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void performAction("block", blockTarget.publicId)}
                className="rounded-2xl bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmă blocarea
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}