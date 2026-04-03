"use client";

import { useEffect, useMemo, useState } from "react";

type SupportCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin" | "system";
  sender_user_id: string | null;
  sender_email: string | null;
  message: string;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SupportEvent = {
  id: string;
  ticket_id: string;
  event_type: string;
  actor_user_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SupportTicketDetail = {
  id: string;
  public_id: string;
  requester_email: string;
  requester_name: string | null;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  source: string;
  created_at: string;
  last_message_at: string;
  category_id: string | null;
  category: SupportCategory | null;
  messages: SupportMessage[];
  events: SupportEvent[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: SupportTicketDetail["status"]) {
  switch (status) {
    case "open":
      return "Deschis";
    case "in_progress":
      return "În lucru";
    case "waiting_user":
      return "Așteaptă răspuns";
    case "resolved":
      return "Rezolvat";
    case "closed":
      return "Închis";
  }
}

function getStatusTone(status: SupportTicketDetail["status"]) {
  switch (status) {
    case "open":
      return "bg-[#e8f0fe] text-[#1a73e8] border-[#c6dafc]";
    case "in_progress":
      return "bg-[#e6f4ea] text-[#137333] border-[#c7e8cd]";
    case "waiting_user":
      return "bg-[#fef7e0] text-[#b06000] border-[#f7de9d]";
    case "resolved":
      return "bg-[#eef4ff] text-[#4c6fbf] border-[#cdddfc]";
    case "closed":
      return "bg-[#fce8e6] text-[#c5221f] border-[#f4c7c3]";
  }
}

function getPriorityTone(priority: SupportTicketDetail["priority"]) {
  switch (priority) {
    case "low":
      return "bg-[#eef4ff] text-[#4c6fbf] border-[#cdddfc]";
    case "normal":
      return "bg-[#e8f0fe] text-[#1a73e8] border-[#c6dafc]";
    case "high":
      return "bg-[#fef7e0] text-[#b06000] border-[#f7de9d]";
    case "critical":
      return "bg-[#fce8e6] text-[#c5221f] border-[#f4c7c3]";
  }
}

export default function PublicSupportTicketPage({ params }: { params: { ticketId: string } }) {
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ticketApiUrl = useMemo(() => `/api/support/tickets/${params.ticketId}`, [params.ticketId]);

  useEffect(() => {
    const loadTicket = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(ticketApiUrl);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca ticketul.");
        }

        const payload = (await response.json()) as SupportTicketDetail;
        setTicket(payload);
      } catch (loadError) {
        setTicket(null);
        setError(loadError instanceof Error ? loadError.message : "A apărut o eroare.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadTicket();
  }, [ticketApiUrl]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_32%),linear-gradient(180deg,_#050816_0%,_#02050c_100%)] px-4 py-16 sm:py-20">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">DevAtlas Support</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Detaliile ticketului tău, într-un singur loc.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Aici vezi starea curentă, subiectul și istoricul principal al solicitării tale.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Ticket ID</div>
              <div className="mt-2 break-all text-sm font-medium text-white">{params.ticketId}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Actualizat</div>
              <div className="mt-2 text-sm font-medium text-white">{ticket ? formatDate(ticket.last_message_at) : "-"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.5fr_0.85fr]">
          <div className="space-y-6">
            {isLoading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-slate-300">
                Se încarcă ticketul...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-[#f4c7c3] bg-[#2a1311] p-8 text-sm text-[#f9dedc]">
                {error}
              </div>
            ) : ticket ? (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_24px_120px_rgba(0,0,0,0.35)] backdrop-blur">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Subiect</p>
                      <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{ticket.subject}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getPriorityTone(ticket.priority)}`}>
                        Priority: {ticket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Nume</div>
                      <div className="mt-2 text-sm font-medium text-white">{ticket.requester_name || "Nedefinit"}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Email</div>
                      <div className="mt-2 break-all text-sm font-medium text-white">{ticket.requester_email}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Categorie</div>
                      <div className="mt-2 text-sm font-medium text-white">{ticket.category?.name || "General"}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Creat</div>
                      <div className="mt-2 text-sm font-medium text-white">{formatDate(ticket.created_at)}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Istoric</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Mesaje și actualizări</h3>
                    </div>
                    <div className="text-sm text-slate-400">{ticket.messages.length} mesaje</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {ticket.messages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-300">
                        Încă nu există mesaje în acest ticket.
                      </div>
                    ) : (
                      ticket.messages.map((entry) => (
                        <article key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                            <span>{entry.sender_type}</span>
                            <span>{formatDate(entry.created_at)}</span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">{entry.message}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Ce urmează</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Echipa de suport lucrează la ticket.</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Când starea se schimbă sau apare un răspuns, vei primi automat email. Poți reveni oricând aici
                folosind același link din confirmare.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Sfat</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Dacă ai o urgență, răspunde direct la emailul de confirmare. Ticketul tău rămâne legat de acest ID.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}