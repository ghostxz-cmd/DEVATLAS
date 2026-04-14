"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type NetworkData = {
  profile: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
  };
  summary: {
    totalColleagues: number;
    activeColleagues: number;
    totalCourses: number;
    totalActivity: number;
  };
  connections: Array<{
    id: string;
    name: string;
    role: string;
    expertise: string;
  }>;
  invitations: Array<{
    id: string;
    name: string;
    note: string;
  }>;
  colleagues: Array<{
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    status: string;
    title: string | null;
    expertise: string[];
    courseCount: number;
    activityCount: number;
    lastActivityAt: string | null;
    lastActivityType: string | null;
  }>;
  activityFeed: Array<{
    id: string;
    title: string;
    detail: string;
    createdAt: string;
  }>;
};

export default function InstructorFriendsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NetworkData | null>(null);
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");

  const loadNetwork = async (searchQuery?: string) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Nu există o sesiune activă de profesor.");
      }

      const response = await fetch(`/api/dashboard/instructor/network${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Nu am putut încărca conexiunile.");
      }

      const payload = (await response.json()) as NetworkData;
      setData(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca conexiunile.");
    } finally {
      setLoading(false);
    };
  };

  useEffect(() => {
    void loadNetwork();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Colaboratori", value: data?.summary.totalColleagues ?? 0 },
      { label: "Activi", value: data?.summary.activeColleagues ?? 0 },
      { label: "Cursuri", value: data?.summary.totalCourses ?? 0 },
      { label: "Activitate", value: data?.summary.totalActivity ?? 0 },
    ],
    [data],
  );

  const handleSearch = async () => {
    setQuery(draftQuery.trim());
    await loadNetwork(draftQuery.trim());
  };

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
  };

  if (error) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#030712] p-6 text-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <h1 className="text-2xl font-bold">Prieteni</h1>
        <p className="mt-2 text-sm text-gray-300">
          Nu am putut încărca conexiunile.
        </p>
        <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">
          {error}
        </div>
      </section>
    );
  }

  const network = data?.colleagues ?? [];
  const activity = data?.activityFeed ?? [];

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Prieteni</h1>
          <p className="mt-1 text-sm text-gray-300">Rețea reală de colegi, activitate și cursuri din platformă.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          {loading ? "syncing" : "active"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {stats.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">{card.label}</p>
            <div className="mt-2 text-[30px] font-bold leading-none">{card.value}</div>
            <p className="mt-1 text-xs text-gray-300">date reale din rețea</p>
          </article>
        ))}
      </div>

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.55fr]">
          <input
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Caută colegi după nume, email, expertiză sau status..."
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            className="h-11 rounded-2xl bg-cyan-400 px-4 text-sm font-bold text-black transition hover:bg-cyan-300"
          >
            Caută
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Colaboratori</h3>
          <span className="text-xs text-gray-300">{query ? `filtrat: ${query}` : `${network.length} persoane`}</span>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {loading ? (
            <div className="col-span-full text-center text-sm text-gray-300">Încărcare...</div>
          ) : network.length > 0 ? (
            network.map((person) => (
              <div key={person.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{person.fullName}</p>
                    <p className="text-xs text-gray-300">{person.email}</p>
                    <p className="mt-1 text-xs text-gray-400">{person.title || "Fără titlu"}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                    {person.status}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {person.expertise.slice(0, 4).map((skill) => (
                    <span key={skill} className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Cursuri: {person.courseCount}</div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2">Activitate: {person.activityCount}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`mailto:${person.email}`} className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20">
                    Trimite email
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyEmail(person.email)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                  >
                    Copiază email
                  </button>
                </div>

                <p className="mt-3 text-[11px] text-gray-400">
                  Ultima activitate: {person.lastActivityType || "-"} {person.lastActivityAt ? `• ${new Date(person.lastActivityAt).toLocaleDateString("ro-RO")}` : ""}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-sm text-gray-300">Nu au fost găsiți colegi pentru căutarea curentă.</div>
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Activitate recentă</h3>
          <span className="text-xs text-gray-300">{activity.length} evenimente</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activity.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs text-gray-300">{item.detail}</p>
              <p className="mt-2 text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleDateString("ro-RO")}</p>
            </div>
          ))}
          {!loading && activity.length === 0 && <p className="text-sm text-gray-300">Nu există activitate recentă în rețea.</p>}
        </div>
      </article>
    </section>
  );
}
