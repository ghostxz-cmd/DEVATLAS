"use client";

import Link from "next/link";
import { useAdminOverview } from "./useAdminOverview";

function metricCard(label: string, value: number | string) {
  return (
    <div className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[#70757a]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#202124]">{value}</p>
    </div>
  );
}

export default function AdministratorDashboardPage() {
  const { data, loading, error } = useAdminOverview();

  return (
    <main className="p-5">
      <h1 className="text-2xl font-semibold text-[#202124]">Management Overview</h1>
      <p className="mt-1 text-sm text-[#5f6368]">Control complet pe suport, utilizatori și activitate operațională.</p>

      {error && <div className="mt-4 rounded-lg bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">{error}</div>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCard("People", loading ? "..." : data?.counters.people ?? 0)}
        {metricCard("Tickets", loading ? "..." : data?.counters.totalTickets ?? 0)}
        {metricCard("Open", loading ? "..." : data?.counters.open ?? 0)}
        {metricCard("In Progress", loading ? "..." : data?.counters.inProgress ?? 0)}
        {metricCard("Waiting", loading ? "..." : data?.counters.waitingUser ?? 0)}
        {metricCard("Critical", loading ? "..." : data?.counters.critical ?? 0)}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-xl border border-[#e0e2e7]">
          <div className="flex items-center justify-between border-b border-[#e0e2e7] px-4 py-3">
            <h2 className="font-semibold text-[#202124]">Recent Tickets</h2>
            <Link href="/dashboad-administrator/support" className="text-sm text-[#1a73e8]">
              Open Support
            </Link>
          </div>
          <div className="divide-y divide-[#eceff1]">
            {(data?.recentTickets ?? []).slice(0, 12).map((ticket) => (
              <div key={ticket.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#202124]">{ticket.subject}</p>
                  <p className="truncate text-xs text-[#5f6368]">{ticket.requester} • {ticket.publicId}</p>
                </div>
                <div className="text-right text-xs text-[#5f6368]">{ticket.status.replace("_", " ")}</div>
              </div>
            ))}
            {!loading && (data?.recentTickets?.length ?? 0) === 0 && (
              <div className="px-4 py-6 text-sm text-[#5f6368]">No tickets available.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#e0e2e7]">
          <div className="border-b border-[#e0e2e7] px-4 py-3">
            <h2 className="font-semibold text-[#202124]">Audit Snapshot</h2>
          </div>
          <div className="space-y-2 px-4 py-3">
            {(data?.auditLogs ?? []).slice(0, 10).map((log) => (
              <div key={log.id} className="rounded-lg border border-[#e0e2e7] bg-[#f8f9fa] px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#5f6368]">{log.action}</p>
                <p className="mt-1 text-xs text-[#5f6368]">{log.note || "No note"}</p>
              </div>
            ))}
            <Link
              href="/dashboad-administrator/audit-logs"
              className="inline-flex h-9 items-center rounded-lg bg-[#1a73e8] px-3 text-sm font-medium text-white"
            >
              View all logs
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
