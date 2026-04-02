"use client";

import { useAdminOverview } from "../useAdminOverview";

export default function AdminSettingsPage() {
  const { data, loading } = useAdminOverview();

  return (
    <main className="p-5">
      <h1 className="text-2xl font-semibold text-[#202124]">Settings</h1>
      <p className="mt-1 text-sm text-[#5f6368]">Configurări platformă și politici de administrare.</p>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
          <h2 className="text-base font-semibold text-[#202124]">Security</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#3c4043]">
            <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>Admin login via Supabase</span>
              <span className="text-[#188038]">Enabled</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>Session checks</span>
              <span className="text-[#188038]">Enabled</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>Audit records</span>
              <span>{loading ? "..." : data?.auditLogs.length ?? 0}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
          <h2 className="text-base font-semibold text-[#202124]">Operations</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#3c4043]">
            <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>Open tickets</span>
              <span>{loading ? "..." : data?.counters.open ?? 0}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>In progress</span>
              <span>{loading ? "..." : data?.counters.inProgress ?? 0}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>Critical queue</span>
              <span>{loading ? "..." : data?.counters.critical ?? 0}</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
