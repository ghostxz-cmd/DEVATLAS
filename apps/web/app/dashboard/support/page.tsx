"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SupportCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type SupportTicket = {
  id: string;
  public_id: string;
  requester_email: string;
  requester_name: string | null;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  created_at: string;
  last_message_at: string;
  category: SupportCategory | null;
};

type TicketsResponse = {
  items: SupportTicket[];
  total: number;
};

const statusOptions = ["", "open", "in_progress", "waiting_user", "resolved", "closed"];
const priorityOptions = ["", "low", "normal", "high", "critical"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SupportDashboardPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadTickets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        if (priority) params.set("priority", priority);
        if (category) params.set("category", category);

        const response = await fetch(`/api/support/tickets?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Nu am putut încărca ticketurile.");
        }

        const data = (await response.json()) as TicketsResponse;
        setTickets(data.items ?? []);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "A apărut o eroare.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadTickets();

    return () => controller.abort();
  }, [search, status, priority, category]);

  const stats = useMemo(() => {
    return {
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      waitingUser: tickets.filter((ticket) => ticket.status === "waiting_user").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    };
  }, [tickets]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Support dashboard</p>
            <h1 className="mt-4 text-4xl font-black sm:text-6xl">Ticket inbox</h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-300">
              Aici vezi requesturile, statusurile și poți intra direct pe fiecare ticket.
            </p>
          </div>
          <Link href="/dashboard" className="text-cyan-300 underline underline-offset-4">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-gray-400">Open</div>
            <div className="mt-2 text-3xl font-bold">{stats.open}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-gray-400">In progress</div>
            <div className="mt-2 text-3xl font-bold">{stats.inProgress}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-gray-400">Waiting user</div>
            <div className="mt-2 text-3xl font-bold">{stats.waitingUser}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-gray-400">Resolved</div>
            <div className="mt-2 text-3xl font-bold">{stats.resolved}</div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket, email, subject"
            className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option || "all-status"} value={option}>
                {option || "All statuses"}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none"
          >
            {priorityOptions.map((option) => (
              <option key={option || "all-priority"} value={option}>
                {option || "All priorities"}
              </option>
            ))}
          </select>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Category slug"
            className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none"
          />
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-red-100">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-gray-300">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-gray-300">
              No tickets found.
            </div>
          ) : (
            tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/support/${ticket.public_id}`}
                className="block rounded-3xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-cyan-300">{ticket.public_id}</div>
                    <h2 className="mt-2 text-2xl font-bold">{ticket.subject}</h2>
                    <p className="mt-2 text-gray-300">
                      {ticket.requester_name || ticket.requester_email} • {ticket.category?.name || "No category"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border border-white/10 px-3 py-1 capitalize">
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 capitalize">
                      {ticket.priority}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Created {formatDate(ticket.created_at)} • Last update {formatDate(ticket.last_message_at)}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
