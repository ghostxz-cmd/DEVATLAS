"use client";

import { useEffect, useMemo, useState } from "react";

type AccountItem = {
  id: string;
  public_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
};

type ReportItem = {
  id: string;
  publicId: string;
  reason: string;
  details: string | null;
  status: string;
  adminNotes: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: AccountItem | null;
  reported: AccountItem | null;
};

type ReportsResponse = {
  items: ReportItem[];
  counters: {
    total: number;
    open: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
  };
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

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return "bg-[#f59e0b]/15 text-[#9a5b00]";
    case "reviewing":
      return "bg-[#3b82f6]/15 text-[#1d4ed8]";
    case "resolved":
      return "bg-[#22c55e]/15 text-[#166534]";
    case "dismissed":
      return "bg-[#94a3b8]/15 text-[#475569]";
    default:
      return "bg-[#e5e7eb] text-[#475569]";
  }
}

export default function AdminSocialReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/friend-reports", { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Nu am putut încărca rapoartele sociale.");
        }

        const payload = (await response.json()) as ReportsResponse;
        const nextItems = payload.items ?? [];
        setItems(nextItems);

        if (!selectedReportId && nextItems.length > 0) {
          setSelectedReportId(nextItems[0].id);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "A apărut o eroare.");
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [selectedReportId]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((item) => {
      const statusOk = !statusFilter || item.status === statusFilter;
      if (!statusOk) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        item.publicId,
        item.reason,
        item.details ?? "",
        item.reporter?.full_name ?? "",
        item.reporter?.public_id ?? "",
        item.reported?.full_name ?? "",
        item.reported?.public_id ?? "",
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [items, search, statusFilter]);

  const selectedReport = filteredItems.find((item) => item.id === selectedReportId) ?? items.find((item) => item.id === selectedReportId) ?? null;

  useEffect(() => {
    setAdminNotes(selectedReport?.adminNotes ?? "");
  }, [selectedReport?.id, selectedReport?.adminNotes]);

  const counters = useMemo(() => {
    return {
      total: items.length,
      open: items.filter((item) => item.status === "open").length,
      reviewing: items.filter((item) => item.status === "reviewing").length,
      resolved: items.filter((item) => item.status === "resolved").length,
      dismissed: items.filter((item) => item.status === "dismissed").length,
    };
  }, [items]);

  const updateReport = async (nextStatus: string) => {
    if (!selectedReport) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/friend-reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status: nextStatus,
          adminNotes,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Nu am putut actualiza raportul.");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === selectedReport.id
            ? {
                ...item,
                status: nextStatus,
                adminNotes,
                reviewedAt: new Date().toISOString(),
                resolvedAt: nextStatus === "resolved" || nextStatus === "dismissed" ? new Date().toISOString() : item.resolvedAt,
              }
            : item,
        ),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "A apărut o eroare.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-5 text-[#202124]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Moderation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#202124]">Social Reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5f6368]">
            Rapoartele trimise din zona elevilor ajung aici, separate de support și tickets.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#70757a]">Total</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "..." : counters.total}</p>
          </div>
          <div className="rounded-2xl border border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#70757a]">Open</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "..." : counters.open}</p>
          </div>
          <div className="rounded-2xl border border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#70757a]">Reviewing</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "..." : counters.reviewing}</p>
          </div>
          <div className="rounded-2xl border border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#70757a]">Resolved</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "..." : counters.resolved}</p>
          </div>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-[#fce8e6] px-4 py-3 text-sm text-[#c5221f]">{error}</div>}

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e0e2e7] bg-white p-3">
        <div className="flex h-10 flex-1 min-w-[220px] items-center rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] px-3">
          <svg className="h-4 w-4 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search report, account ID, name or reason"
            className="ml-2 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-xl border border-[#e0e2e7] bg-white px-3 text-sm outline-none"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl border border-[#e0e2e7] bg-white">
          <div className="border-b border-[#e0e2e7] px-4 py-3">
            <h2 className="font-semibold text-[#202124]">Reports queue</h2>
          </div>
          <div className="max-h-[72vh] divide-y divide-[#eceff1] overflow-auto">
            {loading ? (
              <div className="px-4 py-8 text-sm text-[#5f6368]">Loading reports...</div>
            ) : filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-sm text-[#5f6368]">No reports found.</div>
            ) : (
              filteredItems.map((item) => {
                const active = item.id === selectedReport?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedReportId(item.id)}
                    className={`block w-full border-l-4 px-4 py-4 text-left transition ${active ? "border-l-[#1a73e8] bg-[#f8faff]" : "border-l-transparent hover:bg-[#f8f9fa]"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#202124]">{item.reason}</p>
                        <p className="mt-1 text-xs text-[#5f6368]">
                          {item.reporter?.public_id || "Unknown"} → {item.reported?.public_id || "Unknown"} • {item.publicId}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#5f6368]">{item.details || "No extra details provided."}</p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e0e2e7] bg-white">
          <div className="border-b border-[#e0e2e7] px-4 py-3">
            <h2 className="font-semibold text-[#202124]">Report details</h2>
          </div>
          {!selectedReport ? (
            <div className="px-4 py-8 text-sm text-[#5f6368]">Select a report to inspect it.</div>
          ) : (
            <div className="space-y-4 px-4 py-4">
              <div className="rounded-2xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#70757a]">Report ID</p>
                    <p className="mt-1 font-semibold text-[#202124]">{selectedReport.publicId}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusBadge(selectedReport.status)}`}>
                    {selectedReport.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-[#3c4043]">{selectedReport.reason}</p>
                <p className="mt-2 text-xs text-[#5f6368]">Created {formatDate(selectedReport.createdAt)} • Updated {formatDate(selectedReport.updatedAt)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e0e2e7] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#70757a]">Reporter</p>
                  <p className="mt-1 font-semibold text-[#202124]">{selectedReport.reporter?.full_name || "Unknown"}</p>
                  <p className="mt-1 text-xs text-[#5f6368]">{selectedReport.reporter?.public_id || "-"}</p>
                  <p className="mt-1 text-xs text-[#5f6368]">{selectedReport.reporter?.email || "-"}</p>
                </div>
                <div className="rounded-2xl border border-[#e0e2e7] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#70757a]">Reported</p>
                  <p className="mt-1 font-semibold text-[#202124]">{selectedReport.reported?.full_name || "Unknown"}</p>
                  <p className="mt-1 text-xs text-[#5f6368]">{selectedReport.reported?.public_id || "-"}</p>
                  <p className="mt-1 text-xs text-[#5f6368]">{selectedReport.reported?.email || "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e0e2e7] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#70757a]">Details</p>
                <p className="mt-2 text-sm leading-6 text-[#3c4043]">{selectedReport.details || "No extra details provided."}</p>
              </div>

              <div className="rounded-2xl border border-[#e0e2e7] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#70757a]">Admin notes</p>
                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-[#e0e2e7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a73e8]"
                  placeholder="Write moderation notes or resolution context"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void updateReport("reviewing")}
                  disabled={saving}
                  className="rounded-xl border border-[#e0e2e7] px-4 py-2 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark reviewing
                </button>
                <button
                  type="button"
                  onClick={() => void updateReport("resolved")}
                  disabled={saving}
                  className="rounded-xl bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1558b0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => void updateReport("dismissed")}
                  disabled={saving}
                  className="rounded-xl border border-[#e0e2e7] px-4 py-2 text-sm font-medium text-[#5f6368] transition hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}