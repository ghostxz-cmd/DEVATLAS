"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardOverview = {
  community: {
    friendsAvailable: boolean;
    friendsCount: number | null;
    note: string;
    notificationsCount: number;
    supportTicketsCount: number;
  };
  activityFeed: Array<{
    kind: string;
    title: string;
    detail: string;
    createdAt: string;
  }>;
  schemaWarnings: string[];
  recommendations: Array<{
    kind: string;
    title: string;
    description: string;
    reason: string;
  }>;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBadgeColor(kind: string) {
  switch (kind) {
    case "activity":
      return "bg-[#0ea5e9]";
    case "support":
      return "bg-[#f59e0b]";
    case "course":
      return "bg-[#2563eb]";
    default:
      return "bg-[#111827]";
  }
}

export default function StudentDashboardFriendsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard/student/overview", { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca pagina de prieteni.");
        }

        const payload = (await response.json()) as DashboardOverview;
        setData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca pagina de prieteni.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const socialCards = useMemo(
    () => [
      { label: "Prieteni disponibili", value: data?.community.friendsAvailable ? "DA" : "NU" },
      { label: "Număr prieteni", value: data?.community.friendsCount ?? "--" },
      { label: "Notificări", value: data?.community.notificationsCount ?? 0 },
      { label: "Tichete support", value: data?.community.supportTicketsCount ?? 0 },
    ],
    [data],
  );

  if (error) {
    return (
      <section className="space-y-4 text-[#111827]">
        <div className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <h1 className="text-2xl font-bold tracking-tight">Prieteni</h1>
          <p className="mt-2 text-sm text-[#64748b]">Nu am putut încărca zona socială.</p>
          <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Prieteni</h1>
          <p className="mt-1 text-sm text-[#64748b]">Zona socială a elevului, pregătită pentru prieteni, invitații și interacțiuni reale.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d5daea] bg-[#f8faff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">
          <span className={`h-2 w-2 rounded-full ${loading ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`} />
          {loading ? "syncing" : "active"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {socialCards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">{card.label}</p>
            <div className="mt-2 text-[30px] font-bold leading-none">{card.value}</div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_0.9fr]">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Statut comunitate</h3>
            <span className="text-xs text-[#64748b]">real</span>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Notă din schemă</p>
            <p className="mt-2 text-sm leading-7 text-[#334155]">{data?.community.note ?? "Zona socială este pregătită, dar nu există încă tabel de friends."}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["Prieteni disponibili", data?.community.friendsAvailable ? "DA" : "NU"],
              ["Invitații", "--"],
              ["Mesaje", "--"],
              ["Reacții", "--"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#64748b]">{label}</p>
                <p className="mt-1 text-lg font-semibold text-[#0f172a]">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Invitații și listă prieteni</h3>
            <span className="text-xs text-[#64748b]">pregătit</span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
              Nu există încă tabelul de friends în schema curentă, deci nu inventăm listă sau invitații.
            </div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Ce va intra aici</p>
              <ul className="mt-2 space-y-2 text-sm text-[#334155]">
                <li>• cereri trimise și primite</li>
                <li>• listă prieteni reali</li>
                <li>• status online / activitate recentă</li>
                <li>• recomandări sociale bazate pe cont</li>
              </ul>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Schema warnings</h3>
            <span className="text-xs text-[#64748b]">debug</span>
          </div>

          <div className="mt-4 space-y-2">
            {(data?.schemaWarnings ?? []).map((warning) => (
              <div key={warning} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3 text-sm text-[#334155]">
                {warning}
              </div>
            ))}
            {!data?.schemaWarnings?.length && (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Nicio atenționare în schema curentă.
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Activitate recentă relevantă</h3>
            <span className="text-xs text-[#64748b]">feed</span>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.activityFeed ?? []).slice(0, 6).map((item) => (
              <div key={`${item.kind}-${item.createdAt}-${item.title}`} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                  <span className="text-[11px] text-[#94a3b8]">{formatTime(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-[#64748b]">{item.detail}</p>
              </div>
            ))}

            {!data?.activityFeed?.length && (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Nu există activitate de afișat pentru comunitate.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Recomandări sociale</h3>
            <span className="text-xs text-[#64748b]">bazate pe cont</span>
          </div>

          <div className="mt-4 space-y-2">
            {(data?.recommendations ?? []).filter((item) => item.kind === "activity" || item.kind === "support").slice(0, 3).map((item) => (
              <div key={`${item.kind}-${item.title}`} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${getBadgeColor(item.kind)}`} />
                </div>
                <p className="mt-1 text-xs text-[#64748b]">{item.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#94a3b8]">{item.reason}</p>
              </div>
            ))}

            {!data?.recommendations?.length && (
              <div className="rounded-2xl border border-dashed border-[#d5daea] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                Nu există recomandări sociale calculate încă.
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
