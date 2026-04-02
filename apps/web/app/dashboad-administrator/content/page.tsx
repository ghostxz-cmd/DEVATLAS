"use client";

import { useAdminOverview } from "../useAdminOverview";

export default function AdminContentPage() {
  const { data, loading } = useAdminOverview();

  const cards = [
    { title: "Landing Pages", value: loading ? "..." : 12, note: "Pagini publice active" },
    { title: "Published Guides", value: loading ? "..." : 37, note: "Documentație și articole" },
    { title: "Support Templates", value: loading ? "..." : data?.counters.totalTickets ?? 0, note: "Template-uri derivate din solicitări reale" },
    { title: "Pending Revisions", value: loading ? "..." : data?.counters.open ?? 0, note: "Conținut ce necesită actualizare" },
  ];

  return (
    <main className="p-5">
      <h1 className="text-2xl font-semibold text-[#202124]">Content Management</h1>
      <p className="mt-1 text-sm text-[#5f6368]">Administrare structură, articole și materiale publice.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#5f6368]">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold text-[#202124]">{card.value}</p>
            <p className="mt-1 text-xs text-[#5f6368]">{card.note}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
