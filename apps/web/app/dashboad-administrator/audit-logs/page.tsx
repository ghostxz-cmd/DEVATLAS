"use client";

import { useEffect, useState } from "react";
import type { AdminAuditLog } from "../types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/audit-logs", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Nu am putut încărca audit logs.");
        }

        const payload = (await response.json()) as { items: AdminAuditLog[] };
        setLogs(payload.items ?? []);
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
  }, []);

  return (
    <main className="p-5">
      <h1 className="text-2xl font-semibold text-[#202124]">Audit Logs</h1>
      <p className="mt-1 text-sm text-[#5f6368]">Istoric acțiuni pentru managementul suportului.</p>

      {error && <div className="mt-4 rounded-lg bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">{error}</div>}

      <div className="mt-5 rounded-xl border border-[#e0e2e7]">
        <div className="grid grid-cols-[180px_190px_1fr_180px] border-b border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3 text-xs uppercase tracking-[0.08em] text-[#5f6368]">
          <div>Action</div>
          <div>Ticket</div>
          <div>Note</div>
          <div>Timestamp</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-[#5f6368]">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[#5f6368]">No logs found.</div>
        ) : (
          <div className="divide-y divide-[#eceff1]">
            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-[180px_190px_1fr_180px] px-4 py-3 text-sm text-[#3c4043] hover:bg-[#f8f9fa]">
                <div className="uppercase tracking-[0.08em] text-xs text-[#5f6368]">{log.action}</div>
                <div className="text-xs text-[#5f6368]">{log.ticketPublicId ?? log.ticketId ?? "-"}</div>
                <div className="truncate text-[#202124]">{log.note || log.ticketSubject || "No details"}</div>
                <div className="text-xs text-[#5f6368]">{formatDate(log.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
