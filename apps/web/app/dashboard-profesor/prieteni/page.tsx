"use client";

import { useEffect, useState } from "react";

type NetworkData = {
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
};

export default function InstructorFriendsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NetworkData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // For now, mock data - in a real app, fetch from API
        // const response = await fetch("/api/dashboard/instructor/network", { cache: "no-store" });
        // if (!response.ok) throw new Error("Nu am putut încărca conexiunile.");
        // const payload = await response.json();
        // setData(payload);

        // Mock data for now
        setData({
          connections: [
            { id: "1", name: "Alex Popescu", role: "Instructor", expertise: "Frontend" },
            { id: "2", name: "Radu Mihai", role: "Instructor", expertise: "Backend" },
            { id: "3", name: "Elena Ionescu", role: "Mentor", expertise: "Data" },
          ],
          invitations: [
            { id: "1", name: "Andrei Dumitru", note: "Invitație trimisă" },
            { id: "2", name: "Bianca Matei", note: "Așteaptă confirmare" },
          ],
        });
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nu am putut încărca conexiunile."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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

  const network = data?.connections ?? [];
  const invites = data?.invitations ?? [];

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Prieteni</h1>
          <p className="mt-1 text-sm text-gray-300">Conexiuni profesionale, colaborări și mentori în comunitate.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          network
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Conexiuni active</h3>
            <span className="text-xs text-gray-300">{network.length} persoane</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-center text-sm text-gray-300">Încărcare...</div>
            ) : network.length > 0 ? (
              network.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{person.name}</p>
                    <p className="text-xs text-gray-300">{person.role}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                    {person.expertise}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-gray-300">
                Nu au fost găsite conexiuni
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Invitații</h3>
            <span className="text-xs text-gray-300">în desfășurare</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-center text-sm text-gray-300">Încărcare...</div>
            ) : invites.length > 0 ? (
              invites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="text-sm font-semibold text-white">{invite.name}</p>
                  <p className="mt-1 text-xs text-gray-300">{invite.note}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-gray-300">
                Nu au fost găsite invitații
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
