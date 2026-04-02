"use client";

import { useAdminOverview } from "../useAdminOverview";

export default function AdminCoursesPage() {
  const { data, loading } = useAdminOverview();

  return (
    <main className="p-5">
      <h1 className="text-2xl font-semibold text-[#202124]">Courses Management</h1>
      <p className="mt-1 text-sm text-[#5f6368]">Control pe oferta educațională și operațiuni academice.</p>

      <div className="mt-5 rounded-xl border border-[#e0e2e7]">
        <div className="grid grid-cols-[1fr_180px_180px] border-b border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3 text-xs uppercase tracking-[0.08em] text-[#5f6368]">
          <div>Section</div>
          <div>Items</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-[#eceff1] text-sm">
          <div className="grid grid-cols-[1fr_180px_180px] px-4 py-3">
            <div>Learning Paths</div>
            <div>{loading ? "..." : 9}</div>
            <div className="text-[#188038]">Active</div>
          </div>
          <div className="grid grid-cols-[1fr_180px_180px] px-4 py-3">
            <div>Course Modules</div>
            <div>{loading ? "..." : 48}</div>
            <div className="text-[#188038]">Active</div>
          </div>
          <div className="grid grid-cols-[1fr_180px_180px] px-4 py-3">
            <div>Tickets related to courses</div>
            <div>{loading ? "..." : data?.counters.open ?? 0}</div>
            <div className="text-[#b06000]">Review</div>
          </div>
        </div>
      </div>
    </main>
  );
}
