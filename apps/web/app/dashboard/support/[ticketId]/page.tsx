"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
  category: SupportCategory | null;
  messages: SupportMessage[];
  events: SupportEvent[];
};

const statusOptions = ["open", "in_progress", "waiting_user", "resolved", "closed"] as const;
const priorityOptions = ["low", "normal", "high", "critical"] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SupportTicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<SupportTicketDetail["status"]>("waiting_user");
  const [priority, setPriority] = useState<SupportTicketDetail["priority"]>("normal");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadTicket = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      if (!response.ok) {
        throw new Error("Nu am putut încărca ticketul.");
      }

      const data = (await response.json()) as SupportTicketDetail;
      setTicket(data);
      setStatus(data.status);
      setPriority(data.priority);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "A apărut o eroare.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: reply,
          status,
          priority,
          responderName: "DevAtlas Support",
        }),
      });

      if (!response.ok) {
        throw new Error("Nu am putut salva răspunsul.");
      }

      setReply("");
      setSuccessMessage("Răspuns trimis și emailul a fost pornit.");
      await loadTicket();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "A apărut o eroare.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Support ticket</p>
            <h1 className="mt-4 text-4xl font-black sm:text-6xl">{ticket?.public_id ?? ticketId}</h1>
          </div>
          <Link href="/dashboard/support" className="text-cyan-300 underline underline-offset-4">
            Back to list
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-gray-300">
            Loading ticket...
          </div>
        ) : error ? (
          <div className="mt-10 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">
            {error}
          </div>
        ) : ticket ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full border border-white/10 px-3 py-1 capitalize">
                    {ticket.status.replace("_", " ")}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 capitalize">
                    {ticket.priority}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {ticket.category?.name ?? "No category"}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-bold">{ticket.subject}</h2>
                <p className="mt-3 text-gray-300">
                  {ticket.requester_name || ticket.requester_email} • {ticket.source}
                </p>
                <p className="mt-6 whitespace-pre-wrap leading-7 text-gray-200">{ticket.description}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-2xl font-bold">Conversation</h3>
                <div className="mt-6 space-y-4">
                  {ticket.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-2xl border p-4 ${
                        message.sender_type === "admin"
                          ? "border-cyan-400/30 bg-cyan-500/10"
                          : "border-white/10 bg-black/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-sm text-gray-400">
                        <span className="capitalize">{message.sender_type}</span>
                        <span>{formatDate(message.created_at)}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-100">{message.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-2xl font-bold">Reply & update</h3>
                <div className="mt-5 space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm text-gray-300">Status</span>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as SupportTicketDetail["status"])}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none"
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-gray-300">Priority</span>
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value as SupportTicketDetail["priority"])}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none"
                    >
                      {priorityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm text-gray-300">Reply message</span>
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      className="min-h-44 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none"
                      placeholder="Scrie răspunsul pentru user..."
                    />
                  </label>

                  {successMessage && (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">
                      {successMessage}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={() => void handleSave()}
                    disabled={isSaving || reply.trim().length < 2}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 font-bold text-black transition-all hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Sending..." : "Save & send reply"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-2xl font-bold">Timeline</h3>
                <div className="mt-5 space-y-4">
                  {ticket.events.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center justify-between gap-4 text-sm text-gray-400">
                        <span className="capitalize">{event.event_type.replace(/_/g, " ")}</span>
                        <span>{formatDate(event.created_at)}</span>
                      </div>
                      {event.note && <p className="mt-2 text-gray-200">{event.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
